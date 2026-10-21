import { breedById, interpolate, SPECIES_LABEL, type Breed } from './breeds';
import { feedingNow, groupOf } from './care';
import { addDays, daysBetween, fmt, monthKey, today } from './format';
import type { Day, EggLog, FarmState, Flock, Incubator, Sale, Slot, Task, Vaccination } from './types';

export const eggTotal = (e: Pick<EggLog, 'large' | 'medium' | 'small' | 'cracked' | 'dirty'>) =>
  e.large + e.medium + e.small + e.cracked + e.dirty;

export const activeFlocks = (s: FarmState) => s.flocks.filter((f) => f.status === 'active');
export const flocksIn = (s: FarmState, houseId: string) => activeFlocks(s).filter((f) => f.houseId === houseId);
export const birdsIn = (s: FarmState, houseId: string) => flocksIn(s, houseId).reduce((n, f) => n + aliveOn(s, f), 0);
export const houseOf = (s: FarmState, flock: Flock) => s.houses.find((h) => h.id === flock.houseId);
export const houseName = (s: FarmState, flock: Flock) => houseOf(s, flock)?.name ?? 'Unassigned';
export const personName = (s: FarmState, id?: string) => {
  const p = s.people.find((x) => x.id === id);
  return p ? p.name || (p.id === s.settings.meId ? 'You' : 'Owner') : 'Someone';
};

export function ageOf(flock: Flock, day: Day = today()) {
  const days = daysBetween(flock.hatchedOn, flock.status === 'archived' && flock.archivedOn ? flock.archivedOn : day);
  const weeks = Math.floor(days / 7);
  const breed = breedById(flock.breedId);
  const byDay = !!breed.marketDay || days < 28;
  return { days, weeks, label: byDay ? `Day ${days}` : `Week ${weeks}`, spoken: byDay ? `day ${days}` : `week ${weeks}` };
}

export function aliveOn(s: FarmState, flock: Flock, day: Day = today()) {
  return flock.placedCount - s.losses.filter((l) => l.flockId === flock.id && l.day <= day).reduce((n, l) => n + l.count, 0);
}

export function isLaying(flock: Flock, day: Day = today()) {
  const breed = breedById(flock.breedId);
  if (!breed.lay) return false;
  return interpolate(breed.lay, ageOf(flock, day).days / 7) > 0.02;
}

export function eggsOn(s: FarmState, day: Day, flockId?: string) {
  return s.eggs.filter((e) => e.day === day && (!flockId || e.flockId === flockId)).reduce((n, e) => n + eggTotal(e), 0);
}

export function eggTarget(s: FarmState, day: Day, flockId?: string) {
  return activeFlocks(s)
    .filter((f) => (!flockId || f.id === flockId) && isLaying(f, day))
    .reduce((n, f) => n + Math.round(aliveOn(s, f, day) * interpolate(breedById(f.breedId).lay!, ageOf(f, day).days / 7)), 0);
}

export function gradesOn(s: FarmState, day: Day) {
  const out = { large: 0, medium: 0, small: 0, cracked: 0, dirty: 0 };
  for (const e of s.eggs) {
    if (e.day !== day) continue;
    out.large += e.large;
    out.medium += e.medium;
    out.small += e.small;
    out.cracked += e.cracked;
    out.dirty += e.dirty;
  }
  return out;
}

export const expectedFeed = (s: FarmState, f: Flock, day: Day) =>
  aliveOn(s, f, day) * interpolate(breedById(f.breedId).feed, ageOf(f, day).days);
export const expectedWater = (s: FarmState, f: Flock, day: Day) => expectedFeed(s, f, day) * breedById(f.breedId).waterRatio;

const sumFor = <T extends { flockId: string; day: Day }>(rows: T[], key: (r: T) => number, flockId: string, day: Day) =>
  rows.filter((r) => r.flockId === flockId && r.day === day).reduce((n, r) => n + key(r), 0);

export const feedOn = (s: FarmState, flockId: string, day: Day) => sumFor(s.feed, (r) => r.kg, flockId, day);
export const waterOn = (s: FarmState, flockId: string, day: Day) => sumFor(s.water, (r) => r.litres, flockId, day);

