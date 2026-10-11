import { createContext, use, useState, type ReactNode } from 'react';

import type { OnboardingInput } from '@/data/store';

type Draft = OnboardingInput;
type Ctx = { draft: Draft; update: (patch: Partial<Draft>) => void };

const DraftContext = createContext<Ctx | null>(null);

const initial: Draft = {
  farmName: '',
  ownerName: '',
  farmTypes: [],
  houses: [{ name: 'House A', capacity: 500, type: 'deep-litter' }],
  flock: { breedId: '', houseIndex: 0, ageDays: 0, count: 500 },
};

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(initial);
  return <DraftContext value={{ draft, update: (patch) => setDraft((d) => ({ ...d, ...patch })) }}>{children}</DraftContext>;
}

export function useDraft() {
  const ctx = use(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
