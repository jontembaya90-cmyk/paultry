import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { AgeAndCount, BreedPicker, breedsFor } from '@/components/flock-form';
import { Icon } from '@/components/icon';
import { OnboardingFrame } from '@/components/onboarding-frame';
import { useDraft } from '@/components/onboarding-draft';
import { Card } from '@/components/surface';
import { Txt } from '@/components/text';
import { breedById } from '@/data/breeds';
import type { FlockInput } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { space, useTheme } from '@/theme';

/**
 * Every house from the previous step gets a card, so none is silently left out: fill in the
 * birds living there now, or leave it empty on purpose.
 */
export default function FlockStep() {
  const c = useTheme();
  const tr = useT();
  const { draft, update } = useDraft();
  const fallbackBreed = breedsFor(draft.farmTypes)[0]?.id ?? '';
  const [open, setOpen] = useState(0);

  const flockAt = (i: number) => draft.flocks.find((f) => f.houseIndex === i);
  const setFlock = (i: number, patch: Partial<FlockInput>) =>
    update({ flocks: draft.flocks.map((f) => (f.houseIndex === i ? { ...f, breedId: f.breedId || fallbackBreed, ...patch } : f)) });
  const stock = (i: number) => {
    haptic.tick();
    const last = draft.flocks[draft.flocks.length - 1];
    update({ flocks: [...draft.flocks, { breedId: last?.breedId || fallbackBreed, houseIndex: i, ageDays: last?.ageDays ?? 0, count: Math.min(draft.houses[i].capacity, last?.count ?? 500) }] });
    setOpen(i);
  };
  const empty = (i: number) => {
    haptic.toggleOff();
    update({ flocks: draft.flocks.filter((f) => f.houseIndex !== i) });
  };

  const stocked = draft.flocks.filter((f) => draft.houses[f.houseIndex]);
  const ready = stocked.length > 0 && stocked.every((f) => (f.breedId || fallbackBreed) && f.count > 0);
  const many = draft.houses.length > 1;

  return (
    <OnboardingFrame
      step={3}
      title={many ? tr('Birds in each house') : tr('Your first flock')}
      subtitle={many ? tr('Tell ROOST what lives in each house today. Leave a house empty if it has no birds yet.') : tr('ROOST builds a vaccination schedule and growth targets from this.')}
      footer={
        <Button
          title={ready ? tr('Create my plan') : tr('Add birds to at least one house')}
          size="xl"
          full
          disabled={!ready}
          onPress={() => {
            update({ flocks: stocked.map((f) => ({ ...f, breedId: f.breedId || fallbackBreed })) });
            router.push('/onboarding/ready');
          }}
        />
      }>
      {draft.houses.map((house, i) => {
        const f = flockAt(i);
        const expanded = !many || open === i;
        const summary = f
          ? `${f.count.toLocaleString()} · ${breedById(f.breedId || fallbackBreed).name}`
          : tr('Empty for now');
        return (
          <Card key={i} style={{ gap: space.lg, borderWidth: 2, borderColor: expanded && many ? c.yolk : 'transparent' }}>
            {many && (
              <Pressable
                onPress={() => setOpen(i)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${house.name}. ${summary}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
                <Icon name={f ? 'checkCircle' : 'circle'} size={26} color={f ? c.sageText : c.inkTertiary} />
                <View style={{ flex: 1 }}>
                  <Txt variant="title3">{house.name}</Txt>
                  <Txt variant="subhead" tone="secondary">
                    {summary}
                  </Txt>
                </View>
                {!expanded && <Icon name="chevronDown" size={22} color={c.inkSecondary} />}
              </Pressable>
            )}
            {expanded && f && (
              <>
                <BreedPicker farmTypes={draft.farmTypes} value={f.breedId || fallbackBreed} onChange={(breedId) => setFlock(i, { breedId })} />
                <AgeAndCount ageDays={f.ageDays} count={f.count} onChange={(patch) => setFlock(i, patch)} />
                {many && <Button title={tr('No birds in {name} yet', { name: house.name })} icon="close" variant="ghost" full onPress={() => empty(i)} />}
              </>
            )}
            {expanded && !f && (
              <Button title={tr('Add birds to {name}', { name: house.name })} icon="add" variant="secondary" full onPress={() => stock(i)} />
            )}
          </Card>
        );
      })}
    </OnboardingFrame>
  );
}