export function latestWeight(s: FarmState, flockId: string) {
  return s.weights.filter((w) => w.flockId === flockId).sort((a, b) => (a.day < b.day ? 1 : -1))[0];
}

export function standardWeight(f: Flock, day: Day = today()) {
  return interpolate(breedById(f.breedId).weight, ageOf(f, day).days);
}

export function lossesFor(s: FarmState, flockId: string) {
  return s.losses.filter((l) => l.flockId === flockId).reduce((n, l) => n + l.count, 0);
}

export function lossesOn(s: FarmState, day: Day) {
  return s.losses.filter((l) => l.day === day).reduce((n, l) => n + l.count, 0);
}

/* ───────────────────────────── Flock metrics ───────────────────────────── */

export interface FlockMetrics {
  alive: number;
  mortality: number;
  avgKg?: number;
  stdKg: number;
  uniformity?: number;
  fcr?: number;
  layRate?: number;
  stdLay?: number;
  eggsPerHenHoused?: number;
  costPerBird: number;
}

export function flockMetrics(s: FarmState, f: Flock, day: Day = today()): FlockMetrics {
  const breed = breedById(f.breedId);
  const alive = aliveOn(s, f, day);
  const w = latestWeight(s, f.id);
  const totalFeed = s.feed.filter((x) => x.flockId === f.id).reduce((n, x) => n + x.kg, 0);
  let fcr: number | undefined;
  let layRate: number | undefined;
  let stdLay: number | undefined;
  let eggsPerHenHoused: number | undefined;

  if (breed.lay && isLaying(f, day)) {
    const ref = eggsOn(s, day, f.id) > 0 ? day : addDays(day, -1);
    layRate = eggsOn(s, ref, f.id) / Math.max(1, aliveOn(s, f, ref));
    stdLay = interpolate(breed.lay, ageOf(f, ref).days / 7);
    eggsPerHenHoused = s.eggs.filter((e) => e.flockId === f.id).reduce((n, e) => n + eggTotal(e), 0) / f.placedCount;
    // Layers: kg of feed per kg of eggs over the last 7 days (62 g an egg).
    let feed7 = 0;
    let eggs7 = 0;
    for (let i = 1; i <= 7; i++) {
      feed7 += feedOn(s, f.id, addDays(day, -i));
      eggs7 += eggsOn(s, addDays(day, -i), f.id);
    }
    if (eggs7 > 0) fcr = feed7 / (eggs7 * 0.062);
  } else if (w && totalFeed > 0) {
    const gain = alive * w.avgKg - f.placedCount * breed.weight[0][1];
    if (gain > 0) fcr = totalFeed / gain;
  }

  // Cost per bird: expenses tagged to this flock + a share of farm-wide costs this month.
  const month = monthKey(day);
  const monthExp = s.expenses.filter((e) => monthKey(e.day) === month);
  const farmAlive = activeFlocks(s).reduce((n, x) => n + aliveOn(s, x, day), 0) || 1;
  const own = monthExp.filter((e) => e.flockId === f.id).reduce((n, e) => n + e.amount, 0);
  const shared = monthExp.filter((e) => !e.flockId).reduce((n, e) => n + e.amount, 0) * (alive / farmAlive);

  return {
    alive,
    mortality: lossesFor(s, f.id) / f.placedCount,
    avgKg: w?.avgKg,
    stdKg: standardWeight(f, day),
    uniformity: w?.uniformity,
    fcr,
    layRate,
    stdLay,
    eggsPerHenHoused,
    costPerBird: alive > 0 ? (own + shared) / alive : 0,
  };
}

/** One sentence a screen reader can speak for a flock. */
export function flockSentence(s: FarmState, f: Flock) {
  const breed = breedById(f.breedId);
  const m = flockMetrics(s, f);
  const unit = SPECIES_LABEL[breed.species].many;
  const age = ageOf(f);
  const tail = m.layRate !== undefined
    ? `, laying at ${Math.round(m.layRate * 100)} percent`
    : m.avgKg
      ? `, average weight ${m.avgKg.toFixed(2)} kilograms`
      : '';
  return `${houseName(s, f)}, ${fmt.int(m.alive)} ${breed.name} ${unit}, ${age.spoken}${tail}.`;
}

