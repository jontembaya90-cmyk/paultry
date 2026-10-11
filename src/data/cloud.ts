import type { DocumentReference, Firestore as Db } from '@react-native-firebase/firestore';

import { isFromNewerApp, migrateFarm, migrateRecord, needsMigration } from './migrations';
import { persist } from './persist';
import { COLLECTIONS, FARM_FIELDS, SCHEMA_VERSION, SHARED_SETTINGS, type CollectionName } from './schema';
import { applyRemote, clearLocalFarm, ensureToday, getFarm, onLocalChange, setSyncStatus } from './store';
import type { FarmState } from './types';

/**
 * Mirrors the on-device farm to Firestore (layout in schema.ts).
 *
 * The local store stays the source the UI reads, so every screen is instant and works
 * offline. Each local change is diffed against the previous state and only the records
 * that changed are written. Firestore's own offline cache queues those writes until
 * there's signal. Changes from other phones arrive through snapshot listeners.
 *
 * Records are written with merge, deleting only the fields this phone removed, so two
 * phones editing different fields of one record (one ticking a task done while the other
 * reassigns it) both keep their change.
 */

type Firestore = typeof import('@react-native-firebase/firestore');
type Doc = Record<string, unknown>;
type CloudUser = { uid: string; name: string | null; email: string | null };

let fs: Firestore | undefined;
try {
  // Lazy: throws at import when this binary was built without the Firestore module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  fs = require('@react-native-firebase/firestore') as Firestore;
} catch {
  fs = undefined;
}

/** Which account the farm on this phone belongs to. Stops one account's farm leaking into another. */
const OWNER_KEY = 'roost.cloud.uid';

type Mode =
  /** Waiting for Firestore to say whether this account already has a farm. */
  | 'resolving'
  /** No cloud farm yet and nothing local to upload: waiting for onboarding. */
  | 'awaitingFarm'
  /** Two-way sync. */
  | 'live'
  /** Browsing the sample farm: never uploaded. */
  | 'sample'
  /** The cloud farm was written by a newer version of ROOST: read it, never overwrite it. */
  | 'readOnly';

type Session = {
  user: CloudUser;
  db: Db;
  farmId: string;
  mode: Mode;
  listeners: (() => void)[];
  stopLocal: () => void;
};

let session: Session | null = null;
let pending = 0;
/** Bumped on every start and stop, so a slow start can tell it was superseded. */
let generation = 0;

const farmRef = (s: Session) => fs!.doc(s.db, 'farms', s.farmId);
const recordRef = (s: Session, name: CollectionName, id: string) => fs!.doc(s.db, 'farms', s.farmId, name, id);

/** Firestore rejects `undefined`; JSON drops it. Records are plain JSON already. */
const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/* ───────────────────────────── Writing ───────────────────────────── */

type Write =
  | { kind: 'set'; ref: DocumentReference; data: Doc; merge?: boolean; mergeFields?: string[] }
  | { kind: 'delete'; ref: DocumentReference };

/** Commit writes in batches (Firestore allows 500 per batch) and track them for the sync pill. */
function commit(s: Session, writes: Write[]) {
  if (!fs || writes.length === 0) return;
  for (let i = 0; i < writes.length; i += 450) {
    const chunk = writes.slice(i, i + 450);
    const batch = fs.writeBatch(s.db);
    for (const w of chunk) {
      if (w.kind === 'delete') batch.delete(w.ref);
      else if (w.mergeFields) batch.set(w.ref, w.data, { mergeFields: w.mergeFields });
      else if (w.merge) batch.set(w.ref, w.data, { merge: true });
      else batch.set(w.ref, w.data);
    }
    pending += chunk.length;
    reportStatus();
    // Resolves once the server has the batch: possibly much later, when signal returns.
    batch.commit().then(
      () => {
        pending = Math.max(0, pending - chunk.length);
        reportStatus(new Date().toISOString());
      },
      (e: unknown) => {
        pending = Math.max(0, pending - chunk.length);
        reportStatus();
        console.error('Cloud sync write failed', e);
      },
    );
  }
}

function reportStatus(lastSyncedAt?: string) {
  setSyncStatus(pending, pending > 0 && !getFarm().settings.offline, lastSyncedAt);
}

