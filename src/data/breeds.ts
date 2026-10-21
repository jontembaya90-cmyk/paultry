import type { Species, VaccineRoute } from './types';

type Curve = [x: number, y: number][];

export interface Stage {
  name: string;
  startDay: number;
  icon: 'chick' | 'brooding' | 'grower' | 'lay' | 'peak' | 'market' | 'end';
}

export interface Breed {
  id: string;
  name: string;
  species: Species;
  /** Short line shown in the breed picker. */
  blurb: string;
  /** Lay rate (0–1) by age in weeks. Absent for meat breeds. */
  lay?: Curve;
  /** Average body weight (kg) by age in days. */
  weight: Curve;
  /** Feed intake (kg/bird/day) by age in days. */
  feed: Curve;
  /** Litres of water per kg of feed. */
  waterRatio: number;
  marketDay?: number;
  stages: Stage[];
}

export function interpolate(curve: Curve, x: number): number {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i];
    if (x <= x1) {
      const [x0, y0] = curve[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return curve[curve.length - 1][1];
}

const layerStages: Stage[] = [
  { name: 'Day-old chick', startDay: 0, icon: 'chick' },
  { name: 'Brooding', startDay: 1, icon: 'brooding' },
  { name: 'Grower', startDay: 42, icon: 'grower' },
  { name: 'Point of lay', startDay: 126, icon: 'lay' },
  { name: 'Peak lay', startDay: 168, icon: 'peak' },
  { name: 'Laying', startDay: 252, icon: 'lay' },
  { name: 'End of lay', startDay: 504, icon: 'end' },
];

const broilerStages = (market: number): Stage[] => [
  { name: 'Day-old chick', startDay: 0, icon: 'chick' },
  { name: 'Brooding', startDay: 1, icon: 'brooding' },
  { name: 'Grower', startDay: 14, icon: 'grower' },
  { name: 'Finisher', startDay: 25, icon: 'peak' },
  { name: 'Market', startDay: market, icon: 'market' },
];

const dualStages: Stage[] = [
  { name: 'Day-old chick', startDay: 0, icon: 'chick' },
  { name: 'Brooding', startDay: 1, icon: 'brooding' },
  { name: 'Grower', startDay: 42, icon: 'grower' },
  { name: 'Point of lay', startDay: 140, icon: 'lay' },
  { name: 'Laying', startDay: 168, icon: 'peak' },
  { name: 'End of lay', startDay: 504, icon: 'end' },
];

const brownLayerLay: Curve = [
  [17, 0], [18, 0.05], [19, 0.2], [20, 0.5], [21, 0.75], [22, 0.86], [24, 0.92], [26, 0.95],
  [28, 0.958], [32, 0.958], [40, 0.94], [50, 0.91], [60, 0.87], [72, 0.82], [80, 0.78],
];
const brownLayerWeight: Curve = [
  [0, 0.037], [28, 0.29], [56, 0.65], [84, 1.0], [112, 1.35], [140, 1.65], [224, 1.95], [504, 2.05],
];
const layerFeed: Curve = [
  [0, 0.012], [7, 0.015], [14, 0.025], [28, 0.042], [56, 0.058], [84, 0.072], [112, 0.083],
  [140, 0.1], [168, 0.112], [224, 0.115], [504, 0.118],
];

const cobbWeight: Curve = [
  [0, 0.042], [7, 0.185], [14, 0.48], [21, 0.95], [24, 1.2], [28, 1.55], [35, 2.2], [42, 2.85],
];
const broilerFeed: Curve = [
  [0, 0.015], [7, 0.035], [14, 0.07], [21, 0.115], [24, 0.13], [28, 0.155], [35, 0.19], [42, 0.21],
];

const dualLay: Curve = [[19, 0], [20, 0.1], [24, 0.4], [30, 0.55], [50, 0.45], [72, 0.35]];
const dualWeight: Curve = [[0, 0.04], [28, 0.35], [56, 1.0], [84, 1.6], [112, 2.1], [126, 2.3], [168, 2.8], [504, 3.0]];
const dualFeed: Curve = [[0, 0.012], [28, 0.04], [56, 0.06], [84, 0.075], [126, 0.09], [168, 0.11], [504, 0.115]];

export const BREEDS: Breed[] = [
  {
    id: 'lohmann-brown', name: 'Lohmann Brown', species: 'layer', blurb: 'Brown eggs · calm · ~320 eggs/year',
    lay: brownLayerLay, weight: brownLayerWeight, feed: layerFeed, waterRatio: 2, stages: layerStages,
  },
  {
    id: 'isa-brown', name: 'ISA Brown', species: 'layer', blurb: 'Brown eggs · hardy · early peak',
    lay: brownLayerLay.map(([w, r]) => [w, Math.min(0.96, r * 1.005)]), weight: brownLayerWeight, feed: layerFeed,
    waterRatio: 2, stages: layerStages,
  },
  {
    id: 'hyline-brown', name: 'Hy-Line Brown', species: 'layer', blurb: 'Brown eggs · strong persistency',
    lay: brownLayerLay, weight: brownLayerWeight, feed: layerFeed, waterRatio: 2, stages: layerStages,
  },
  {
    id: 'cobb-500', name: 'Cobb 500', species: 'broiler', blurb: 'Fast growth · efficient FCR · market at day 35',
    weight: cobbWeight, feed: broilerFeed, waterRatio: 2, marketDay: 35, stages: broilerStages(35),
  },
  {
    id: 'ross-308', name: 'Ross 308', species: 'broiler', blurb: 'Robust · high yield · market at day 35–42',
    weight: cobbWeight.map(([d, w]) => [d, w * 1.02]), feed: broilerFeed, waterRatio: 2, marketDay: 38,
    stages: broilerStages(38),
  },
  {
    id: 'kuroiler', name: 'Kuroiler', species: 'indigenous', blurb: 'Dual-purpose · free-range · scavenges well',
    lay: dualLay, weight: dualWeight, feed: dualFeed, waterRatio: 2, stages: dualStages,
  },
  {
    // The id stays 'sasso' so flocks saved before the rename keep their breed.
    id: 'sasso', name: 'Sasso F1', species: 'indigenous', blurb: 'Improved kienyeji · fast-growing · meat and eggs',
    lay: dualLay, weight: dualWeight.map(([d, w]) => [d, w * 0.95]), feed: dualFeed, waterRatio: 2, stages: dualStages,
  },
  {
    id: 'kenbro', name: 'Kenbro', species: 'indigenous', blurb: 'Improved kienyeji · bred in Kenya · meat and eggs',
    lay: dualLay, weight: dualWeight, feed: dualFeed, waterRatio: 2, stages: dualStages,
  },
  {
    id: 'pekin', name: 'Pekin duck', species: 'duck', blurb: 'Meat duck · market at about 7 weeks',
    weight: [[0, 0.055], [14, 0.7], [28, 2.0], [42, 3.2], [49, 3.5]],
    feed: [[0, 0.02], [14, 0.1], [28, 0.18], [49, 0.23]], waterRatio: 3, marketDay: 49, stages: broilerStages(49),
  },
  {
    id: 'khaki-campbell', name: 'Khaki Campbell', species: 'duck', blurb: 'Laying duck · ~300 eggs/year',
    lay: [[19, 0], [20, 0.3], [26, 0.85], [52, 0.75], [72, 0.6]],
    weight: [[0, 0.05], [56, 1.3], [140, 2.0], [504, 2.2]], feed: [[0, 0.02], [56, 0.12], [140, 0.16], [504, 0.17]],
    waterRatio: 3, stages: layerStages,
  },
  {
    id: 'bronze-turkey', name: 'Broad Breasted Bronze', species: 'turkey', blurb: 'Heavy turkey · market at ~20 weeks',
    weight: [[0, 0.06], [28, 0.9], [56, 3.0], [84, 6.0], [112, 9.0], [140, 12.0]],
    feed: [[0, 0.02], [28, 0.08], [56, 0.18], [84, 0.3], [140, 0.45]], waterRatio: 2, marketDay: 140,
    stages: [
      { name: 'Poult', startDay: 0, icon: 'chick' },
      { name: 'Brooding', startDay: 1, icon: 'brooding' },
      { name: 'Grower', startDay: 42, icon: 'grower' },
      { name: 'Finisher', startDay: 112, icon: 'peak' },
      { name: 'Market', startDay: 140, icon: 'market' },
    ],
  },
  {
    id: 'japanese-quail', name: 'Japanese quail', species: 'quail', blurb: 'Lays from week 6 · small footprint',
    lay: [[5, 0], [6, 0.5], [8, 0.85], [20, 0.8], [52, 0.6]],
    weight: [[0, 0.008], [14, 0.08], [28, 0.16], [42, 0.2], [365, 0.22]],
    feed: [[0, 0.004], [14, 0.012], [28, 0.02], [42, 0.025], [365, 0.026]], waterRatio: 2,
    stages: [
      { name: 'Chick', startDay: 0, icon: 'chick' },
      { name: 'Brooding', startDay: 1, icon: 'brooding' },
      { name: 'Grower', startDay: 21, icon: 'grower' },
      { name: 'Laying', startDay: 42, icon: 'lay' },
    ],
  },
];

export function breedById(id: string): Breed {
  return BREEDS.find((b) => b.id === id) ?? BREEDS[0];
}

export const SPECIES_LABEL: Record<Species, { one: string; many: string }> = {
  layer: { one: 'hen', many: 'hens' },
  broiler: { one: 'broiler', many: 'broilers' },
  indigenous: { one: 'bird', many: 'birds' },
  duck: { one: 'duck', many: 'ducks' },
  turkey: { one: 'turkey', many: 'turkeys' },
  quail: { one: 'quail', many: 'quail' },
};

export interface VaccineTemplate {
  ageDay: number;
  name: string;
  disease: string;
  route: VaccineRoute;
  dose: string;
}

const ND_IB_EYE: VaccineTemplate = {
  ageDay: 7, name: 'Newcastle + IB', disease: 'Newcastle disease and infectious bronchitis', route: 'eye-drop', dose: '1 drop per bird',
};
const GUMBORO = (ageDay: number, booster = false): VaccineTemplate => ({
  ageDay, name: booster ? 'Gumboro booster' : 'Gumboro', disease: 'Infectious bursal disease', route: 'water', dose: '1 dose per bird',
});
const LASOTA = (ageDay: number, booster = false): VaccineTemplate => ({
  ageDay, name: booster ? 'Newcastle booster' : 'Newcastle (LaSota)', disease: 'Newcastle disease', route: 'water', dose: '1 dose per bird',
});
const MAREKS: VaccineTemplate = {
  ageDay: 1, name: "Marek's", disease: "Marek's disease", route: 'injection', dose: '0.2 ml under the skin',
};
const POX = (ageDay: number): VaccineTemplate => ({
  ageDay, name: 'Fowl pox', disease: 'Fowl pox', route: 'wing-web', dose: '1 stab per bird',
});
const TYPHOID = (ageDay: number): VaccineTemplate => ({
  ageDay, name: 'Fowl typhoid', disease: 'Fowl typhoid', route: 'injection', dose: '0.5 ml into the muscle',
});

/** A generic programme. The vaccination screen reminds farmers to confirm it with their vet. */
export function vaccineSchedule(species: Species): VaccineTemplate[] {
  switch (species) {
    case 'layer': {
      const base = [
        MAREKS, ND_IB_EYE, GUMBORO(14), LASOTA(21), GUMBORO(28, true), POX(42), LASOTA(56, true), TYPHOID(84),
        { ageDay: 112, name: 'ND + IB + EDS', disease: 'Newcastle, bronchitis and egg drop syndrome', route: 'injection', dose: '0.5 ml into the muscle' } as VaccineTemplate,
      ];
      for (let d = 168; d <= 504; d += 56) base.push(LASOTA(d, true));
      return base;
    }
    case 'broiler':
      return [ND_IB_EYE, GUMBORO(14), LASOTA(21), GUMBORO(28, true)];
    case 'indigenous': {
      const base = [MAREKS, ND_IB_EYE, GUMBORO(14), LASOTA(21), GUMBORO(28, true), POX(42), LASOTA(56, true), TYPHOID(70)];
      for (let d = 146; d <= 504; d += 90) base.push(LASOTA(d, true));
      return base;
    }
    case 'duck':
      return [
        { ageDay: 1, name: 'Duck hepatitis', disease: 'Duck viral hepatitis', route: 'injection', dose: '0.5 ml under the skin' },
        { ageDay: 28, name: 'Duck plague', disease: 'Duck viral enteritis', route: 'injection', dose: '0.5 ml into the muscle' },
      ];
    case 'turkey':
      return [ND_IB_EYE, LASOTA(21), POX(56), { ageDay: 56, name: 'Fowl cholera', disease: 'Fowl cholera', route: 'injection', dose: '0.5 ml under the skin' }];
    case 'quail':
      return [{ ...ND_IB_EYE, name: 'Newcastle', disease: 'Newcastle disease' }, LASOTA(21, true)];
  }
}

export const ROUTE_LABEL: Record<VaccineRoute, string> = {
  water: 'Drinking water',
  'eye-drop': 'Eye drop',
  injection: 'Injection',
  'wing-web': 'Wing web',
  spray: 'Spray',
};