/** The headline number for a flock card. */
export function keyMetric(s: FarmState, f: Flock) {
  const m = flockMetrics(s, f);
  if (m.layRate !== undefined) {
    return { label: 'Lay rate', value: fmt.pct(m.layRate), good: m.layRate >= (m.stdLay ?? 0) * 0.95 };
  }
  if (m.avgKg !== undefined) {
    return { label: 'Avg weight', value: `${m.avgKg.toFixed(2)} kg`, good: m.avgKg >= m.stdKg * 0.95 };
  }
  return { label: 'Livability', value: fmt.pct(1 - m.mortality, 1), good: m.mortality < 0.03 };
}

/** Last 14 days of the key series, for card sparklines. */
export function sparkSeries(s: FarmState, f: Flock, day: Day = today()): number[] {
  const out: number[] = [];
  const laying = isLaying(f, day);
  for (let i = 13; i >= 0; i--) {
    const d = addDays(day, -i);
    if (laying) {
      const eggs = eggsOn(s, d, f.id);
      if (eggs > 0) out.push(eggs / Math.max(1, aliveOn(s, f, d)));
    } else {
      const feed = feedOn(s, f.id, d);
      if (feed > 0) out.push(feed / Math.max(1, aliveOn(s, f, d)));
    }
  }
  return out;
}

/** Actual vs breed standard across the flock's life. */
export function performanceSeries(s: FarmState, f: Flock, day: Day = today()) {
  const breed = breedById(f.breedId);
  const age = ageOf(f, day).days;
  if (breed.lay && isLaying(f, day)) {
    // Weekly lay %, from the first week we have records.
    const actual: { x: number; y: number }[] = [];
    const firstWeek = Math.max(Math.floor(breed.lay[0][0]), Math.floor((age - 120) / 7));
    for (let w = firstWeek; w <= Math.floor(age / 7); w++) {
      let eggs = 0;
      let hens = 0;
      for (let d = w * 7; d < w * 7 + 7 && d <= age; d++) {
        const dd = addDays(f.hatchedOn, d);
        const e = eggsOn(s, dd, f.id);
        if (e > 0) {
          eggs += e;
          hens += aliveOn(s, f, dd);
        }
      }
      if (hens > 0) actual.push({ x: w, y: eggs / hens });
    }
    const end = Math.max(Math.floor(age / 7) + 6, 40);
    const standard: { x: number; y: number }[] = [];
    for (let w = firstWeek; w <= end; w++) standard.push({ x: w, y: interpolate(breed.lay, w) });
    return { kind: 'lay' as const, unit: 'week', actual, standard, now: age / 7, yFormat: (v: number) => fmt.pct(v) };
  }
  const actual = s.weights.filter((w) => w.flockId === f.id).map((w) => ({ x: daysBetween(f.hatchedOn, w.day), y: w.avgKg })).sort((a, b) => a.x - b.x);
  const end = breed.marketDay ?? Math.max(age + 28, 56);
  const standard: { x: number; y: number }[] = [];
  const step = end > 120 ? 7 : 1;
  for (let d = 0; d <= end; d += step) standard.push({ x: d, y: interpolate(breed.weight, d) });
  return { kind: 'weight' as const, unit: 'day', actual, standard, now: age, yFormat: (v: number) => `${v.toFixed(2)} kg` };
}

export function currentStage(f: Flock, day: Day = today()) {
  const breed = breedById(f.breedId);
  const age = ageOf(f, day).days;
  let index = 0;
  breed.stages.forEach((st, i) => {
    if (age >= st.startDay) index = i;
  });
  return { stages: breed.stages, index };
}

/* ───────────────────────────── Flock Pulse ───────────────────────────── */

export interface Vital {
  key: 'lay' | 'feed' | 'water' | 'livability';
  label: 'Lay rate' | 'Growth' | 'Feed' | 'Water' | 'Livability';
  /** Ring fill, 0–1. 1 means on target. */
  fill: number;
  value: string;
  detail: string;
  ok: boolean;
}

const closeness = (actual: number, expected: number) => (expected <= 0 ? 1 : Math.max(0, 1 - Math.abs(actual / expected - 1)));

