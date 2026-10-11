/**
 * A small, conservative symptom → condition table for ranking *possible* causes.
 * This is decision support for talking to a vet, never a diagnosis.
 */

export interface Symptom {
  id: string;
  label: string;
  group: 'Breathing' | 'Droppings' | 'Behaviour' | 'Eggs' | 'Body';
}

export const SYMPTOMS: Symptom[] = [
  { id: 'sneeze', label: 'Sneezing', group: 'Breathing' },
  { id: 'rales', label: 'Gurgling breath', group: 'Breathing' },
  { id: 'nasal', label: 'Runny nose', group: 'Breathing' },
  { id: 'gasp', label: 'Gasping', group: 'Breathing' },
  { id: 'swollenFace', label: 'Swollen face or eyes', group: 'Breathing' },
  { id: 'bloody', label: 'Blood in droppings', group: 'Droppings' },
  { id: 'whiteWatery', label: 'White, watery', group: 'Droppings' },
  { id: 'green', label: 'Green', group: 'Droppings' },
  { id: 'yellow', label: 'Yellow', group: 'Droppings' },
  { id: 'hunched', label: 'Hunched, ruffled', group: 'Behaviour' },
  { id: 'offFeed', label: 'Not eating', group: 'Behaviour' },
  { id: 'drinkMore', label: 'Drinking more', group: 'Behaviour' },
  { id: 'panting', label: 'Panting, wings out', group: 'Behaviour' },
  { id: 'twisted', label: 'Twisted neck', group: 'Behaviour' },
  { id: 'paralysis', label: 'Lame or paralysed', group: 'Behaviour' },
  { id: 'eggDrop', label: 'Fewer eggs', group: 'Eggs' },
  { id: 'softShell', label: 'Soft or odd shells', group: 'Eggs' },
  { id: 'pale', label: 'Pale comb', group: 'Body' },
  { id: 'scabs', label: 'Scabs on comb', group: 'Body' },
  { id: 'feathers', label: 'Feather loss', group: 'Body' },
  { id: 'thin', label: 'Weight loss', group: 'Body' },
  { id: 'sudden', label: 'Sudden deaths', group: 'Body' },
  { id: 'wattles', label: 'Swollen wattles', group: 'Body' },
];

interface Condition {
  name: string;
  weights: Record<string, number>;
  now: string;
  urgent?: boolean;
}

const CONDITIONS: Condition[] = [
  { name: 'Newcastle disease', urgent: true, weights: { twisted: 3, gasp: 2, rales: 2, green: 2, eggDrop: 2, softShell: 1, sudden: 2, paralysis: 2 }, now: 'Isolate the house, stop visitors, call your vet today. Notifiable in many countries.' },
  { name: 'Infectious bronchitis', weights: { sneeze: 2, rales: 2, nasal: 2, eggDrop: 2, softShell: 3 }, now: 'Keep birds warm and ventilated; ask your vet about a booster.' },
  { name: 'Gumboro (IBD)', urgent: true, weights: { whiteWatery: 3, hunched: 2, offFeed: 1, sudden: 2 }, now: 'Common at 3–6 weeks. Give clean water with vitamins; call your vet.' },
  { name: 'Coccidiosis', weights: { bloody: 4, hunched: 2, offFeed: 1, pale: 1, thin: 1 }, now: 'Keep litter dry; your vet can confirm and advise a coccidiostat.' },
  { name: 'Fowl typhoid', urgent: true, weights: { yellow: 3, green: 1, hunched: 2, pale: 2, sudden: 2 }, now: 'Isolate sick birds and ask your vet about testing.' },
  { name: 'Chronic respiratory disease', weights: { sneeze: 2, nasal: 3, swollenFace: 3, rales: 2, offFeed: 1 }, now: 'Improve ventilation and reduce dust and ammonia.' },
  { name: 'Fowl pox', weights: { scabs: 4, eggDrop: 1, offFeed: 1 }, now: 'Separate affected birds; vaccinate the rest if not done.' },
  { name: 'Heat stress', weights: { panting: 4, drinkMore: 2, offFeed: 2, sudden: 1, eggDrop: 1 }, now: 'Shade, cool water with electrolytes, more airflow. Avoid handling.' },
  { name: 'Worms', weights: { thin: 3, pale: 2, eggDrop: 1, whiteWatery: 1 }, now: 'Ask your vet about a dewormer and its egg withdrawal.' },
  { name: 'Mites or lice', weights: { feathers: 3, pale: 2, eggDrop: 1 }, now: 'Check under the wings at night; clean perches and nest boxes.' },
  { name: "Marek's disease", weights: { paralysis: 4, thin: 2, pale: 1 }, now: 'No cure. Cull affected birds humanely; check vaccination of future chicks.' },
  { name: 'Fowl cholera', urgent: true, weights: { sudden: 3, wattles: 4, green: 2 }, now: 'Call your vet; remove dead birds quickly and control rodents.' },
];

export function rankCauses(selected: string[]) {
  if (selected.length === 0) return [];
  const sel = new Set(selected);
  return CONDITIONS.map((c) => {
    const total = Object.values(c.weights).reduce((a, b) => a + b, 0);
    const matched = Object.entries(c.weights).filter(([k]) => sel.has(k)).reduce((a, [, w]) => a + w, 0);
    const explained = selected.filter((s) => c.weights[s]).length / selected.length;
    const score = (matched / total) * 0.6 + explained * 0.4;
    return { ...c, score, matched: selected.filter((s) => c.weights[s]).map((s) => SYMPTOMS.find((x) => x.id === s)!.label) };
  })
    .filter((c) => c.matched.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}
