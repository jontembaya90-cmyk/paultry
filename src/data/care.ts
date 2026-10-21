import { breedById, interpolate, vaccineSchedule, type Breed, type VaccineTemplate } from './breeds';
import { addDays, daysBetween, today } from './format';
import type { Day, Flock, Language, Species, VaccineRoute } from './types';

/**
 * Care knowledge shown to farmers: what to feed from day-old, and what each vaccine is for.
 * Ages follow common East African feed-maker and vet guidance. Every screen that shows this
 * also tells the farmer to confirm with their vet and follow the label on the bag.
 */

type Text = { en: string; sw: string };
export const say = (text: Text, lang: Language) => (lang === 'sw' ? text.sw : text.en);

export type CareGroup = 'layers' | 'broilers' | 'kienyeji' | 'ducks' | 'turkeys' | 'quail';

export const CARE_GROUPS: { key: CareGroup; label: Text; species: Species; sample: string }[] = [
  { key: 'layers', label: { en: 'Layers', sw: 'Kuku wa mayai' }, species: 'layer', sample: 'lohmann-brown' },
  { key: 'broilers', label: { en: 'Broilers', sw: 'Kuku wa nyama' }, species: 'broiler', sample: 'cobb-500' },
  { key: 'kienyeji', label: { en: 'Improved kienyeji', sw: 'Kienyeji kilichoboreshwa' }, species: 'indigenous', sample: 'kenbro' },
  { key: 'ducks', label: { en: 'Ducks', sw: 'Bata' }, species: 'duck', sample: 'khaki-campbell' },
  { key: 'turkeys', label: { en: 'Turkeys', sw: 'Bata mzinga' }, species: 'turkey', sample: 'bronze-turkey' },
  { key: 'quail', label: { en: 'Quail', sw: 'Kware' }, species: 'quail', sample: 'japanese-quail' },
];

export const groupOf = (species: Species) => CARE_GROUPS.find((g) => g.species === species)!;

/* ───────────────────────────── Feeding ───────────────────────────── */

export interface FeedPhase {
  id: string;
  name: Text;
  /** First and last day of age on this feed. `to` absent: until the end of the flock. */
  from: number;
  to?: number;
  protein: string;
  note: Text;
}

const CHICK_MASH: Omit<FeedPhase, 'from' | 'to'> = {
  id: 'chick-mash',
  name: { en: 'Chick mash', sw: 'Chick mash (chakula cha vifaranga)' },
  protein: '18–20%',
  note: {
    en: 'Spread on trays or paper for the first 3 days, then chick feeders. Give little and often so it stays fresh.',
    sw: 'Mwaga kwenye trei au karatasi kwa siku 3 za kwanza, kisha tumia vilishio vya vifaranga. Toa kidogo kidogo mara nyingi ili kibaki kibichi.',
  },
};

const GROWERS_MASH: Omit<FeedPhase, 'from' | 'to'> = {
  id: 'growers-mash',
  name: { en: 'Growers mash', sw: 'Growers mash (chakula cha kukuza)' },
  protein: '15–16%',
  note: {
    en: 'Builds a strong frame without fat. Do not start layers mash early: its extra calcium harms young birds’ kidneys.',
    sw: 'Hujenga mwili imara bila mafuta. Usianze layers mash mapema: kalsiamu yake ya ziada huharibu figo za kuku wachanga.',
  },
};

const LAYERS_MASH: Omit<FeedPhase, 'from' | 'to'> = {
  id: 'layers-mash',
  name: { en: 'Layers mash', sw: 'Layers mash (chakula cha kutaga)' },
  protein: '16–18%',
  note: {
    en: 'Start when the first eggs appear. Extra calcium makes strong shells: also offer crushed oyster shell or grit on the side.',
    sw: 'Anza mayai ya kwanza yanapoonekana. Kalsiamu ya ziada hufanya maganda imara: weka pia magamba ya chaza au changarawe pembeni.',
  },
};

