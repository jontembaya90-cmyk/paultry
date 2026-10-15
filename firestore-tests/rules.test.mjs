// Security rules tests for firestore.rules. Run from this folder with `npm test`
// (needs Java for the Firestore emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteField, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';

const OWNER = 'alice';
const WORKER = 'bob';
const STRANGER = 'eve';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-roost',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

const farmDoc = (overrides = {}) => ({
  ownerId: OWNER,
  memberIds: [OWNER],
  schemaVersion: 1,
  farmName: 'Sunrise Poultry Farm',
  farmTypes: ['layers'],
  onboarded: true,
  biosecurity: {},
  dismissedAlerts: {},
  coopClosed: [],
  settings: { currency: 'KES', weightUnit: 'kg', tempUnit: 'C' },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const egg = { id: 'egg_1', flockId: 'flock_1', day: '2026-10-11', at: '2026-10-11T06:00:00Z', by: 'me', large: 300, medium: 120, small: 20, cracked: 4, dirty: 2 };

/** Seed a farm, bypassing rules. `members` are added to memberIds. */
async function seed(members = []) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await setDoc(doc(d, 'farms', OWNER), farmDoc({ memberIds: [OWNER, ...members] }));
    await setDoc(doc(d, 'farms', OWNER, 'eggs', egg.id), egg);
  });
}

describe('first sign-in', () => {
  test('owner can learn their farm does not exist yet', async () => {
    await assertSucceeds(getDoc(doc(db(OWNER), 'farms', OWNER)));
  });

  test('owner uploads farm, account pointer and records in one batch, as the app does', async () => {
    const d = db(OWNER);
    const b = writeBatch(d);
    b.set(doc(d, 'farms', OWNER), farmDoc());
    b.set(doc(d, 'users', OWNER), { farmId: OWNER, name: 'Alice', email: 'alice@example.com', updatedAt: serverTimestamp() });
    b.set(doc(d, 'farms', OWNER, 'eggs', egg.id), egg, { merge: true });
    await assertSucceeds(b.commit());
  });

  test('cannot create a farm under someone else’s id', async () => {
    await assertFails(setDoc(doc(db(STRANGER), 'farms', OWNER), farmDoc({ ownerId: STRANGER, memberIds: [STRANGER] })));
  });

  test('cannot create a farm naming someone else as owner', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'farms', OWNER), farmDoc({ ownerId: STRANGER })));
  });

  test('cannot create a farm with extra members already on it', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'farms', OWNER), farmDoc({ memberIds: [OWNER, STRANGER] })));
  });

  test('signed-out users are refused', async () => {
    await assertFails(getDoc(doc(db(null), 'farms', OWNER)));
    await assertFails(setDoc(doc(db(null), 'farms', OWNER), farmDoc()));
  });
});

describe('owner', () => {
  beforeEach(() => seed());

  test('reads the farm and its records', async () => {
    await assertSucceeds(getDoc(doc(db(OWNER), 'farms', OWNER)));
    await assertSucceeds(getDoc(doc(db(OWNER), 'farms', OWNER, 'eggs', egg.id)));
  });

  test('lists a whole record collection, as the app’s listeners do', async () => {
    await assertSucceeds(getDocs(collection(db(OWNER), 'farms', OWNER, 'eggs')));
  });

  test('updates farm fields with mergeFields, as the app does', async () => {
    await assertSucceeds(
      setDoc(doc(db(OWNER), 'farms', OWNER), { farmName: 'Sunrise Farm', settings: { currency: 'UGX' }, updatedAt: serverTimestamp() }, { mergeFields: ['farmName', 'settings.currency', 'updatedAt'] }),
    );
  });

  test('clears a record field with deleteField, as the app does', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), 'farms', OWNER, 'eggs', egg.id), { ...egg, dirty: deleteField() }, { merge: true }));
  });

  test('adds a worker to the farm', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), 'farms', OWNER), { memberIds: [OWNER, WORKER] }, { merge: true }));
  });

  test('cannot hand the farm to someone else', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'farms', OWNER), { ownerId: STRANGER }, { merge: true }));
  });

  test('cannot lower the schema version', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'farms', OWNER), { schemaVersion: 0 }, { merge: true }));
  });

  test('can raise the schema version when migrating', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), 'farms', OWNER), { schemaVersion: 2 }, { merge: true }));
  });

  test('cannot write to a collection the app does not use', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'farms', OWNER, 'secrets', 'x'), { id: 'x' }));
  });

  test('record ids must match their document id', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'farms', OWNER, 'eggs', 'egg_2'), { ...egg, id: 'egg_other' }));
  });

  test('cannot point their account at a farm they are not on', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'farms', STRANGER), farmDoc({ ownerId: STRANGER, memberIds: [STRANGER] })));
    await assertFails(setDoc(doc(db(OWNER), 'users', OWNER), { farmId: STRANGER }));
  });

  test('cannot add unknown fields to their account', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'users', OWNER), { farmId: OWNER, role: 'admin' }));
  });
});