function vitalsFor(s: FarmState, flocks: Flock[], day: Day): Vital[] {
  const laying = flocks.filter((f) => isLaying(f, day));
  let lay: Vital;
  if (laying.length) {
    const ids = new Set(laying.map((f) => f.id));
    const eggsToday = s.eggs.filter((e) => e.day === day && ids.has(e.flockId)).reduce((n, e) => n + eggTotal(e), 0);
    const targetToday = laying.reduce((n, f) => n + eggTarget(s, day, f.id), 0);
    const ref = eggsToday >= targetToday * 0.5 ? day : addDays(day, -1);
    const eggs = s.eggs.filter((e) => e.day === ref && ids.has(e.flockId)).reduce((n, e) => n + eggTotal(e), 0);
    const hens = laying.reduce((n, f) => n + aliveOn(s, f, ref), 0);
    const target = laying.reduce((n, f) => n + eggTarget(s, ref, f.id), 0);
    const rate = eggs / Math.max(1, hens);
    lay = {
      key: 'lay', label: 'Lay rate', fill: Math.min(1, eggs / Math.max(1, target)), value: fmt.pct(rate),
      detail: `${ref === day ? 'Today' : 'Yesterday'} · target ${fmt.pct(target / Math.max(1, hens))}`, ok: eggs >= target * 0.95,
    };
  } else {
    const ratios = flocks.flatMap((f) => {
      const w = latestWeight(s, f.id);
      return w ? [w.avgKg / standardWeight(f, w.day)] : [];
    });
    const r = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    lay = ratios.length
      ? { key: 'lay', label: 'Growth', fill: Math.min(1, r), value: fmt.pct(r), detail: 'Of breed standard weight', ok: r >= 0.95 }
      : { key: 'lay', label: 'Growth', fill: 0, value: '—', detail: 'Weigh a sample to start', ok: true };
  }

  const pick = (fn: (f: Flock, d: Day) => number) => {
    const t = flocks.reduce((n, f) => n + fn(f, day), 0);
    return t > 0 ? { ref: day, total: t } : { ref: addDays(day, -1), total: flocks.reduce((n, f) => n + fn(f, addDays(day, -1)), 0) };
  };
  const feed = pick((f, d) => feedOn(s, f.id, d));
  const feedExp = flocks.reduce((n, f) => n + expectedFeed(s, f, feed.ref), 0);
  const water = pick((f, d) => waterOn(s, f.id, d));
  const waterExp = flocks.reduce((n, f) => n + expectedWater(s, f, water.ref), 0);
  const placed = flocks.reduce((n, f) => n + f.placedCount, 0);
  const alive = flocks.reduce((n, f) => n + aliveOn(s, f, day), 0);
  const liv = placed ? alive / placed : 1;
  const feedC = feed.total ? closeness(feed.total, feedExp) : 0;
  const waterC = water.total ? closeness(water.total, waterExp) : 0;

  return [
    lay,
    {
      key: 'feed', label: 'Feed', fill: feedC, value: feed.total ? fmt.pct(feedC) : '—',
      detail: feed.total ? `${fmt.int(feed.total)} of ${fmt.int(feedExp)} kg expected` : 'Not logged yet', ok: feedC >= 0.92,
    },
    {
      key: 'water', label: 'Water', fill: waterC, value: water.total ? fmt.pct(waterC) : '—',
      detail: water.total ? `${fmt.int(water.total)} of ${fmt.int(waterExp)} L expected` : 'Not logged yet', ok: waterC >= 0.92,
    },
    {
      key: 'livability', label: 'Livability', fill: liv, value: fmt.pct(liv, 1),
      detail: `${fmt.int(alive)} of ${fmt.int(placed)} birds`, ok: liv >= 0.96,
    },
  ];
}

/** Whole-farm vitals, or one house's when `houseId` is given. */
export function flockPulse(s: FarmState, day: Day = today(), houseId?: string) {
  const flocks = activeFlocks(s).filter((f) => !houseId || f.houseId === houseId);
  const vitals = vitalsFor(s, flocks, day);
  const houses = flocks.map((f) => ({ flock: f, house: houseName(s, f), vitals: vitalsFor(s, [f], day) }));
  const weak = houses.filter((h) => h.vitals.some((v) => !v.ok && v.value !== '—'));
  const summary = weak.length === 0 ? 'All houses on track' : weak.length === 1 ? `${weak[0].house} needs a look` : `${weak.length} houses need a look`;
  return { vitals, houses, summary, weak: weak.map((h) => h.house), ok: weak.length === 0 };
}

