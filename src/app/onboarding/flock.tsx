import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip, ChipRow, Stepper } from '@/components/controls';
import { Icon } from '@/components/icon';
import { OnboardingFrame } from '@/components/onboarding-frame';
import { useDraft } from '@/components/onboarding-draft';
import { SPECIES_ICON } from '@/components/flock-card';
import { Txt } from '@/components/text';
import { BREEDS } from '@/data/breeds';
import type { FarmType, Species } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';

const TYPE_SPECIES: Record<FarmType, Species[]> = {
  layers: ['layer'],
  broilers: ['broiler'],
  indigenous: ['indigenous'],
  ducks: ['duck'],
  turkeys: ['turkey'],
  quail: ['quail'],
  hatchery: ['indigenous', 'layer'],
};

const AGES = [
  { label: 'Day-old', days: 0 },
  { label: '1 week', days: 7 },
  { label: '4 weeks', days: 28 },
  { label: '16 weeks', days: 112 },
  { label: '20 weeks', days: 140 },
];

export default function FlockStep() {
  const c = useTheme();
  const { draft, update } = useDraft();
  const species = new Set(draft.farmTypes.flatMap((t) => TYPE_SPECIES[t]));
  const breeds = BREEDS.filter((b) => species.size === 0 || species.has(b.species));
  const f = draft.flock;
  const breedId = f.breedId || breeds[0]?.id || '';
  const set = (patch: Partial<typeof f>) => update({ flock: { ...f, breedId, ...patch } });

  return (
    <OnboardingFrame
      step={3}
      title="Your first flock"
      subtitle="ROOST builds a vaccination schedule and growth targets from this."
      footer={
        <Button
          title="Create my plan"
          size="xl"
          full
          disabled={!breedId || f.count < 1}
          onPress={() => {
            update({ flock: { ...f, breedId } });
            router.push('/onboarding/ready');
          }}
        />
      }>
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          BREED
        </Txt>
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          {breeds.map((b) => {
            const on = b.id === breedId;
            return (
              <Pressable
                key={b.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${b.name}. ${b.blurb}`}
                onPress={() => {
                  haptic.tick();
                  set({ breedId: b.id });
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  minHeight: 64,
                  paddingHorizontal: space.lg,
                  paddingVertical: space.sm,
                  borderRadius: radius.md,
                  borderCurve: 'continuous',
                  backgroundColor: on ? c.yolkSoft : c.surface,
                  borderWidth: 2,
                  borderColor: on ? c.yolk : c.hairline,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Icon name={SPECIES_ICON[b.species]} size={28} color={on ? c.yolkText : c.inkSecondary} />
                <View style={{ flex: 1 }}>
                  <Txt variant="headline">{b.name}</Txt>
                  <Txt variant="caption" tone="secondary">
                    {b.blurb}
                  </Txt>
                </View>
                {on && <Icon name="checkCircle" size={24} color={c.yolkText} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {draft.houses.length > 1 && (
        <View style={{ gap: space.sm }}>
          <Txt variant="label" tone="secondary">
            HOUSE
          </Txt>
          <ChipRow>
            {draft.houses.map((h, i) => (
              <Chip key={i} label={h.name} selected={f.houseIndex === i} onPress={() => set({ houseIndex: i })} />
            ))}
          </ChipRow>
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          HOW OLD ARE THEY TODAY?
        </Txt>
        <ChipRow>
          {AGES.map((a) => (
            <Chip key={a.label} label={a.label} selected={f.ageDays === a.days} onPress={() => set({ ageDays: a.days })} />
          ))}
        </ChipRow>
        <Stepper label="Age in days" value={f.ageDays} step={1} min={0} max={600} onChange={(ageDays) => set({ ageDays })} unit={f.ageDays >= 14 ? `days · week ${Math.floor(f.ageDays / 7)}` : 'days old'} />
      </View>

      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          NUMBER OF BIRDS
        </Txt>
        <Stepper label="Number of birds" value={f.count} step={50} min={1} max={100000} onChange={(count) => set({ count })} unit="birds" />
      </View>
    </OnboardingFrame>
  );
}
