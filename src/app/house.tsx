import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/button';
import { HouseFields, nextHouseName } from '@/components/flock-form';
import { FormSheet } from '@/components/form-sheet';
import { Card } from '@/components/surface';
import { addHouse, removeHouse, updateHouse, useFarm } from '@/data/store';
import type { HouseType } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { space } from '@/theme';

/** Add a house, or edit one with `?id=`. An empty house can also be removed here. */
export default function HouseScreen() {
  const tr = useT();
  const farm = useFarm();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = farm.houses.find((h) => h.id === id);
  const [house, setHouse] = useState(
    () =>
      existing ?? {
        name: nextHouseName(farm.houses.map((h) => h.name), tr('House')),
        capacity: 500,
        type: (farm.farmTypes.includes('indigenous') ? 'free-range' : 'deep-litter') as HouseType,
      },
  );
  const taken = farm.houses.some((h) => h.id !== id && h.name.trim().toLowerCase() === house.name.trim().toLowerCase());
  // A house that ever held birds stays, so past flocks keep their house name.
  const used = existing ? farm.flocks.some((f) => f.houseId === existing.id) : false;

  return (
    <FormSheet
      icon="edit"
      title={existing ? tr('Edit {name}', { name: existing.name }) : tr('Add a house')}
      lead={existing ? undefined : tr('Where do your birds live? Capacity helps ROOST spot overcrowding.')}
      footer={
        <Button
          title={taken ? tr('Another house has this name') : existing ? tr('Save') : tr('Add house')}
          size="xl"
          full
          disabled={!house.name.trim() || taken}
          onPress={() => {
            const clean = { name: house.name.trim(), capacity: house.capacity, type: house.type };
            if (existing) {
              updateHouse(existing.id, clean);
              router.back();
            } else {
              const h = addHouse(clean);
              // Straight on to stocking it: an empty house is rarely the end of the story.
              router.replace({ pathname: '/add-flock', params: { house: h.id } });
            }
            haptic.success();
          }}
        />
      }>
      <Card style={{ gap: space.lg }}>
        <HouseFields house={house} onChange={(patch) => setHouse((h) => ({ ...h, ...patch }))} />
      </Card>
      {existing && !used && (
        <Button
          title={tr('Remove {name}', { name: existing.name })}
          icon="close"
          variant="ghost"
          full
          onPress={() =>
            Alert.alert(tr('Remove {name}?', { name: existing.name }), tr('This can’t be undone.'), [
              { text: tr('Cancel'), style: 'cancel' },
              { text: tr('Remove'), style: 'destructive', onPress: () => { removeHouse(existing.id); router.back(); } },
            ])
          }
        />
      )}
    </FormSheet>
  );
}