function phases(breed: Breed): FeedPhase[] {
  const market = breed.marketDay;
  switch (breed.species) {
    case 'layer':
      return [
        { ...CHICK_MASH, from: 0, to: 55 },
        { ...GROWERS_MASH, from: 56, to: 125 },
        { ...LAYERS_MASH, from: 126 },
      ];
    case 'broiler':
      return [
        {
          id: 'broiler-starter', name: { en: 'Broiler starter', sw: 'Broiler starter' }, from: 0, to: 13, protein: '22–23%',
          note: {
            en: 'Crumbs, always available. Fast early growth sets the final weight, so never let feeders run empty.',
            sw: 'Chembechembe, ziwepo muda wote. Ukuaji wa haraka mwanzoni huamua uzito wa mwisho, kwa hiyo vilishio visiwe tupu kamwe.',
          },
        },
        {
          id: 'broiler-grower', name: { en: 'Broiler grower', sw: 'Broiler grower' }, from: 14, to: 24, protein: '20–21%',
          note: {
            en: 'Many farmers skip this and give starter to day 21, then finisher. Both work.',
            sw: 'Wafugaji wengi huruka hiki na kutoa starter hadi siku 21, kisha finisher. Njia zote mbili zinafaa.',
          },
        },
        {
          id: 'broiler-finisher', name: { en: 'Broiler finisher', sw: 'Broiler finisher' }, from: 25, to: market, protein: '18–19%',
          note: {
            en: 'Pellets until sale. Check the bag: medicated feed has days to wait before the birds can be sold.',
            sw: 'Pelleti hadi kuuza. Soma mfuko: chakula chenye dawa kina siku za kusubiri kabla ya kuuza kuku.',
          },
        },
      ];
    case 'indigenous':
      return [
        { ...CHICK_MASH, from: 0, to: 55 },
        {
          ...GROWERS_MASH, from: 56, to: 139,
          note: {
            en: 'Cockerels for meat can stay on growers mash until sale at 4–5 months. Free-range birds scavenge part of the day, but still need about two thirds of the ration.',
            sw: 'Majogoo wa nyama wanaweza kubaki kwenye growers mash hadi kuuzwa miezi 4–5. Kuku wa huria hujitafutia sehemu ya siku, lakini bado wanahitaji karibu theluthi mbili ya chakula.',
          },
        },
        { ...LAYERS_MASH, from: 140 },
      ];
    case 'duck':
      return [
        {
          id: 'duck-starter', name: { en: 'Duck starter', sw: 'Duck starter (chakula cha vifaranga vya bata)' }, from: 0, to: 20, protein: '20–22%',
          note: {
            en: 'Use duck starter, or plain (unmedicated) chick mash: some medicines in chick feed are not safe for ducklings. Water deep enough to dip the whole head.',
            sw: 'Tumia duck starter, au chick mash isiyo na dawa: baadhi ya dawa kwenye chakula cha vifaranga si salama kwa bata. Maji yawe na kina cha kuzamisha kichwa kizima.',
          },
        },
        ...(breed.lay
          ? [
              { ...GROWERS_MASH, from: 21, to: 132 },
              { ...LAYERS_MASH, from: 133 },
            ]
          : [
              {
                id: 'duck-finisher', name: { en: 'Duck grower-finisher', sw: 'Duck grower-finisher' }, from: 21, to: market, protein: '16–18%',
                note: { en: 'Until sale at about 7 weeks.', sw: 'Hadi kuuzwa karibu wiki 7.' },
              },
            ]),
      ];
    case 'turkey':
      return [
        {
          id: 'turkey-starter', name: { en: 'Turkey starter', sw: 'Turkey starter' }, from: 0, to: 55, protein: '26–28%',
          note: {
            en: 'Poults need far more protein than chicks. No turkey starter nearby? Use broiler starter, not chick mash.',
            sw: 'Vifaranga vya bata mzinga vinahitaji protini nyingi kuliko vya kuku. Hakuna turkey starter karibu? Tumia broiler starter, si chick mash.',
          },
        },
        {
          id: 'turkey-grower', name: { en: 'Turkey grower', sw: 'Turkey grower' }, from: 56, to: 111, protein: '20–22%',
          note: { en: 'Add greens such as sukuma or lucerne if they are not free-ranging.', sw: 'Ongeza mboga kama sukuma au lusina kama hawatembei nje.' },
        },
        {
          id: 'turkey-finisher', name: { en: 'Turkey finisher', sw: 'Turkey finisher' }, from: 112, to: market, protein: '16–18%',
          note: { en: 'Until sale.', sw: 'Hadi kuuzwa.' },
        },
      ];
    case 'quail':
      return [
        {
          id: 'quail-starter', name: { en: 'Quail starter', sw: 'Quail starter' }, from: 0, to: 20, protein: '24–28%',
          note: {
            en: 'Grind it fine for the first week. Turkey or broiler starter works if there is no quail starter.',
            sw: 'Saga laini kwa wiki ya kwanza. Turkey au broiler starter inafaa kama hakuna quail starter.',
          },
        },
        {
          id: 'quail-grower', name: { en: 'Quail grower', sw: 'Quail grower' }, from: 21, to: 41, protein: '20–22%',
          note: { en: 'Short stage: quail start laying at about 6 weeks.', sw: 'Hatua fupi: kware huanza kutaga karibu wiki 6.' },
        },
        {
          id: 'quail-layer', name: { en: 'Quail layer mash', sw: 'Quail layer mash' }, from: 42, protein: '20–22%',
          note: { en: 'Offer crushed oyster shell on the side for strong shells.', sw: 'Weka magamba ya chaza pembeni kwa maganda imara.' },
        },
      ];
  }
}

