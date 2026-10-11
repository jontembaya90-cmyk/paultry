import { breedById, interpolate, vaccineSchedule } from './breeds';
import { addDays, daysBetween, today } from './format';
import type {
  EggLog,
  Expense,
  FarmState,
  FeedLog,
  Flock,
  LossLog,
  Sale,
  Settings,
  Task,
  Vaccination,
  WaterLog,
  WeightLog,
} from './types';

/** Deterministic noise so the sample farm looks the same on every launch. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const defaultSettings: Settings = {
  currency: '$',
  weightUnit: 'kg',
  tempUnit: 'C',
  appearance: 'system',
  language: 'en',
  workerMode: false,
  meId: 'amina',
  offline: false,
};

export function emptyFarm(): FarmState {
  return {
    version: 1,
    onboarded: false,
    isSample: false,
    farmName: '',
    farmTypes: [],
    people: [],
    houses: [],
    flocks: [],
    eggs: [],
    losses: [],
    feed: [],
    water: [],
    weights: [],
    vaccinations: [],
    treatments: [],
    stocks: [],
    suppliers: [],
    tasks: [],
    customers: [],
    sales: [],
    expenses: [],
    incubators: [],
    notes: [],
    photos: [],
    visitors: [],
    biosecurity: {},
    dismissedAlerts: {},
    coopClosed: [],
    settings: defaultSettings,
    sync: { pending: 0 },
  };
}

export function scheduleFor(flock: Flock, now: string): Vaccination[] {
  const breed = breedById(flock.breedId);
  const age = daysBetween(flock.hatchedOn, now);
  return vaccineSchedule(breed.species).map((v, i) => {
    // Anything before the flock was placed with us is assumed done at the hatchery.
    const done = v.ageDay < age;
    return {
      id: `${flock.id}_vac_${i}`,
      flockId: flock.id,
      name: v.name,
      disease: v.disease,
      ageDay: v.ageDay,
      route: v.route,
      dose: v.dose,
      doneOn: done ? addDays(flock.hatchedOn, v.ageDay) : undefined,
    };
  });
}

export function sampleFarm(): FarmState {
  const t = today();
  const r = rng(42);
  const noise = (spread: number) => 1 + (r() - 0.5) * 2 * spread;

  const flocks: Flock[] = [
    { id: 'flock_a', houseId: 'house_a', breedId: 'lohmann-brown', hatchedOn: addDays(t, -224), placedCount: 1217, status: 'active' },
    { id: 'flock_b', houseId: 'house_b', breedId: 'cobb-500', hatchedOn: addDays(t, -24), placedCount: 2038, status: 'active' },
    { id: 'flock_c', houseId: 'house_c', breedId: 'kuroiler', hatchedOn: addDays(t, -126), placedCount: 362, status: 'active' },
    {
      id: 'flock_b7', houseId: 'house_b', breedId: 'cobb-500', hatchedOn: addDays(t, -82), placedCount: 2000,
      status: 'archived', archivedOn: addDays(t, -47), note: 'Sold at day 35 · avg 2.21 kg · FCR 1.58',
    },
  ];

  // Losses, spread mostly across the early weeks, as in real flocks.
  const losses: LossLog[] = [];
  const spreadLosses = (flock: Flock, total: number, todayCount: number) => {
    const age = daysBetween(flock.hatchedOn, t);
    let left = total - todayCount;
    let i = 0;
    while (left > 0) {
      const ageDay = Math.min(age - 1, Math.floor(Math.pow(r(), 2.2) * age) + 1);
      const n = Math.min(left, 1 + Math.floor(r() * 2));
      const causes = ['unknown', 'disease', 'heat', 'culled', 'predator'] as const;
      losses.push({
        id: `${flock.id}_loss_${i++}`, flockId: flock.id, day: addDays(flock.hatchedOn, ageDay), count: n,
        cause: causes[Math.floor(r() * (flock.id === 'flock_c' ? 5 : 4))], by: 'grace',
      });
      left -= n;
    }
  };
  spreadLosses(flocks[0], 17, 0);
  spreadLosses(flocks[1], 38, 2);
  spreadLosses(flocks[2], 12, 0);
  losses.push(
    { id: 'loss_today_1', flockId: 'flock_b', day: t, count: 1, cause: 'heat', by: 'peter', note: 'Found near the back wall' },
    { id: 'loss_today_2', flockId: 'flock_b', day: t, count: 1, cause: 'unknown', by: 'peter' },
  );

  const aliveOn = (flock: Flock, day: string) =>
    flock.placedCount - losses.filter((l) => l.flockId === flock.id && l.day <= day).reduce((s, l) => s + l.count, 0);

  // Eggs: 90 days of history for House A, following the breed curve.
  const eggs: EggLog[] = [];
  const breedA = breedById('lohmann-brown');
  for (let d = -90; d < 0; d++) {
    const day = addDays(t, d);
    const age = 224 + d;
    const total = Math.round(aliveOn(flocks[0], day) * interpolate(breedA.lay!, age / 7) * 0.965 * noise(0.018));
    eggs.push(gradeLog(`egg_a_${d}`, 'flock_a', day, `${day}T07:00:00`, 'grace', total, r));
  }
  eggs.push(
    { id: 'egg_a_today_1', flockId: 'flock_a', day: t, at: `${t}T06:40:00`, by: 'grace', large: 352, medium: 176, small: 44, cracked: 18, dirty: 10 },
    { id: 'egg_a_today_2', flockId: 'flock_a', day: t, at: `${t}T11:50:00`, by: 'peter', large: 288, medium: 154, small: 42, cracked: 12, dirty: 8 },
  );

  // Feed and water: 30 days per active flock.
  const feed: FeedLog[] = [];
  const water: WaterLog[] = [];
  for (const flock of flocks.filter((f) => f.status === 'active')) {
    const breed = breedById(flock.breedId);
    const age = daysBetween(flock.hatchedOn, t);
    const overeat = flock.id === 'flock_b' ? 1.06 : 1;
    for (let d = -Math.min(age, 30); d < 0; d++) {
      const day = addDays(t, d);
      const kg = aliveOn(flock, day) * interpolate(breed.feed, age + d) * overeat * noise(0.03);
      feed.push({ id: `${flock.id}_feed_${d}`, flockId: flock.id, day, kg: Math.round(kg) });
      water.push({ id: `${flock.id}_water_${d}`, flockId: flock.id, day, litres: Math.round(kg * breed.waterRatio * noise(0.03)) });
    }
  }
  // Earlier broiler life (before the 30-day window does not apply: age 24) is covered above.
  feed.push(
    { id: 'feed_a_today', flockId: 'flock_a', day: t, kg: 136 },
    { id: 'feed_b_today', flockId: 'flock_b', day: t, kg: 266 },
    { id: 'feed_c_today', flockId: 'flock_c', day: t, kg: 31 },
  );
  // House B: water down 18% since yesterday. That is the morning's lead alert.
  const yB = water.find((w) => w.flockId === 'flock_b' && w.day === addDays(t, -1));
  if (yB) yB.litres = 519;
  water.push(
    { id: 'water_a_today', flockId: 'flock_a', day: t, litres: 268 },
    { id: 'water_b_today', flockId: 'flock_b', day: t, litres: 426 },
    { id: 'water_c_today', flockId: 'flock_c', day: t, litres: 61 },
  );

  const weights: WeightLog[] = [
    { id: 'w_b_7', flockId: 'flock_b', day: addDays(t, -17), avgKg: 0.18, sample: 50, uniformity: 0.86 },
    { id: 'w_b_14', flockId: 'flock_b', day: addDays(t, -10), avgKg: 0.47, sample: 50, uniformity: 0.84 },
    { id: 'w_b_21', flockId: 'flock_b', day: addDays(t, -3), avgKg: 0.93, sample: 50, uniformity: 0.83 },
    { id: 'w_b_24', flockId: 'flock_b', day: t, avgKg: 1.18, sample: 60, uniformity: 0.82 },
    { id: 'w_a_210', flockId: 'flock_a', day: addDays(t, -14), avgKg: 1.94, sample: 40, uniformity: 0.88 },
    { id: 'w_c_112', flockId: 'flock_c', day: addDays(t, -14), avgKg: 2.02, sample: 30, uniformity: 0.74 },
    { id: 'w_c_126', flockId: 'flock_c', day: t, avgKg: 2.21, sample: 30, uniformity: 0.76 },
  ];

  const vaccinations = flocks.filter((f) => f.status === 'active').flatMap((f) => scheduleFor(f, t));

  const ndBooster = vaccinations.find((v) => v.flockId === 'flock_a' && v.ageDay === 224)!;

  const tasks: Task[] = [
    { id: 'task_1', day: t, slot: 'morning', title: 'Collect eggs', detail: 'House A', assignee: 'grace', flockId: 'flock_a', kind: 'eggs', doneAt: `${t}T06:40:00`, doneBy: 'grace' },
    { id: 'task_2', day: t, slot: 'morning', title: 'Morning feed', detail: 'All houses', assignee: 'peter', kind: 'feed', doneAt: `${t}T06:15:00`, doneBy: 'peter' },
    { id: 'task_3', day: t, slot: 'morning', title: 'Newcastle booster', detail: 'House A · drinking water · 1,200 doses', assignee: 'joseph', flockId: 'flock_a', kind: 'vaccine', vaccinationId: ndBooster.id },
    { id: 'task_4', day: t, slot: 'midday', title: 'Collect eggs', detail: 'House A', assignee: 'grace', flockId: 'flock_a', kind: 'eggs', doneAt: `${t}T11:50:00`, doneBy: 'peter' },
    { id: 'task_5', day: t, slot: 'midday', title: 'Electrolytes in water', detail: 'House B · before the 1 p.m. heat', assignee: 'peter', flockId: 'flock_b', kind: 'water' },
    { id: 'task_6', day: t, slot: 'midday', title: 'Check egg turning', detail: 'Incubator 1 · last day before lockdown', assignee: 'joseph', kind: 'hatchery' },
    { id: 'task_7', day: t, slot: 'evening', title: 'Collect eggs', detail: 'House A', assignee: 'grace', flockId: 'flock_a', kind: 'eggs' },
    { id: 'task_8', day: t, slot: 'evening', title: 'Bring birds in and lock up', detail: 'House C · free-range', assignee: 'peter', flockId: 'flock_c', kind: 'check' },
    { id: 'task_9', day: t, slot: 'evening', title: 'Biosecurity walk-round', detail: 'Footbaths, visitors, disposal', assignee: 'joseph', kind: 'biosecurity' },
  ];

  const sales: Sale[] = [
    { id: 'sale_1', day: addDays(t, -9), customerId: 'cust_kilimani', item: 'eggs', flockId: 'flock_a', qty: 120, unitPrice: 4.6, paid: 552, method: 'bank' },
    { id: 'sale_2', day: addDays(t, -8), customerId: 'cust_hassan', item: 'live', flockId: 'flock_c', qty: 150, unitPrice: 12, paid: 1500, method: 'cash' },
    { id: 'sale_3', day: addDays(t, -7), customerId: 'cust_njeri', item: 'eggs', flockId: 'flock_a', qty: 60, unitPrice: 4.6, paid: 276, method: 'mobile' },
    { id: 'sale_4', day: addDays(t, -6), customerId: 'cust_mavuno', item: 'manure', qty: 40, unitPrice: 5, paid: 200, method: 'mobile' },
    { id: 'sale_5', day: addDays(t, -4), customerId: 'cust_green', item: 'eggs', flockId: 'flock_a', qty: 120, unitPrice: 4.6, paid: 300, method: 'mobile' },
    { id: 'sale_6', day: addDays(t, -2), customerId: 'cust_wanjiku', item: 'live', qty: 1200, unitPrice: 1.2, paid: 1440, method: 'mobile' },
  ];
  // Sale 6 is day-old Kuroiler chicks from the last hatch. Total revenue: 4,820.

  const expenses: Expense[] = [
    { id: 'exp_1', day: addDays(t, -9), category: 'feed', amount: 1240, note: 'Broiler finisher · 2,000 kg' },
    { id: 'exp_2', day: addDays(t, -8), category: 'feed', amount: 690, note: 'Layer mash · 1,500 kg', flockId: 'flock_a' },
    { id: 'exp_3', day: addDays(t, -7), category: 'vaccines', amount: 85, note: 'Newcastle LaSota · 3 vials' },
    { id: 'exp_4', day: addDays(t, -5), category: 'equipment', amount: 430, note: '12 bell drinkers' },
    { id: 'exp_5', day: addDays(t, -3), category: 'utilities', amount: 145, note: 'Electricity and water' },
    { id: 'exp_6', day: addDays(t, -1), category: 'labor', amount: 600, note: 'Wages · Grace and Peter' },
  ];

  const s = emptyFarm();
  return {
    ...s,
    onboarded: true,
    isSample: true,
    farmName: 'Sunrise Poultry Farm',
    farmTypes: ['layers', 'broilers', 'indigenous', 'hatchery'],
    people: [
      { id: 'amina', name: 'Amina', role: 'owner', phone: '+254700000001' },
      { id: 'joseph', name: 'Joseph', role: 'manager', phone: '+254700000002' },
      { id: 'grace', name: 'Grace', role: 'worker', phone: '+254700000003' },
      { id: 'peter', name: 'Peter', role: 'worker', phone: '+254700000004' },
      { id: 'otieno', name: 'Dr. Otieno', role: 'vet', phone: '+254700000005' },
    ],
    houses: [
      { id: 'house_a', name: 'House A', capacity: 1400, type: 'cage' },
      { id: 'house_b', name: 'House B', capacity: 2400, type: 'deep-litter' },
      { id: 'house_c', name: 'House C', capacity: 500, type: 'free-range' },
    ],
    flocks,
    eggs,
    losses,
    feed,
    water,
    weights,
    vaccinations,
    treatments: [
      {
        id: 'treat_1', flockId: 'flock_c', drug: 'Oxytetracycline 20%', reason: 'Respiratory signs: sneezing in 12 birds',
        start: addDays(t, -6), days: 5, withdrawalUntil: addDays(t, 4),
      },
    ],
    stocks: [
      { id: 'stock_layer', name: 'Layer mash', kgOnHand: 840, capacityKg: 3000, flockIds: ['flock_a'], supplierId: 'sup_mavuno', pricePerKg: 0.46 },
      { id: 'stock_finisher', name: 'Broiler finisher', kgOnHand: 3560, capacityKg: 5000, flockIds: ['flock_b'], supplierId: 'sup_mavuno', pricePerKg: 0.62 },
      { id: 'stock_grower', name: 'Grower mash', kgOnHand: 700, capacityKg: 1000, flockIds: ['flock_c'], supplierId: 'sup_baraka', pricePerKg: 0.44 },
    ],
    suppliers: [
      { id: 'sup_mavuno', name: 'Mavuno Feeds', phone: '+254711000100', sells: 'Feed' },
      { id: 'sup_baraka', name: 'Baraka Agrovet', phone: '+254711000200', sells: 'Feed, vaccines, drugs' },
    ],
    tasks,
    customers: [
      { id: 'cust_kilimani', name: 'Kilimani Hotel', phone: '+254722000001', cadenceDays: 7 },
      { id: 'cust_njeri', name: "Mama Njeri's Shop", phone: '+254722000002', cadenceDays: 5 },
      { id: 'cust_green', name: 'Green Grocers Market', phone: '+254722000003', cadenceDays: 7 },
      { id: 'cust_hassan', name: 'Hassan Livestock Traders', phone: '+254722000004' },
      { id: 'cust_wanjiku', name: 'Wanjiku Farm Supplies', phone: '+254722000005' },
      { id: 'cust_mavuno', name: 'Kamau (garden)', phone: '+254722000006' },
    ],
    sales,
    expenses,
    incubators: [
      {
        id: 'inc_1', name: 'Incubator 1', eggs: 480, setOn: addDays(t, -17), tempC: 37.6, humidity: 62,
        candling: [
          { day: 7, fertile: 452, clear: 24, deadInShell: 4 },
          { day: 14, fertile: 446, clear: 24, deadInShell: 10 },
        ],
      },
    ],
    notes: [
      { id: 'note_1', day: addDays(t, -1), at: `${addDays(t, -1)}T17:20:00`, text: 'Two drinkers in House B leaking at the joint. Replaced one, the other needs a new valve.', flockId: 'flock_b', by: 'peter' },
    ],
    visitors: [
      { id: 'vis_1', name: 'Dr. Otieno', purpose: 'Routine health check, House C', at: `${addDays(t, -1)}T10:05:00`, otherFarmRecently: true },
    ],
    biosecurity: { [t]: { footbath: true } },
    weather: {
      updatedAt: `${t}T05:50:00`,
      hours: [
        [5, 17, 84], [6, 18, 82], [7, 20, 78], [8, 22, 74], [9, 25, 70], [10, 27, 66], [11, 29, 63], [12, 31, 61],
        [13, 33, 60], [14, 34, 60], [15, 34, 59], [16, 32, 58], [17, 29, 62], [18, 26, 71], [19, 23, 76], [20, 21, 80], [21, 20, 82],
      ].map(([hour, tempC, humidity]) => ({ hour, tempC, humidity })),
    },
    settings: { ...defaultSettings },
    sync: { pending: 0, lastSyncedAt: new Date().toISOString() },
  };
}

function gradeLog(id: string, flockId: string, day: string, at: string, by: string, total: number, r: () => number): EggLog {
  const cracked = Math.round(total * (0.022 + r() * 0.01));
  const dirty = Math.round(total * (0.012 + r() * 0.008));
  const small = Math.round(total * (0.075 + r() * 0.02));
  const medium = Math.round(total * (0.29 + r() * 0.04));
  const large = total - cracked - dirty - small - medium;
  return { id, flockId, day, at, by, large, medium, small, cracked, dirty };
}
