export type FarmType = 'layers' | 'broilers' | 'indigenous' | 'ducks' | 'turkeys' | 'quail' | 'hatchery';
export type Species = 'layer' | 'broiler' | 'indigenous' | 'duck' | 'turkey' | 'quail';
export type HouseType = 'deep-litter' | 'cage' | 'free-range';
export type Role = 'owner' | 'manager' | 'worker' | 'vet';
export type Slot = 'morning' | 'midday' | 'evening';
export type LossCause = 'disease' | 'predator' | 'heat' | 'culled' | 'unknown';
export type VaccineRoute = 'water' | 'eye-drop' | 'injection' | 'wing-web' | 'spray';
export type PaymentStatus = 'paid' | 'partial' | 'owed';
export type PaymentMethod = 'cash' | 'bank' | 'mobile';
export type SaleItem = 'eggs' | 'live' | 'dressed' | 'manure' | 'spent';
export type ExpenseCategory = 'feed' | 'chicks' | 'vaccines' | 'labor' | 'utilities' | 'equipment';
export type Appearance = 'system' | 'light' | 'dawn';
export type Language = 'en' | 'sw' | 'fr';

/** ISO calendar day, local time: "2026-10-10" */
export type Day = string;

export interface Person {
  id: string;
  name: string;
  role: Role;
  phone?: string;
}

export interface House {
  id: string;
  name: string;
  capacity: number;
  type: HouseType;
  quarantine?: boolean;
}

export interface Flock {
  id: string;
  houseId: string;
  breedId: string;
  /** Day the birds were day-old (age 0). Age is derived from this. */
  hatchedOn: Day;
  placedCount: number;
  status: 'active' | 'archived';
  archivedOn?: Day;
  note?: string;
}

export interface EggLog {
  id: string;
  flockId: string;
  day: Day;
  at: string;
  by: string;
  large: number;
  medium: number;
  small: number;
  cracked: number;
  dirty: number;
}

export interface LossLog {
  id: string;
  flockId: string;
  day: Day;
  count: number;
  cause: LossCause;
  note?: string;
  by: string;
}

export interface FeedLog {
  id: string;
  flockId: string;
  day: Day;
  kg: number;
}

export interface WaterLog {
  id: string;
  flockId: string;
  day: Day;
  litres: number;
}

export interface WeightLog {
  id: string;
  flockId: string;
  day: Day;
  avgKg: number;
  sample: number;
  uniformity?: number;
}

export interface Vaccination {
  id: string;
  flockId: string;
  name: string;
  disease: string;
  ageDay: number;
  route: VaccineRoute;
  dose: string;
  doneOn?: Day;
  by?: string;
}

export interface Treatment {
  id: string;
  flockId: string;
  drug: string;
  reason: string;
  start: Day;
  days: number;
  withdrawalUntil: Day;
}

export interface FeedStock {
  id: string;
  name: string;
  kgOnHand: number;
  capacityKg: number;
  flockIds: string[];
  supplierId?: string;
  pricePerKg: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  sells: string;
}

export interface Task {
  id: string;
  day: Day;
  title: string;
  detail?: string;
  slot: Slot;
  assignee: string;
  flockId?: string;
  kind: 'vaccine' | 'feed' | 'water' | 'eggs' | 'clean' | 'check' | 'biosecurity' | 'hatchery';
  vaccinationId?: string;
  doneAt?: string;
  doneBy?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  /** Typical days between orders, used for reorder nudges. */
  cadenceDays?: number;
}

export interface Sale {
  id: string;
  day: Day;
  customerId: string;
  item: SaleItem;
  flockId?: string;
  qty: number;
  unitPrice: number;
  paid: number;
  method: PaymentMethod;
}

export interface Expense {
  id: string;
  day: Day;
  category: ExpenseCategory;
  amount: number;
  note: string;
  flockId?: string;
  /** Photo of the paper receipt, kept on the phone. */
  receiptUri?: string;
}

export interface Candling {
  day: number;
  fertile: number;
  clear: number;
  deadInShell: number;
}

export interface Incubator {
  id: string;
  name: string;
  eggs: number;
  setOn: Day;
  tempC: number;
  humidity: number;
  candling: Candling[];
  hatched?: number;
}

export interface Note {
  id: string;
  day: Day;
  at: string;
  text: string;
  flockId?: string;
  by: string;
}

export interface Photo {
  id: string;
  flockId: string;
  uri: string;
  day: Day;
}

export interface Visitor {
  id: string;
  name: string;
  purpose: string;
  at: string;
  otherFarmRecently: boolean;
}

export interface Settings {
  currency: string;
  weightUnit: 'kg' | 'lb';
  tempUnit: 'C' | 'F';
  appearance: Appearance;
  language: Language;
  workerMode: boolean;
  /** Who is using this device. Worker mode shows only this person's tasks. */
  meId: string;
  offline: boolean;
}

export interface Weather {
  /** Hourly forecast from 5 a.m. to 9 p.m. */
  hours: { hour: number; tempC: number; humidity: number }[];
  updatedAt: string;
}

export interface FarmState {
  version: 1;
  onboarded: boolean;
  isSample: boolean;
  farmName: string;
  farmTypes: FarmType[];
  people: Person[];
  houses: House[];
  flocks: Flock[];
  eggs: EggLog[];
  losses: LossLog[];
  feed: FeedLog[];
  water: WaterLog[];
  weights: WeightLog[];
  vaccinations: Vaccination[];
  treatments: Treatment[];
  stocks: FeedStock[];
  suppliers: Supplier[];
  tasks: Task[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  incubators: Incubator[];
  notes: Note[];
  photos: Photo[];
  visitors: Visitor[];
  biosecurity: Record<Day, Record<string, boolean>>;
  dismissedAlerts: Record<Day, string[]>;
  coopClosed: Day[];
  weather?: Weather;
  settings: Settings;
  sync: { pending: number; lastSyncedAt?: string };
}