export function feedPlan(breedId: string): FeedPhase[] {
  return phases(breedById(breedId));
}

/** What a flock eats today, how much, and the next change of feed. */
export function feedingNow(flock: Flock, day: Day = today()) {
  const breed = breedById(flock.breedId);
  const plan = phases(breed);
  const age = Math.max(0, daysBetween(flock.hatchedOn, day));
  const current = [...plan].reverse().find((p) => age >= p.from) ?? plan[0];
  const next = plan.find((p) => p.from > age && (!breed.marketDay || p.from < breed.marketDay));
  return {
    current,
    gramsPerBird: Math.round(interpolate(breed.feed, age) * 1000),
    next: next ? { phase: next, on: addDays(flock.hatchedOn, next.from), inDays: next.from - age } : undefined,
  };
}

/** Typical daily feed per bird at the start and end of a phase, from the breed's curve. */
export function phaseGrams(breedId: string, p: FeedPhase) {
  const breed = breedById(breedId);
  const end = p.to ?? Math.max(p.from + 28, breed.marketDay ?? p.from + 28);
  return [Math.round(interpolate(breed.feed, p.from) * 1000), Math.round(interpolate(breed.feed, end) * 1000)] as const;
}

export const FEEDING_TIPS: Text[] = [
  {
    en: 'Change feed slowly: mix old and new for 3–5 days (¾ old, then ½, then ¼).',
    sw: 'Badilisha chakula polepole: changanya cha zamani na kipya kwa siku 3–5 (¾ cha zamani, kisha ½, kisha ¼).',
  },
  { en: 'Clean water must always be there. Birds drink about twice as much as they eat.', sw: 'Maji safi yawepo muda wote. Kuku hunywa karibu mara mbili ya wanachokula.' },
  { en: 'Store bags off the floor, dry and away from rats. Mouldy feed makes birds sick.', sw: 'Hifadhi mifuko juu ya sakafu, mahali pakavu na mbali na panya. Chakula chenye ukungu huwaugua kuku.' },
  { en: 'Follow the feeding guide on the bag: brands differ a little in ages and amounts.', sw: 'Fuata maelekezo kwenye mfuko: kampuni hutofautiana kidogo kwa umri na kiasi.' },
];

/* ───────────────────────────── Vaccines ───────────────────────────── */

const DISEASE_SW: Record<string, string> = {
  'Newcastle disease and infectious bronchitis': 'Kideri (Newcastle) na mafua ya kuku (IB)',
  'Infectious bursal disease': 'Gumboro (IBD)',
  'Newcastle disease': 'Kideri (Newcastle)',
  "Marek's disease": 'Ugonjwa wa Marek',
  'Fowl pox': 'Ndui ya kuku (fowl pox)',
  'Fowl typhoid': 'Homa ya matumbo ya kuku (fowl typhoid)',
  'Newcastle, bronchitis and egg drop syndrome': 'Kideri, mafua ya kuku na EDS (kushuka kwa utagaji)',
  'Duck viral hepatitis': 'Homa ya ini ya bata',
  'Duck viral enteritis': 'Tauni ya bata',
  'Fowl cholera': 'Kipindupindu cha kuku (fowl cholera)',
};

const DOSE_SW: Record<string, string> = {
  '1 drop per bird': 'Tone 1 kwa kila ndege',
  '1 dose per bird': 'Dozi 1 kwa kila ndege',
  '0.2 ml under the skin': 'ml 0.2 chini ya ngozi',
  '1 stab per bird': 'Mchomo 1 kwa kila ndege',
  '0.5 ml into the muscle': 'ml 0.5 kwenye msuli',
  '0.5 ml under the skin': 'ml 0.5 chini ya ngozi',
};

