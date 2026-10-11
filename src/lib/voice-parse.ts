/**
 * Turns a spoken (dictated) egg count into numbers.
 *   "Two hundred forty eggs, House A, twelve cracked"  →  { total: 240, house: 'a', cracked: 12 }
 *   "8 trays and 6 eggs, 3 dirty"                      →  { total: 246, dirty: 3 }
 * Works with digits or English number words, in any order.
 */

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

export interface VoiceResult {
  total?: number;
  cracked?: number;
  dirty?: number;
  small?: number;
  medium?: number;
  house?: string;
}

type Tok = { n: number } | { w: string };

function tokens(text: string): Tok[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  const out: Tok[] = [];
  let cur: number | null = null;
  let acc = 0;
  const flush = () => {
    if (cur !== null) out.push({ n: acc + cur });
    cur = null;
    acc = 0;
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (/^\d+$/.test(w)) {
      flush();
      out.push({ n: Number(w) });
    } else if (w in UNITS) {
      cur = (cur ?? 0) + UNITS[w];
    } else if (w in TENS) {
      cur = (cur ?? 0) + TENS[w];
    } else if (w === 'hundred') {
      cur = (cur ?? 1) * 100;
    } else if (w === 'thousand') {
      acc += (cur ?? 1) * 1000;
      cur = 0;
    } else if (w === 'and' && cur !== null) {
      // "two hundred and forty": keep accumulating.
    } else if (w === 'a' && /^(hundred|thousand)$/.test(words[i + 1] ?? '')) {
      cur = 1;
    } else {
      flush();
      out.push({ w });
    }
  }
  flush();
  return out;
}

export function parseEggSpeech(text: string): VoiceResult {
  const t = tokens(text);
  const r: VoiceResult = {};
  let eggs = 0;
  let trays = 0;
  let sawCount = false;
  for (let i = 0; i < t.length; i++) {
    const tok = t[i];
    if ('w' in tok) {
      if (tok.w === 'house' || tok.w === 'coop' || tok.w === 'shed') {
        const next = t[i + 1];
        if (next) r.house = 'w' in next ? next.w : String(next.n);
      }
      continue;
    }
    const next = t[i + 1];
    const word = next && 'w' in next ? next.w : '';
    if (/^trays?$/.test(word)) {
      trays += tok.n;
      sawCount = true;
    } else if (/^(cracked|broken)$/.test(word)) r.cracked = tok.n;
    else if (/^(dirty|soiled)$/.test(word)) r.dirty = tok.n;
    else if (word === 'small') r.small = tok.n;
    else if (word === 'medium') r.medium = tok.n;
    else if (/^eggs?$/.test(word) || !word) {
      eggs += tok.n;
      sawCount = true;
    } else if (!sawCount) {
      eggs += tok.n;
      sawCount = true;
    }
  }
  if (sawCount) r.total = trays * 30 + eggs;
  return r;
}
