import { useSyncExternalStore } from 'react';
import { persist as storage } from './persist';

import { breedById } from './breeds';
import { addDays, daysBetween, today, uid } from './format';
import { emptyFarm, sampleFarm, scheduleFor } from './sample';
import type {
  Candling,
  Customer,
  EggLog,
  Expense,
  FarmState,
  FarmType,
  FeedStock,
  Flock,
  House,
  Incubator,
  LossCause,
  Person,
  Sale,
  Settings,
  Task,
} from './types';

/**
 * ROOST is offline-first: every write lands in on-device SQLite immediately, so the UI
 * never waits on the network. `cloud.ts` watches local changes and mirrors them to
 * Firestore, whose own offline queue holds them until there's signal, so the UI can show a
 * calm "12 entries waiting to sync" instead of failing.
 */

const KEY = 'roost.farm.v1';

function load(): FarmState {
  try {
    const raw = storage.get(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FarmState;
      // The sync counter tracks this session's in-flight writes, so it starts at zero.
      if (parsed.version === 1) return { ...emptyFarm(), ...parsed, sync: { pending: 0, lastSyncedAt: parsed.sync?.lastSyncedAt } };
    }
  } catch {
    // A corrupt store should never brick the app: fall through to a fresh farm.
  }
  return emptyFarm();
}

let state: FarmState = load();
let syncing = false;
const listeners = new Set<() => void>();
const changeListeners = new Set<(prev: FarmState, next: FarmState) => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  for (const l of listeners) l();
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      storage.set(KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable: keep working in memory.
    }
  }, 250);
}

/** Every state change goes through here. Local changes are announced to the cloud mirror. */
function commit(next: FarmState, origin: 'local' | 'remote' = 'local') {
  const prev = state;
  if (next === prev) return;
  state = next;
  persist();
  emit();
  if (origin === 'local') for (const l of changeListeners) l(prev, next);
}