export const ROUTE_TEXT: Record<VaccineRoute, Text> = {
  water: { en: 'Drinking water', sw: 'Kwenye maji ya kunywa' },
  'eye-drop': { en: 'Eye drop', sw: 'Tone la jicho' },
  injection: { en: 'Injection', sw: 'Sindano' },
  'wing-web': { en: 'Wing web stab', sw: 'Kuchoma kwenye ngozi ya bawa' },
  spray: { en: 'Spray', sw: 'Kunyunyizia' },
};

const VACCINE_NOTE: Record<string, Text> = {
  "Marek's": {
    en: 'Usually given at the hatchery on day one. Ask when you buy chicks; it cannot be given late.',
    sw: 'Kwa kawaida hutolewa kwenye kituo cha kuangua siku ya kwanza. Uliza unaponunua vifaranga; haiwezi kutolewa baadaye.',
  },
  'Fowl pox': {
    en: 'Look for a small swelling or scab where you stabbed 7–10 days later: that means it took.',
    sw: 'Angalia uvimbe mdogo au kigaga mahali ulipochoma baada ya siku 7–10: hiyo inamaanisha imefanya kazi.',
  },
  'Fowl typhoid': {
    en: 'Common in East Africa, especially where birds free-range.',
    sw: 'Ni ya kawaida Afrika Mashariki, hasa kuku wanapotembea nje.',
  },
  'ND + IB + EDS': {
    en: 'Given just before laying starts, to protect the flock through the laying period.',
    sw: 'Hutolewa kabla tu ya kuanza kutaga, kulinda kundi katika kipindi chote cha utagaji.',
  },
};

export interface VaccineLine {
  ageDay: number;
  name: string;
  disease: string;
  route: Text;
  dose: string;
  note?: string;
  /** Set when the line stands for a booster repeated every N weeks. */
  everyWeeks?: number;
}

/** The schedule for a group, with long runs of identical boosters folded into one line. */
export function vaccineGuide(species: Species, lang: Language): VaccineLine[] {
  const list = vaccineSchedule(species);
  const out: VaccineLine[] = [];
  const line = (v: VaccineTemplate): VaccineLine => ({
    ageDay: v.ageDay,
    name: v.name,
    disease: lang === 'sw' ? DISEASE_SW[v.disease] ?? v.disease : v.disease,
    route: ROUTE_TEXT[v.route],
    dose: lang === 'sw' ? DOSE_SW[v.dose] ?? v.dose : v.dose,
    note: VACCINE_NOTE[v.name] ? say(VACCINE_NOTE[v.name], lang) : undefined,
  });
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    // Three or more of the same booster at a steady gap read better as "every N weeks".
    let j = i;
    while (j + 1 < list.length && list[j + 1].name === v.name && list[j + 1].ageDay - list[j].ageDay === list[i + 1]?.ageDay - v.ageDay) j++;
    if (j - i >= 2) {
      out.push({ ...line(v), everyWeeks: Math.round((list[i + 1].ageDay - v.ageDay) / 7) });
      i = j;
    } else out.push(line(v));
  }
  return out;
}

export const VACCINE_TIPS: Text[] = [
  { en: 'Only vaccinate healthy birds. Sick birds should be seen by a vet first.', sw: 'Chanja kuku wenye afya tu. Kuku wagonjwa waonwe na daktari wa mifugo kwanza.' },
  {
    en: 'Keep vaccines cold (2–8°C) from the agrovet to the farm: carry them in a cool box with ice.',
    sw: 'Weka chanjo kwenye baridi (2–8°C) kutoka duka la mifugo hadi shambani: zibebe kwenye kisanduku cha baridi chenye barafu.',
  },
  {
    en: 'In water: hold back water for 1–2 hours first, use clean water without chlorine, add skimmed milk powder to protect the vaccine, and let birds finish it within 2 hours.',
    sw: 'Kwenye maji: zuia maji kwa saa 1–2 kwanza, tumia maji safi yasiyo na klorini, ongeza unga wa maziwa ili kulinda chanjo, na kuku wamalize ndani ya saa 2.',
  },
  { en: 'Vaccinate in the cool morning, and use it within the time on the label once mixed.', sw: 'Chanja asubuhi wakati wa baridi, na itumie ndani ya muda ulioandikwa baada ya kuchanganya.' },
  { en: 'Schedules differ by area and disease outbreaks. Confirm yours with a vet.', sw: 'Ratiba hutofautiana kwa eneo na milipuko ya magonjwa. Thibitisha yako na daktari wa mifugo.' },
];
