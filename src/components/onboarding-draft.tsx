import { createContext, use, useState, type ReactNode } from 'react';

import type { OnboardingInput } from '@/data/store';

type Draft = OnboardingInput;
type Ctx = { draft: Draft; update: (patch: Partial<Draft>) => void; removeHouse: (index: number) => void };

const DraftContext = createContext<Ctx | null>(null);

const initial: Draft = {
  farmName: '',
  ownerName: '',
  farmTypes: [],
  // The houses step seeds the first house, so its name follows the language picked on Welcome.
  houses: [],
  flocks: [],
};

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  // Flocks point at houses by position, so removing a house drops its flock and shifts the rest.
  const removeHouse = (index: number) =>
    setDraft((d) => ({
      ...d,
      houses: d.houses.filter((_, k) => k !== index),
      flocks: d.flocks.filter((f) => f.houseIndex !== index).map((f) => (f.houseIndex > index ? { ...f, houseIndex: f.houseIndex - 1 } : f)),
    }));
  return <DraftContext value={{ draft, update, removeHouse }}>{children}</DraftContext>;
}

export function useDraft() {
  const ctx = use(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