describe('member', () => {
  beforeEach(() => seed([WORKER]));

  test('reads and logs records on the shared farm', async () => {
    await assertSucceeds(getDoc(doc(db(WORKER), 'farms', OWNER)));
    await assertSucceeds(setDoc(doc(db(WORKER), 'farms', OWNER, 'eggs', 'egg_2'), { ...egg, id: 'egg_2' }));
  });

  test('can point their account at the shared farm', async () => {
    await assertSucceeds(setDoc(doc(db(WORKER), 'users', WORKER), { farmId: OWNER }));
  });

  test('cannot change who is on the farm', async () => {
    await assertFails(setDoc(doc(db(WORKER), 'farms', OWNER), { memberIds: [OWNER, WORKER, STRANGER] }, { merge: true }));
  });

  test('cannot delete the farm', async () => {
    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(doc(db(WORKER), 'farms', OWNER)));
  });
});

describe('stranger', () => {
  beforeEach(() => seed());

  test('cannot read the farm or its records', async () => {
    await assertFails(getDoc(doc(db(STRANGER), 'farms', OWNER)));
    await assertFails(getDoc(doc(db(STRANGER), 'farms', OWNER, 'eggs', egg.id)));
  });

  test('cannot list record collections', async () => {
    await assertFails(getDocs(collection(db(STRANGER), 'farms', OWNER, 'eggs')));
  });

  test('cannot write records', async () => {
    await assertFails(setDoc(doc(db(STRANGER), 'farms', OWNER, 'eggs', 'egg_9'), { ...egg, id: 'egg_9' }));
  });

  test('cannot read someone else’s account', async () => {
    await assertFails(getDoc(doc(db(STRANGER), 'users', OWNER)));
  });
});

describe('push tokens', () => {
  const device = () => ({ token: 'fcm-token-abc', platform: 'android', appVersion: '1.0.0', updatedAt: serverTimestamp() });
  const ref = (d, uid = OWNER) => doc(d, 'users', uid, 'devices', 'device_1');

  test('a phone saves and refreshes its own token, as the app does', async () => {
    await assertSucceeds(setDoc(ref(db(OWNER)), device()));
    await assertSucceeds(setDoc(ref(db(OWNER)), { ...device(), token: 'fcm-token-rotated' }));
  });

  test('a phone removes its token on sign-out', async () => {
    await assertSucceeds(setDoc(ref(db(OWNER)), device()));
    const { deleteDoc } = await import('firebase/firestore');
    await assertSucceeds(deleteDoc(ref(db(OWNER))));
  });

  test('nobody else can read or plant tokens on an account', async () => {
    await assertSucceeds(setDoc(ref(db(OWNER)), device()));
    await assertFails(getDoc(ref(db(STRANGER))));
    await assertFails(setDoc(ref(db(STRANGER)), device()));
    await assertFails(getDoc(ref(db(null))));
  });

  test('tokens must be well formed', async () => {
    await assertFails(setDoc(ref(db(OWNER)), { ...device(), token: '' }));
    await assertFails(setDoc(ref(db(OWNER)), { ...device(), platform: 'windows' }));
    await assertFails(setDoc(ref(db(OWNER)), { ...device(), extra: true }));
    await assertFails(setDoc(ref(db(OWNER)), { ...device(), updatedAt: new Date(0) }));
  });
});
