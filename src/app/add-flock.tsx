import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Chip, ChipRow } from '@/components/controls';
import { AgeAndCount, BreedPicker, breedsFor } from '@/components/flock-form';
import { FormSheet } from '@/components/form-sheet';
import { Banner } from '@/components/surface';
import { Txt } from '@/components/text';
import { fmt } from '@/data/format';
import { birdsIn } from '@/data/selectors';
import { addFlock, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { space } from '@/theme';

/** Place new birds in a house: gives them a vaccination plan, growth targets and today's tasks. */
export default function AddFlock() {
  const tr = useT();
  const farm = useFarm();
  const params = useLocalSearchParams<{ house?: string }>();
  // Start on the house asked for, else the first one with room to spare.
  const [houseId, setHouseId] = useState(
    () => (farm.houses.find((h) => h.id === params.house) ?? farm.houses.find((h) => birdsIn(farm, h.id) === 0) ?? farm.houses[0])?.id ?? '',
  );
  const house = farm.houses.find((h) => h.id === houseId);
  const [breedId, setBreedId] = useState(breedsFor(farm.farmTypes)[0]?.id ?? '');
  const [ageDays, setAgeDays] = useState(0);
  const [count, setCount] = useState(() => Math.max(1, (house?.capacity ?? 500) - (house ? birdsIn(farm, house.id) : 0)));
  const already = house ? birdsIn(farm, house.id) : 0;
  const over = house ? already + count > house.capacity : false;

  if (!farm.houses.length) {
    return (
      <FormSheet icon="add" title={tr('Add a flock')} footer={<Button title={tr('Add a house first')} icon="add" size="xl" full onPress={() => router.replace('/house')} />}>
        <Txt variant="body" tone="secondary">
          {tr('Birds live in a house. Add one, then place your flock in it.')}
        </Txt>
      </FormSheet>
    );
  }

  return (
    <FormSheet
      icon="add"
      title={tr('Add a flock')}
      lead={tr('ROOST builds a vaccination schedule and growth targets from this.')}
      footer={
        <Button
          title={house ? tr('Place {n} birds in {name}', { n: fmt.int(count), name: house.name }) : tr('Pick a house')}
          size="xl"
          full
          disabled={!house || !breedId || count < 1}
          onPress={() => {
            addFlock(houseId, { breedId, ageDays, count });
            haptic.success();
            router.back();
          }}
        />
      }>
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('HOUSE')}
        </Txt>
        <ChipRow>
          {farm.houses.map((h) => {
            const n = birdsIn(farm, h.id);
            return <Chip key={h.id} label={n ? `${h.name} · ${fmt.int(n)}` : `${h.name} · ${tr('empty')}`} selected={houseId === h.id} onPress={() => setHouseId(h.id)} />;
          })}
          <Chip label={tr('New house')} icon="add" onPress={() => router.replace('/house')} />
        </ChipRow>
      </View>
      {over && house && (
        <Banner
          tone="yolk"
          icon="warning"
          title={tr('{name} is built for {cap} birds', { name: house.name, cap: fmt.int(house.capacity) })}
          body={tr('It already holds {n}. Crowded birds eat less, lay less and get sick more easily.', { n: fmt.int(already) })}
        />
      )}
      <BreedPicker farmTypes={farm.farmTypes} value={breedId} onChange={setBreedId} />
      <AgeAndCount ageDays={ageDays} count={count} onChange={(p) => { if (p.ageDays !== undefined) setAgeDays(p.ageDays); if (p.count !== undefined) setCount(p.count); }} />
    </FormSheet>
  );
}