/** The writes that turn `prev` into `next`: changed records, removed records and farm fields. */
function diff(s: Session, prev: FarmState, next: FarmState, full = false): Write[] {
  const writes: Write[] = [];
  for (const name of COLLECTIONS) {
    const before = full ? [] : (prev[name] as { id: string }[]);
    const after = next[name] as { id: string }[];
    if (!full && before === after) continue;
    const old = new Map(before.map((r) => [r.id, r]));
    for (const r of after) {
      const was = old.get(r.id);
      old.delete(r.id);
      if (was === r) continue;
      const data: Doc = clean(r);
      // Fields this phone cleared (a task marked not done) must be removed in the cloud too.
      if (was) for (const k of Object.keys(was)) if (!(k in data)) data[k] = fs!.deleteField();
      writes.push({ kind: 'set', ref: recordRef(s, name, r.id), data, merge: true });
    }
    for (const id of old.keys()) writes.push({ kind: 'delete', ref: recordRef(s, name, id) });
  }

  const fields = FARM_FIELDS.filter((k) => full || prev[k] !== next[k]);
  const settings = SHARED_SETTINGS.filter((k) => full || prev.settings[k] !== next.settings[k]);
  if (fields.length || settings.length) {
    const data: Doc = { updatedAt: fs!.serverTimestamp(), settings: {} };
    for (const k of fields) data[k] = clean(next[k]);
    for (const k of settings) (data.settings as Doc)[k] = next.settings[k];
    writes.push({
      kind: 'set',
      ref: farmRef(s),
      data,
      // mergeFields replaces whole maps (biosecurity, dismissed alerts) instead of deep-merging them.
      mergeFields: ['updatedAt', ...fields, ...settings.map((k) => `settings.${k}`)],
    });
  }
  return writes;
}

/** First upload of a farm: the farm document, every record, and the account's pointer to it. */
function uploadFarm(s: Session, state: FarmState) {
  const now = fs!.serverTimestamp();
  const shared: Doc = {};
  for (const k of SHARED_SETTINGS) shared[k] = state.settings[k];
  const farm: Doc = { ownerId: s.user.uid, memberIds: [s.user.uid], schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now, settings: shared };
  for (const k of FARM_FIELDS) farm[k] = clean(state[k]);
  const writes: Write[] = [
    // Farm document first, so the security rules see the farm when its records arrive.
    { kind: 'set', ref: farmRef(s), data: farm },
    { kind: 'set', ref: fs!.doc(s.db, 'users', s.user.uid), data: clean({ farmId: s.farmId, name: s.user.name, email: s.user.email, updatedAt: now }) },
    ...diff(s, state, state, true).filter((w) => w.ref.path !== farmRef(s).path),
  ];
  commit(s, writes);
}

/* ───────────────────────────── Reading ───────────────────────────── */

/** Replace a local list with the cloud's, keeping local order so nothing jumps on screen. */
function mergeList<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map(remote.map((r) => [r.id, r]));
  const kept = local.filter((r) => byId.has(r.id)).map((r) => byId.get(r.id)!);
  const seen = new Set(kept.map((r) => r.id));
  return [...kept, ...remote.filter((r) => !seen.has(r.id))];
}

function listen(s: Session) {
  const opts = { includeMetadataChanges: true };
  let version: number | undefined;
  let tasksLoaded = false;
  let migrating = false;

  s.listeners.push(
    fs!.onSnapshot(farmRef(s), opts, (snap) => {
      if (snap.metadata.hasPendingWrites) return; // Our own echo: the local store already has it.
      if (!snap.exists()) {
        // A cached "missing" may just mean this phone hasn't heard from the server yet.
        if (!snap.metadata.fromCache && s.mode === 'resolving') resolveMissing(s);
        return;
      }
      const data = snap.data() as Doc;
      version = data.schemaVersion as number | undefined;
      if (isFromNewerApp(version)) {
        s.mode = 'readOnly';
        console.warn('This farm was saved by a newer version of ROOST. Update the app to keep editing.');
      } else {
        if (needsMigration(version) && !migrating) {
          migrating = true;
          void migrate(s, version);
        }
        // Includes a farm another phone just created while this one waited for onboarding.
        if (s.mode === 'resolving' || s.mode === 'awaitingFarm') s.mode = 'live';
      }
      persist.set(OWNER_KEY, s.user.uid);
      const farm = migrateFarm(data, version);
      applyRemote((st) => {
        const next: Doc = { ...st, isSample: false };
        for (const k of FARM_FIELDS) if (farm[k] !== undefined) next[k] = farm[k];
        next.settings = { ...st.settings, ...(farm.settings as Partial<FarmState['settings']>) };
        return next as unknown as FarmState;
      });
    }, (e) => console.error('Cloud sync: farm listener failed', e)),
  );

  for (const name of COLLECTIONS) {
    s.listeners.push(
      fs!.onSnapshot(fs!.collection(s.db, 'farms', s.farmId, name), opts, (snap) => {
        if (snap.metadata.hasPendingWrites || (snap.empty && snap.metadata.fromCache)) return;
        const remote = snap.docs
          .map((d) => migrateRecord(name, d.data() as Doc, version))
          .filter((r): r is Doc => r !== null) as unknown as { id: string }[];
        applyRemote((st) => ({ ...st, [name]: mergeList(st[name] as { id: string }[], remote) }));
        if (name === 'tasks' && !snap.metadata.fromCache && !tasksLoaded) {
          tasksLoaded = true;
          // Only now is it safe to build today's list without overwriting another phone's.
          ensureToday();
        }
      }, (e) => console.error(`Cloud sync: ${name} listener failed`, e)),
    );
  }
}