/* ───────────────────────────── Feed runway ───────────────────────────── */

export function feedRunway(s: FarmState, stockId: string, day: Day = today()) {
  const stock = s.stocks.find((x) => x.id === stockId)!;
  const flocks = activeFlocks(s).filter((f) => stock.flockIds.includes(f.id));
  let kg = stock.kgOnHand;
  let days = 0;
  let untilMarket = false;
  const daily = flocks.reduce((n, f) => n + expectedFeed(s, f, day), 0);
  while (days < 120) {
    const d = addDays(day, days);
    const eating = flocks.filter((f) => {
      const market = breedById(f.breedId).marketDay;
      return !market || ageOf(f, d).days < market;
    });
    if (flocks.length && eating.length === 0) {
      untilMarket = true;
      break;
    }
    const need = eating.reduce((n, f) => n + expectedFeed(s, f, d), 0);
    if (need <= 0 || kg < need) break;
    kg -= need;
    days++;
  }
  return { days, dailyKg: daily, fill: stock.kgOnHand / stock.capacityKg, untilMarket };
}

/* ───────────────────────────── Health ───────────────────────────── */

export function vaccineDue(s: FarmState, v: Vaccination) {
  const f = s.flocks.find((x) => x.id === v.flockId)!;
  return addDays(f.hatchedOn, v.ageDay);
}

export type VaccineState = 'done' | 'due' | 'overdue' | 'soon' | 'upcoming';

export function vaccineState(s: FarmState, v: Vaccination, day: Day = today()): VaccineState {
  if (v.doneOn) return 'done';
  const due = vaccineDue(s, v);
  if (due === day) return 'due';
  if (due < day) return 'overdue';
  return daysBetween(day, due) <= 7 ? 'soon' : 'upcoming';
}

export function activeWithdrawals(s: FarmState, day: Day = today()) {
  return s.treatments
    .filter((t) => day < t.withdrawalUntil)
    .map((t) => {
      const f = s.flocks.find((x) => x.id === t.flockId);
      return { ...t, house: f ? houseName(s, f) : '', laying: f ? isLaying(f, day) : false };
    });
}

export function withdrawalFor(s: FarmState, flockId: string | undefined, day: Day = today()) {
  if (!flockId) return undefined;
  return activeWithdrawals(s, day).find((w) => w.flockId === flockId);
}

export function mortalitySpike(s: FarmState, day: Day = today()) {
  for (const f of activeFlocks(s)) {
    const todayLosses = s.losses.filter((l) => l.flockId === f.id && l.day === day).reduce((n, l) => n + l.count, 0);
    if (todayLosses === 0) continue;
    let week = 0;
    for (let i = 1; i <= 7; i++) {
      const d = addDays(day, -i);
      week += s.losses.filter((l) => l.flockId === f.id && l.day === d).reduce((n, l) => n + l.count, 0);
    }
    const alive = aliveOn(s, f, day);
    const avg = week / 7;
    if (todayLosses >= Math.max(5, alive * 0.005) && todayLosses > avg * 3) {
      return { flock: f, house: houseName(s, f), count: todayLosses, avg };
    }
  }
  return undefined;
}

/* ───────────────────────────── Alerts ───────────────────────────── */

export interface Alert {
  id: string;
  priority: 0 | 1 | 2;
  tone: 'barn' | 'yolk' | 'sky';
  kicker: string;
  title: string;
  body: string;
  primary: { label: string; action: AlertAction };
  secondary?: { label: string; action: AlertAction };
}

export type AlertAction =
  | { type: 'add-task'; title: string; detail: string; flockId?: string; kind: Task['kind'] }
  | { type: 'navigate'; href: string }
  | { type: 'reorder'; stockId: string }
  | { type: 'vaccinate'; vaccinationId: string }
  | { type: 'dismiss' };