function set(next: FarmState | ((s: FarmState) => FarmState)) {
  commit(typeof next === 'function' ? next(state) : next);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getState = () => state;

export function useFarm(): FarmState {
  return useSyncExternalStore(subscribe, getState, getState);
}

const getSyncing = () => syncing;
export function useSyncing(): boolean {
  return useSyncExternalStore(subscribe, getSyncing, getSyncing);
}

export function getFarm() {
  return state;
}

/* ───────────────────────────── Cloud bridge ───────────────────────────── */

/** Called after every change made on this phone, with the state before and after. */
export function onLocalChange(listener: (prev: FarmState, next: FarmState) => void) {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/** Apply data that came from the cloud. It is not echoed back as a local change. */
export function applyRemote(update: (s: FarmState) => FarmState) {
  commit(update(state), 'remote');
}

/** The cloud mirror reports how many changes are still waiting for the server. */
export function setSyncStatus(pending: number, isSyncing: boolean, lastSyncedAt?: string) {
  syncing = isSyncing;
  commit({ ...state, sync: { pending, lastSyncedAt: lastSyncedAt ?? state.sync.lastSyncedAt } }, 'remote');
  emit();
}

/* ───────────────────────────── Daily routine ───────────────────────────── */

/**
 * Make sure today has a task list. Generated from the farm's flocks: egg collections for
 * laying flocks, feeding, water checks, lock-up for free-range, vaccines due, hatchery
 * milestones and the evening biosecurity walk-round.
 */
function crew(s: FarmState) {
  const workers = s.people.filter((p) => p.role === 'worker');
  const lead = s.people.find((p) => p.role === 'manager') ?? s.people[0];
  const pick = (i: number) => (workers[i % Math.max(1, workers.length)] ?? lead)?.id ?? s.settings.meId;
  return { lead, pick };
}

/** One flock's share of a day's routine: egg collections, water check, lock-up and vaccines due. */
function flockTasks(s: FarmState, f: Flock, i: number, vaccinations: FarmState['vaccinations'], add: (task: Omit<Task, 'id' | 'day'>) => void) {
  const t = today();
  const { lead, pick } = crew(s);
  const house = s.houses.find((h) => h.id === f.houseId);
  const breed = breedById(f.breedId);
  const age = daysBetween(f.hatchedOn, t);
  if (breed.lay && age / 7 >= breed.lay[0][0]) {
    add({ slot: 'morning', title: 'Collect eggs', detail: house?.name, assignee: pick(i), flockId: f.id, kind: 'eggs' });
    add({ slot: 'evening', title: 'Collect eggs', detail: house?.name, assignee: pick(i), flockId: f.id, kind: 'eggs' });
  }
  add({ slot: 'midday', title: 'Check drinkers and water meter', detail: house?.name, assignee: pick(i + 1), flockId: f.id, kind: 'water' });
  if (house?.type === 'free-range') {
    add({ slot: 'evening', title: 'Bring birds in and lock up', detail: house.name, assignee: pick(i + 1), flockId: f.id, kind: 'check' });
  }
  for (const v of vaccinations) {
    if (v.doneOn || v.flockId !== f.id) continue;
    if (addDays(f.hatchedOn, v.ageDay) <= t) {
      add({ slot: 'morning', title: v.name, detail: `${house?.name ?? ''} · ${v.route === 'water' ? 'drinking water' : v.route}`, assignee: lead?.id ?? pick(0), flockId: f.id, kind: 'vaccine', vaccinationId: v.id });
    }
  }
}

export function ensureToday() {
  const t = today();
  if (!state.onboarded || state.tasks.some((task) => task.day === t)) return;
  const tasks: Task[] = [];
  const { lead, pick } = crew(state);
  const active = state.flocks.filter((f) => f.status === 'active');

  // Ids are derived from the day, so two phones building the same list write the same documents.
  const add = (task: Omit<Task, 'id' | 'day'>) => tasks.push({ ...task, id: `task_${t}_${tasks.length}`, day: t });

  add({ slot: 'morning', title: 'Morning feed', detail: 'All houses', assignee: pick(1), kind: 'feed' });
  active.forEach((f, i) => flockTasks(state, f, i, state.vaccinations, add));
  for (const inc of state.incubators) {
    if (inc.hatched !== undefined) continue;
    const day = daysBetween(inc.setOn, t);
    const milestone = day === 7 || day === 14 ? 'Candle eggs' : day === 18 ? 'Lockdown: stop turning, raise humidity' : day >= 21 ? 'Hatch day: count chicks' : 'Check temperature and turning';
    add({ slot: 'midday', title: milestone, detail: inc.name, assignee: lead?.id ?? pick(0), kind: 'hatchery' });
  }
  add({ slot: 'evening', title: 'Biosecurity walk-round', detail: 'Footbaths, visitors, disposal', assignee: lead?.id ?? pick(0), kind: 'biosecurity' });

  set((s) => ({ ...s, tasks: [...s.tasks.filter((x) => x.day >= addDays(t, -30)), ...tasks] }));
}

/* ───────────────────────────── Onboarding ───────────────────────────── */

export interface OnboardingInput {
  farmName: string;
  ownerName: string;
  farmTypes: FarmType[];
  houses: Omit<House, 'id'>[];
  /** At most one starting flock per house; houses without one start empty. */
  flocks: FlockInput[];
}

export interface FlockInput {
  breedId: string;
  houseIndex: number;
  ageDays: number;
  count: number;
}

/** Theme, language and offline mode belong to this phone, not to whichever farm is loaded. */
const deviceSettings = () => ({ appearance: state.settings.appearance, language: state.settings.language, offline: state.settings.offline });

export function loadSampleFarm() {
  set({ ...sampleFarm(), settings: { ...sampleFarm().settings, ...deviceSettings() } });
  ensureToday();
}

function newFlock(houseId: string, input: Omit<FlockInput, 'houseIndex'>): Flock {
  return {
    id: uid('flock'),
    houseId,
    breedId: input.breedId,
    hatchedOn: addDays(today(), -input.ageDays),
    placedCount: input.count,
    status: 'active',
  };
}

export function createFarm(input: OnboardingInput) {
  const t = today();
  const houses: House[] = input.houses.map((h, i) => ({ ...h, id: `house_${i}_${uid('h')}` }));
  const flocks = input.flocks.filter((f) => houses[f.houseIndex]).map((f) => newFlock(houses[f.houseIndex].id, f));
  set({
    ...emptyFarm(),
    onboarded: true,
    farmName: input.farmName.trim() || 'My farm',
    farmTypes: input.farmTypes,
    people: [{ id: 'me', name: input.ownerName.trim(), role: 'owner' }],
    houses,
    flocks,
    vaccinations: flocks.flatMap((f) => scheduleFor(f, t)),
    settings: { ...state.settings, meId: 'me', workerMode: false },
    sync: state.sync,
  });
  ensureToday();
}

/* ───────────────────────────── Houses & flocks ───────────────────────────── */

export function addHouse(house: Omit<House, 'id'>): House {
  const h: House = { ...house, id: uid('house') };
  set((s) => ({ ...s, houses: [...s.houses, h] }));
  return h;
}

export function updateHouse(id: string, patch: Partial<Omit<House, 'id'>>) {
  set((s) => ({ ...s, houses: s.houses.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
}

/** Only a house that never held birds can go: past flocks keep pointing at it for their records. */
export function removeHouse(id: string) {
  set((s) => (s.flocks.some((f) => f.houseId === id) ? s : { ...s, houses: s.houses.filter((h) => h.id !== id) }));
}

/**
 * Place new birds. Builds their vaccination plan and, because today's routine is generated
 * once a day, adds their share of today's tasks straight away.
 */
export function addFlock(houseId: string, input: Omit<FlockInput, 'houseIndex'>): Flock {
  const flock = newFlock(houseId, input);
  set((s) => {
    const vaccinations = scheduleFor(flock, today());
    const next = { ...s, flocks: [...s.flocks, flock], vaccinations: [...s.vaccinations, ...vaccinations] };
    const tasks: Task[] = [];
    if (s.tasks.some((task) => task.day === today())) {
      const add = (task: Omit<Task, 'id' | 'day'>) => tasks.push({ ...task, id: `task_${today()}_${flock.id}_${tasks.length}`, day: today() });
      flockTasks(next, flock, s.flocks.length, vaccinations, add);
    }
    return { ...next, tasks: [...s.tasks, ...tasks] };
  });
  return flock;
}

export function addFeedStore(store: Omit<FeedStock, 'id'>) {
  set((s) => ({ ...s, stocks: [...s.stocks, { ...store, id: uid('stock') }] }));
}

export function addIncubator(name: string, eggs: number, setOn: string) {
  const inc: Incubator = { id: uid('inc'), name, eggs, setOn, tempC: 37.6, humidity: 55, candling: [] };
  set((s) => ({ ...s, incubators: [...s.incubators, inc] }));
  return inc;
}

export function resetFarm() {
  set({ ...emptyFarm(), settings: { ...state.settings, workerMode: false } });
}

/** Forget this phone's copy of the farm, e.g. on sign-out. The cloud copy is untouched. */
export function clearLocalFarm() {
  commit({ ...emptyFarm(), settings: { ...state.settings, workerMode: false } }, 'remote');
}

/* ───────────────────────────── Logging ───────────────────────────── */

const me = () => state.settings.meId;

export function logEggs(entry: Omit<EggLog, 'id' | 'day' | 'at' | 'by'>) {
  const t = today();
  set((s) => {
    const log: EggLog = { ...entry, id: uid('egg'), day: t, at: new Date().toISOString(), by: me() };
    // Logging eggs ticks off the next open collection task for that flock.
    let ticked = false;
    const tasks = s.tasks.map((task) => {
      if (!ticked && task.day === t && task.kind === 'eggs' && task.flockId === entry.flockId && !task.doneAt) {
        ticked = true;
        return { ...task, doneAt: log.at, doneBy: me() };
      }
      return task;
    });
    return { ...s, eggs: [...s.eggs, log], tasks };
  });
}

export function logLosses(flockId: string, count: number, cause: LossCause, note?: string) {
  set((s) => ({ ...s, losses: [...s.losses, { id: uid('loss'), flockId, day: today(), count, cause, note, by: me() }] }));
}

export function logFeed(flockId: string, kg: number) {
  set((s) => {
    const stock = s.stocks.find((x) => x.flockIds.includes(flockId));
    return {
      ...s,
      feed: [...s.feed, { id: uid('feed'), flockId, day: today(), kg }],
      stocks: s.stocks.map((x) => (x === stock ? { ...x, kgOnHand: Math.max(0, x.kgOnHand - kg) } : x)),
    };
  });
}

export function logWater(flockId: string, litres: number) {
  set((s) => ({ ...s, water: [...s.water, { id: uid('water'), flockId, day: today(), litres }] }));
}

export function logWeight(flockId: string, avgKg: number, sample: number) {
  set((s) => ({ ...s, weights: [...s.weights, { id: uid('w'), flockId, day: today(), avgKg, sample }] }));
}

export function logTreatment(flockId: string, drug: string, reason: string, days: number, withdrawalDays: number) {
  const t = today();
  set((s) => ({
    ...s,
    treatments: [
      ...s.treatments,
      { id: uid('treat'), flockId, drug, reason, start: t, days, withdrawalUntil: addDays(t, days + withdrawalDays) },
    ],
  }));
}

export function logNote(text: string, flockId?: string) {
  set((s) => ({ ...s, notes: [...s.notes, { id: uid('note'), day: today(), at: new Date().toISOString(), text, flockId, by: me() }] }));
}

export function addPhoto(flockId: string, uri: string) {
  set((s) => ({ ...s, photos: [...s.photos, { id: uid('photo'), flockId, uri, day: today() }] }));
}

export function logSale(sale: Omit<Sale, 'id' | 'day'>): Sale {
  const full: Sale = { ...sale, id: uid('sale'), day: today() };
  set((s) => ({ ...s, sales: [...s.sales, full] }));
  return full;
}

export function recordPayment(saleId: string, amount: number) {
  set((s) => ({ ...s, sales: s.sales.map((x) => (x.id === saleId ? { ...x, paid: Math.min(x.qty * x.unitPrice, x.paid + amount) } : x)) }));
}

export function addCustomer(name: string, phone?: string): Customer {
  const c: Customer = { id: uid('cust'), name, phone };
  set((s) => ({ ...s, customers: [...s.customers, c] }));
  return c;
}

export function addExpense(e: Omit<Expense, 'id' | 'day'>) {
  set((s) => ({ ...s, expenses: [...s.expenses, { ...e, id: uid('exp'), day: today() }] }));
}

/* ───────────────────────────── Tasks & health ───────────────────────────── */

export function toggleTask(taskId: string) {
  const at = new Date().toISOString();
  set((s) => {
    const task = s.tasks.find((x) => x.id === taskId);
    if (!task) return s;
    const done = !task.doneAt;
    return {
      ...s,
      tasks: s.tasks.map((x) => (x.id === taskId ? { ...x, doneAt: done ? at : undefined, doneBy: done ? me() : undefined } : x)),
      vaccinations: task.vaccinationId
        ? s.vaccinations.map((v) => (v.id === task.vaccinationId ? { ...v, doneOn: done ? today() : undefined, by: done ? me() : undefined } : v))
        : s.vaccinations,
    };
  });
}

export function markVaccination(vaccinationId: string, done: boolean) {
  set((s) => ({
    ...s,
    vaccinations: s.vaccinations.map((v) => (v.id === vaccinationId ? { ...v, doneOn: done ? today() : undefined, by: done ? me() : undefined } : v)),
    tasks: s.tasks.map((task) =>
      task.vaccinationId === vaccinationId && task.day === today()
        ? { ...task, doneAt: done ? new Date().toISOString() : undefined, doneBy: done ? me() : undefined }
        : task,
    ),
  }));
}

export function addTask(task: Omit<Task, 'id' | 'day'>) {
  set((s) => ({ ...s, tasks: [...s.tasks, { ...task, id: uid('task'), day: today() }] }));
}

export function dismissAlert(alertId: string) {
  const t = today();
  set((s) => ({ ...s, dismissedAlerts: { ...s.dismissedAlerts, [t]: [...(s.dismissedAlerts[t] ?? []), alertId] } }));
}

export function setBiosecurity(item: string, done: boolean) {
  const t = today();
  set((s) => ({ ...s, biosecurity: { ...s.biosecurity, [t]: { ...(s.biosecurity[t] ?? {}), [item]: done } } }));
}

export function addVisitor(name: string, purpose: string, otherFarmRecently: boolean) {
  set((s) => ({ ...s, visitors: [{ id: uid('vis'), name, purpose, otherFarmRecently, at: new Date().toISOString() }, ...s.visitors] }));
}

export function setQuarantine(houseId: string, quarantine: boolean) {
  set((s) => ({ ...s, houses: s.houses.map((h) => (h.id === houseId ? { ...h, quarantine } : h)) }));
}

export function closeCoop() {
  const t = today();
  set((s) => (s.coopClosed.includes(t) ? s : { ...s, coopClosed: [...s.coopClosed, t] }));
}

export function archiveFlock(flockId: string) {
  set((s) => ({ ...s, flocks: s.flocks.map((f) => (f.id === flockId ? { ...f, status: 'archived', archivedOn: today() } : f)) }));
}

/* ───────────────────────────── Hatchery ───────────────────────────── */

export function recordCandling(incubatorId: string, candling: Candling) {
  set((s) => ({
    ...s,
    incubators: s.incubators.map((inc) =>
      inc.id === incubatorId ? { ...inc, candling: [...inc.candling.filter((c) => c.day !== candling.day), candling].sort((a, b) => a.day - b.day) } : inc,
    ),
  }));
}

export function recordHatch(incubatorId: string, hatched: number) {
  set((s) => ({ ...s, incubators: s.incubators.map((inc) => (inc.id === incubatorId ? { ...inc, hatched } : inc)) }));
}

export function reorderFeed(stockId: string, kg: number) {
  set((s) => {
    const stock = s.stocks.find((x) => x.id === stockId);
    if (!stock) return s;
    return {
      ...s,
      stocks: s.stocks.map((x) => (x.id === stockId ? { ...x, kgOnHand: Math.min(x.capacityKg, x.kgOnHand + kg) } : x)),
      expenses: [...s.expenses, { id: uid('exp'), day: today(), category: 'feed', amount: Math.round(kg * stock.pricePerKg), note: `${stock.name} · ${kg.toLocaleString()} kg` }],
    };
  });
}

/* ───────────────────────────── Settings ───────────────────────────── */

export function updateSettings(patch: Partial<Settings>) {
  set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

/* ───────────────────────────── Team ───────────────────────────── */

export function addPerson(name: string, role: Person['role'], phone?: string) {
  set((s) => ({ ...s, people: [...s.people, { id: uid('person'), name, role, phone }] }));
}

export function removePerson(id: string) {
  set((s) => ({
    ...s,
    people: s.people.filter((p) => p.id !== id),
    tasks: s.tasks.map((t) => (t.assignee === id && !t.doneAt ? { ...t, assignee: s.settings.meId } : t)),
  }));
}

export function assignTask(taskId: string, personId: string) {
  set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, assignee: personId } : t)) }));
}
