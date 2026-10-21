import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip, ChipRow, Field, Stepper } from '@/components/controls';
import { SPECIES_ICON } from '@/components/flock-card';
import { Icon } from '@/components/icon';
import { Txt } from '@/components/text';
import { BREEDS } from '@/data/breeds';
import type { FarmType, House, HouseType, Species } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
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

/** Breeds that fit what the farm keeps; every breed when nothing is picked. */
export function breedsFor(farmTypes: FarmType[]) {
  const species = new Set(farmTypes.flatMap((t) => TYPE_SPECIES[t]));
  return BREEDS.filter((b) => species.size === 0 || species.has(b.species));
}

/**
 * Breeds that fit the farm come first. The rest sit behind "Show other breeds", so a farmer
 * who ticked Layers can still pick a dual-purpose bird like Kenbro or Sasso F1.
 */
export function BreedPicker({ farmTypes, value, onChange }: { farmTypes: FarmType[]; value: string; onChange: (breedId: string) => void }) {
  const c = useTheme();
  const tr = useT();
  const suggested = breedsFor(farmTypes);
  const others = BREEDS.filter((b) => !suggested.includes(b));
  const [all, setAll] = useState(() => others.some((b) => b.id === value));
  const shown = all ? [...suggested, ...others] : suggested;
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="label" tone="secondary">
        {tr('BREED')}
      </Txt>
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {shown.map((b) => {
          const on = b.id === value;
          return (
            <Pressable
              key={b.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${b.name}. ${b.blurb}`}
              onPress={() => {
                haptic.tick();
                onChange(b.id);
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
      {others.length > 0 && !all && (
        <Button title={tr('Show other breeds')} icon="chevronDown" variant="ghost" full onPress={() => setAll(true)} />
      )}
    </View>
  );
}

const AGES = [
  { label: 'Day-old', days: 0 },
  { label: '1 week', days: 7 },
  { label: '4 weeks', days: 28 },
  { label: '16 weeks', days: 112 },
  { label: '20 weeks', days: 140 },
] as const;

export function AgeAndCount({ ageDays, count, onChange }: { ageDays: number; count: number; onChange: (patch: { ageDays?: number; count?: number }) => void }) {
  const tr = useT();
  return (
    <>
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('HOW OLD ARE THEY TODAY?')}
        </Txt>
        <ChipRow>
          {AGES.map((a) => (
            <Chip key={a.label} label={tr(a.label)} selected={ageDays === a.days} onPress={() => onChange({ ageDays: a.days })} />
          ))}
        </ChipRow>
        <Stepper
          label={tr('Age in days')}
          value={ageDays}
          step={1}
          min={0}
          max={600}
          onChange={(v) => onChange({ ageDays: v })}
          unit={ageDays >= 14 ? tr('days · week {n}', { n: Math.floor(ageDays / 7) }) : tr('days old')}
        />
      </View>
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('NUMBER OF BIRDS')}
        </Txt>
        <Stepper label={tr('Number of birds')} value={count} step={50} min={1} max={100000} onChange={(v) => onChange({ count: v })} unit={tr('birds')} />
      </View>
    </>
  );
}

export const HOUSE_TYPES: { key: HouseType; label: 'Deep litter' | 'Cage' | 'Free-range' }[] = [
  { key: 'deep-litter', label: 'Deep litter' },
  { key: 'cage', label: 'Cage' },
  { key: 'free-range', label: 'Free-range' },
];

type HouseDraft = Omit<House, 'id' | 'quarantine'>;

/** Name, capacity and type: the same fields in onboarding and when adding a house later. */
export function HouseFields({ house, onChange }: { house: HouseDraft; onChange: (patch: Partial<HouseDraft>) => void }) {
  const tr = useT();
  return (
    <>
      <Field label={tr('Name')} value={house.name} onChangeText={(name) => onChange({ name })} autoCapitalize="words" />
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('CAPACITY')}
        </Txt>
        <Stepper label={tr('{name} capacity', { name: house.name })} value={house.capacity} step={50} min={10} onChange={(capacity) => onChange({ capacity })} unit={tr('birds')} />
      </View>
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('TYPE')}
        </Txt>
        <ChipRow>
          {HOUSE_TYPES.map((t) => (
            <Chip key={t.key} label={tr(t.label)} selected={house.type === t.key} onPress={() => onChange({ type: t.key })} />
          ))}
        </ChipRow>
      </View>
    </>
  );
}

/** "House D": the first letter not already used, so removing B then adding never makes two Cs. */
export function nextHouseName(names: string[], word: string) {
  const taken = new Set(names.map((n) => n.trim().toLowerCase()));
  for (let i = 0; i < 26; i++) {
    const name = `${word} ${String.fromCharCode(65 + i)}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
  return `${word} ${names.length + 1}`;
}

export function houseTypeLabel(type: HouseType) {
  return HOUSE_TYPES.find((t) => t.key === type)!.label;
}
