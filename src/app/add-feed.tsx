import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Chip, ChipRow, Field, Stepper } from '@/components/controls';
import { FormSheet } from '@/components/form-sheet';
import { Txt } from '@/components/text';
import { fmt } from '@/data/format';
import { activeFlocks, houseName } from '@/data/selectors';
import { addFeedStore, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { space } from '@/theme';

/** A bag pile or silo. Linking it to flocks lets ROOST count down the days of feed left. */
export default function AddFeed() {
  const tr = useT();
  const farm = useFarm();
  const flocks = activeFlocks(farm);
  const [name, setName] = useState('');
  const [kg, setKg] = useState(500);
  const [capacity, setCapacity] = useState(1000);
  const [price, setPrice] = useState('');
  // Flocks not yet eating from any store are the likely ones.
  const [flockIds, setFlockIds] = useState(() => flocks.filter((f) => !farm.stocks.some((s) => s.flockIds.includes(f.id))).map((f) => f.id));
  const toggle = (id: string) => setFlockIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const pricePerKg = Number(price.replace(',', '.')) || 0;

  return (
    <FormSheet
      icon="feed"
      title={tr('Add feed in store')}
      lead={tr('ROOST counts down how many days it will last and warns you a week before it runs out.')}
      footer={
        <Button
          title={tr('Save')}
          size="xl"
          full
          disabled={!name.trim() || flockIds.length === 0}
          onPress={() => {
            addFeedStore({ name: name.trim(), kgOnHand: kg, capacityKg: Math.max(capacity, kg), flockIds, pricePerKg });
            haptic.success();
            router.back();
          }}
        />
      }>
      <Field label={tr('Feed name')} placeholder={tr('Layer mash')} value={name} onChangeText={setName} autoCapitalize="sentences" />
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('IN STORE NOW')}
        </Txt>
        <Stepper label={tr('In store now')} value={kg} step={50} min={0} onChange={setKg} unit={tr('kg · {n} bags', { n: Math.round(kg / 50) })} />
      </View>
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('STORE HOLDS UP TO')}
        </Txt>
        <Stepper label={tr('Store holds up to')} value={capacity} step={100} min={100} onChange={setCapacity} unit="kg" />
      </View>
      <Field label={tr('Price per kg ({cur})', { cur: farm.settings.currency })} placeholder="0.45" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('WHO EATS IT?')}
        </Txt>
        {flocks.length ? (
          <ChipRow>
            {flocks.map((f) => (
              <Chip key={f.id} label={houseName(farm, f)} selected={flockIds.includes(f.id)} onPress={() => toggle(f.id)} />
            ))}
          </ChipRow>
        ) : (
          <Txt variant="subhead" tone="secondary">
            {tr('Add a flock first, then link its feed here.')}
          </Txt>
        )}
        {pricePerKg > 0 && (
          <Txt variant="caption" tone="secondary">
            {tr('Worth about {money} today', { money: fmt.money(kg * pricePerKg, farm.settings.currency) })}
          </Txt>
        )}
      </View>
    </FormSheet>
  );
}
