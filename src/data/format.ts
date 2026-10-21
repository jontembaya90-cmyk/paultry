import type { Day } from './types';

export const EGGS_PER_TRAY = 30;

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toDay(d: Date): Day {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): Day {
  return toDay(new Date());
}

export function parseDay(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: Day, n: number): Day {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export function daysBetween(from: Day, to: Day): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

export function monthKey(day: Day) {
  return day.slice(0, 7);
}

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const fmt = {
  int: (n: number) => nf.format(Math.round(n)),
  one: (n: number) => nf1.format(n),
  two: (n: number) => nf2.format(n),
  pct: (ratio: number, digits = 0) =>
    `${(ratio * 100).toFixed(digits)}%`,
  money: (n: number, currency: string) => {
    const abs = Math.abs(n);
    const body = abs >= 100 ? nf.format(abs) : nf2.format(abs);
    return `${n < 0 ? '−' : ''}${currency} ${body}`;
  },
  /** "36 trays + 24" */
  trays: (eggs: number) => {
    const t = Math.floor(eggs / EGGS_PER_TRAY);
    const r = eggs % EGGS_PER_TRAY;
    if (t === 0) return `${r} egg${r === 1 ? '' : 's'}`;
    return r === 0 ? `${t} tray${t === 1 ? '' : 's'}` : `${t} tray${t === 1 ? '' : 's'} + ${r}`;
  },
  /** "Sat 10 Oct" */
  dayShort: (day: Day) =>
    parseDay(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
  /** "Oct 14" */
  monthDay: (day: Day) => parseDay(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  /** "Saturday, 10 October" */
  dayLong: (day: Day, locale?: string) =>
    parseDay(day).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
  time: (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  hour: (h: number) => {
    const suffix = h < 12 ? 'a.m.' : 'p.m.';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh} ${suffix}`;
  },
  relativeDays: (n: number) => {
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  },
  weight: (kg: number, unit: 'kg' | 'lb') =>
    unit === 'kg' ? `${nf2.format(kg)} kg` : `${nf2.format(kg * 2.20462)} lb`,
  temp: (c: number, unit: 'C' | 'F') => (unit === 'C' ? `${Math.round(c)}°C` : `${Math.round(c * 1.8 + 32)}°F`),
  temp1: (c: number, unit: 'C' | 'F') => (unit === 'C' ? `${c.toFixed(1)}°C` : `${(c * 1.8 + 32).toFixed(1)}°F`),
};

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function greeting(date = new Date()): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function currentSlot(date = new Date()): 'morning' | 'midday' | 'evening' {
  const h = date.getHours();
  if (h < 11) return 'morning';
  if (h < 16) return 'midday';
  return 'evening';
}