/** The server confirmed this account has no farm yet. */
function resolveMissing(s: Session) {
  const local = getFarm();
  const owner = persist.get(OWNER_KEY);
  // Only upload a farm made on this phone by this account, or before sign-in existed.
  if (local.onboarded && !local.isSample && (!owner || owner === s.user.uid)) {
    persist.set(OWNER_KEY, s.user.uid);
    uploadFarm(s, local);
    s.mode = 'live';
  } else {
    s.mode = 'awaitingFarm';
  }
}

/** Upgrade an older farm in place: every record, then the version number. */
async function migrate(s: Session, from: number | undefined) {
  const writes: Write[] = [];
  for (const name of COLLECTIONS) {
    const snap = await fs!.getDocs(fs!.collection(s.db, 'farms', s.farmId, name));
    for (const d of snap.docs) {
      const next = migrateRecord(name, d.data() as Doc, from);
      writes.push(next ? { kind: 'set', ref: d.ref, data: clean(next) } : { kind: 'delete', ref: d.ref });
    }
  }
  const farm = (await fs!.getDoc(farmRef(s))).data() as Doc;
  writes.push({ kind: 'set', ref: farmRef(s), data: { ...clean(migrateFarm(farm, from)), schemaVersion: SCHEMA_VERSION, updatedAt: fs!.serverTimestamp() }, merge: true });
  commit(s, writes);
}

/* ───────────────────────────── Session ───────────────────────────── */

function onChange(s: Session, prev: FarmState, next: FarmState) {
  if (prev.settings.offline !== next.settings.offline) {
    void (next.settings.offline ? fs!.disableNetwork(s.db) : fs!.enableNetwork(s.db));
    reportStatus();
  }
  // Entering the sample farm: stop syncing. Leaving it: pick the cloud farm back up.
  if (next.isSample && s.mode !== 'sample') {
    stopListening(s);
    s.mode = 'sample';
    return;
  }
  if (!next.isSample && s.mode === 'sample') {
    s.mode = 'resolving';
    listen(s);
    return;
  }
  if (s.mode === 'awaitingFarm' && next.onboarded) {
    persist.set(OWNER_KEY, s.user.uid);
    uploadFarm(s, next);
    s.mode = 'live';
    return;
  }
  if (s.mode === 'live') commit(s, diff(s, prev, next));
}

function stopListening(s: Session) {
  for (const off of s.listeners) off();
  s.listeners = [];
}

/** Start syncing for a signed-in account. Safe to call again for the same account. */
export async function startCloudSync(user: CloudUser) {
  if (!fs || session?.user.uid === user.uid) return;
  stopCloudSync();
  const gen = generation;
  const owner = persist.get(OWNER_KEY);
  // A farm left by another account never mixes into this one.
  if (owner && owner !== user.uid) {
    clearLocalFarm();
    persist.set(OWNER_KEY, '');
  }
  const db = fs.getFirestore();
  const local = getFarm();
  if (local.settings.offline) void fs.disableNetwork(db);

  let farmId = user.uid;
  try {
    const pointer = await fs.getDoc(fs.doc(db, 'users', user.uid));
    farmId = (pointer.data()?.farmId as string | undefined) ?? user.uid;
  } catch {
    // Offline with nothing cached: the owner's farm id is their uid.
  }
  if (gen !== generation) return; // Signed out, or another start began, while we waited.

  const s: Session = { user, db, farmId, mode: local.isSample ? 'sample' : 'resolving', listeners: [], stopLocal: () => {} };
  s.stopLocal = onLocalChange((prev, next) => onChange(s, prev, next));
  session = s;
  if (s.mode !== 'sample') listen(s);
}

export function stopCloudSync() {
  generation++;
  if (!session) return;
  stopListening(session);
  session.stopLocal();
  session = null;
  pending = 0;
}

/** Changes not yet on the server. Signing out now would lose them. */
export function unsyncedChanges() {
  return pending;
}

/** Stop syncing and remove this account's farm from the phone before signing out. */
export function leaveCloud() {
  stopCloudSync();
  clearLocalFarm();
  persist.set(OWNER_KEY, '');
}