export function alerts(s: FarmState, day: Day = today()): Alert[] {
  const out: Alert[] = [];
  const yesterday = addDays(day, -1);

  for (const f of activeFlocks(s)) {
    const house = houseName(s, f);
    const wt = waterOn(s, f.id, day);
    const wy = waterOn(s, f.id, yesterday);
    if (wt > 0 && wy > 0) {
      const change = (wt - wy) / wy;
      if (change <= -0.12) {
        out.push({
          id: `water-${f.id}-${day}`, priority: 0, tone: 'barn', kicker: 'Needs a look',
          title: `${house}: water intake down ${Math.round(-change * 100)}% since yesterday.`,
          body: 'Possible early sign of illness or a blocked drinker.',
          primary: { label: 'Check drinkers', action: { type: 'add-task', title: 'Check drinkers', detail: `${house} · water down ${Math.round(-change * 100)}%`, flockId: f.id, kind: 'water' } },
          secondary: { label: 'Log issue', action: { type: 'navigate', href: `/log/note?flock=${f.id}` } },
        });
      }
    }
  }

  for (const v of s.vaccinations) {
    if (vaccineState(s, v, day) !== 'overdue') continue;
    const f = s.flocks.find((x) => x.id === v.flockId);
    if (!f || f.status !== 'active') continue;
    const late = daysBetween(vaccineDue(s, v), day);
    out.push({
      id: `vac-${v.id}`, priority: 0, tone: 'barn', kicker: 'Overdue vaccine',
      title: `${v.name} for ${houseName(s, f)} is ${late} day${late === 1 ? '' : 's'} late.`,
      body: `${v.disease}. Give it today if the birds are healthy, or ask your vet.`,
      primary: { label: 'Mark as given', action: { type: 'vaccinate', vaccinationId: v.id } },
      secondary: { label: 'See schedule', action: { type: 'navigate', href: '/health' } },
    });
  }

  for (const stock of s.stocks) {
    const r = feedRunway(s, stock.id, day);
    if (r.untilMarket || r.days > 7) continue;
    out.push({
      id: `feed-${stock.id}-${day}`, priority: 1, tone: 'yolk', kicker: 'Feed',
      title: `${stock.name}: ${r.days} day${r.days === 1 ? '' : 's'} left.`,
      body: `About ${fmt.int(r.dailyKg)} kg a day. Order now so it arrives in time.`,
      primary: { label: 'Reorder', action: { type: 'navigate', href: '/today/feed' } },
      secondary: { label: 'Later', action: { type: 'dismiss' } },
    });
  }

  // Feed changes (chick mash to growers, growers to layers…) three days ahead, so there is
  // time to buy the new feed and mix it in gradually.
  for (const f of activeFlocks(s)) {
    const next = feedingNow(f, day).next;
    if (!next || next.inDays > 3) continue;
    const house = houseName(s, f);
    out.push({
      id: `feedchange-${f.id}-${next.phase.id}`, priority: 2, tone: 'yolk', kicker: 'Feed change',
      title: next.inDays === 0 ? `${house}: switch to ${next.phase.name.en} today.` : `${house}: switch to ${next.phase.name.en} in ${next.inDays} day${next.inDays === 1 ? '' : 's'}.`,
      body: 'Buy it now and mix it with the old feed over 3–5 days, so the birds don’t go off their food.',
      primary: { label: 'Feeding guide', action: { type: 'navigate', href: `/health/guide?group=${groupOf(breedById(f.breedId).species).key}` } },
      secondary: { label: 'Got it', action: { type: 'dismiss' } },
    });
  }

  for (const inc of s.incubators) {
    if (inc.hatched !== undefined) continue;
    const d = daysBetween(inc.setOn, day);
    if (d === 17 || d === 18) {
      out.push({
        id: `inc-${inc.id}-${day}`, priority: 2, tone: 'sky', kicker: 'Hatchery',
        title: d === 17 ? `${inc.name}: lockdown tomorrow.` : `${inc.name}: lockdown today.`,
        body: 'On day 18, stop turning and raise humidity to 65–70%.',
        primary: { label: 'Hatch plan', action: { type: 'navigate', href: `/flocks/incubator/${inc.id}` } },
        secondary: { label: 'Got it', action: { type: 'dismiss' } },
      });
    }
  }

  const dismissed = new Set(s.dismissedAlerts[day] ?? []);
  return out.filter((a) => !dismissed.has(a.id)).sort((a, b) => a.priority - b.priority);
}

export function vaccinesDueToday(s: FarmState, day: Day = today()) {
  return s.vaccinations.filter((v) => {
    const f = s.flocks.find((x) => x.id === v.flockId);
    return f?.status === 'active' && vaccineState(s, v, day) === 'due';
  });
}

export function needsYou(s: FarmState, day: Day = today()) {
  return alerts(s, day).filter((a) => a.priority <= 1).length + vaccinesDueToday(s, day).length;
}

/* ───────────────────────────── Tasks ───────────────────────────── */

export const SLOTS: { key: Slot; label: 'Morning' | 'Midday' | 'Evening' }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'midday', label: 'Midday' },
  { key: 'evening', label: 'Evening' },
];

export function tasksOn(s: FarmState, day: Day = today(), assignee?: string) {
  const list = s.tasks.filter((t) => t.day === day && (!assignee || t.assignee === assignee));
  return SLOTS.map((slot) => ({ ...slot, tasks: list.filter((t) => t.slot === slot.key) }));
}

export function allTasksDone(s: FarmState, day: Day = today()) {
  const list = s.tasks.filter((t) => t.day === day);
  return list.length > 0 && list.every((t) => t.doneAt);
}

/* ───────────────────────────── Weather ───────────────────────────── */

export type HeatBand = 'comfortable' | 'warm' | 'high' | 'danger';

/** Practical poultry rule of thumb: temperature (°F) + relative humidity (%). */
export function heatIndex(tempC: number, humidity: number) {
  const v = tempC * 1.8 + 32 + humidity;
  let band: HeatBand = v >= 160 ? 'danger' : v >= 150 ? 'high' : v >= 140 ? 'warm' : 'comfortable';
  // The rule only means something in real heat: humid, cool evenings are not heat stress.
  if (tempC < 24) band = 'comfortable';
  else if (tempC < 27 && (band === 'high' || band === 'danger')) band = 'warm';
  return { value: Math.round(v), band };
}

export function heatOutlook(s: FarmState) {
  const w = s.weather;
  if (!w) return undefined;
  const hours = w.hours.map((h) => ({ ...h, ...heatIndex(h.tempC, h.humidity) }));
  const hot = hours.filter((h) => h.band === 'high' || h.band === 'danger');
  const peak = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);
  const now = new Date().getHours();
  const current = hours.find((h) => h.hour === now) ?? (now < hours[0].hour ? hours[0] : hours[hours.length - 1]);
  let guidance = 'Comfortable all day. Keep drinkers clean and full.';
  let window: string | undefined;
  if (hot.length) {
    window = `${fmt.hour(hot[0].hour).replace(' p.m.', '').replace(' a.m.', '')}–${fmt.hour(hot[hot.length - 1].hour + 1)}`;
    guidance = peak.band === 'danger'
      ? `Danger heat ${window}: add electrolytes, run all fans, wet the roof and avoid handling birds.`
      : `High heat ${window}: add electrolytes, increase ventilation.`;
  } else if (peak.band === 'warm') {
    guidance = 'Warm afternoon. Make sure every drinker is flowing.';
  }
  return { hours, peak, current, window, guidance, updatedAt: w.updatedAt };
}

/* ───────────────────────────── Business ───────────────────────────── */

export const saleTotal = (x: Sale) => x.qty * x.unitPrice;
export const saleStatus = (x: Sale) => (x.paid >= saleTotal(x) - 0.005 ? 'paid' : x.paid > 0 ? 'partial' : 'owed');

export function monthFinance(s: FarmState, day: Day = today()) {
  const m = monthKey(day);
  const sales = s.sales.filter((x) => monthKey(x.day) === m);
  const expenses = s.expenses.filter((x) => monthKey(x.day) === m);
  const revenue = sales.reduce((n, x) => n + saleTotal(x), 0);
  const spent = expenses.reduce((n, x) => n + x.amount, 0);
  const owed = s.sales.reduce((n, x) => n + Math.max(0, saleTotal(x) - x.paid), 0);
  const birds = activeFlocks(s).reduce((n, f) => n + aliveOn(s, f, day), 0);

  // Cost per egg: costs tagged to laying flocks plus their share of farm-wide costs.
  const laying = activeFlocks(s).filter((f) => isLaying(f, day));
  const layingIds = new Set(laying.map((f) => f.id));
  const layingBirds = laying.reduce((n, f) => n + aliveOn(s, f, day), 0);
  const layerCosts =
    expenses.filter((e) => e.flockId && layingIds.has(e.flockId)).reduce((n, e) => n + e.amount, 0) +
    expenses.filter((e) => !e.flockId && e.category !== 'feed').reduce((n, e) => n + e.amount, 0) * (layingBirds / Math.max(1, birds));
  const monthEggs = s.eggs.filter((e) => monthKey(e.day) === m && layingIds.has(e.flockId)).reduce((n, e) => n + eggTotal(e), 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

  return {
    revenue,
    spent,
    profit: revenue - spent,
    owed,
    costPerEgg: monthEggs > 0 ? layerCosts / monthEggs : undefined,
    profitPerBird: birds > 0 ? (revenue - spent) / birds : 0,
    sales: [...sales].sort((a, b) => (a.day < b.day ? 1 : -1)),
    expenses: [...expenses].sort((a, b) => (a.day < b.day ? 1 : -1)),
    byCategory,
    monthEggs,
  };
}

export function customerBalances(s: FarmState, day: Day = today()) {
  return s.customers
    .map((c) => {
      const sales = s.sales.filter((x) => x.customerId === c.id);
      const owed = sales.reduce((n, x) => n + Math.max(0, saleTotal(x) - x.paid), 0);
      const last = sales.map((x) => x.day).sort().pop();
      const reorderDue = !!(c.cadenceDays && last && daysBetween(last, day) >= c.cadenceDays);
      return { ...c, owed, last, reorderDue, total: sales.reduce((n, x) => n + saleTotal(x), 0) };
    })
    .sort((a, b) => b.owed - a.owed || Number(b.reorderDue) - Number(a.reorderDue));
}

/* ───────────────────────────── Hatchery ───────────────────────────── */

export const HATCH_MILESTONES: { day: number; label: 'Candle' | 'Lockdown' | 'Hatch' }[] = [
  { day: 7, label: 'Candle' },
  { day: 14, label: 'Candle' },
  { day: 18, label: 'Lockdown' },
  { day: 21, label: 'Hatch' },
];

export function incubatorStatus(inc: Incubator, day: Day = today()) {
  const d = Math.max(0, daysBetween(inc.setOn, day));
  const next = HATCH_MILESTONES.find((m) => m.day > d) ?? HATCH_MILESTONES[3];
  const latest = inc.candling[inc.candling.length - 1];
  const fertile = latest?.fertile ?? inc.eggs;
  const hatchAt = new Date(addDays(inc.setOn, 21) + 'T06:00:00');
  const ms = Math.max(0, hatchAt.getTime() - Date.now());
  const hatchIn = { days: Math.floor(ms / 86_400_000), hours: Math.floor((ms % 86_400_000) / 3_600_000) };
  return {
    day: d,
    next,
    fertile,
    fertility: inc.eggs ? fertile / inc.eggs : 0,
    hatchability: inc.hatched !== undefined && fertile ? inc.hatched / fertile : undefined,
    hatchIn,
    lockdown: d >= 18,
  };
}

/* ───────────────────────────── Close the Coop ───────────────────────────── */

export function daySummary(s: FarmState, day: Day = today()) {
  const tasks = s.tasks.filter((t) => t.day === day);
  return {
    eggs: eggsOn(s, day),
    losses: lossesOn(s, day),
    tasksDone: tasks.filter((t) => t.doneAt).length,
    tasksTotal: tasks.length,
    vaccines: s.vaccinations.filter((v) => v.doneOn === day).length,
    sales: s.sales.filter((x) => x.day === day).reduce((n, x) => n + saleTotal(x), 0),
  };
}

export function breedFor(f: Flock): Breed {
  return breedById(f.breedId);
}
