import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Chip, ChipRow, Field, Stepper } from '@/components/controls';
import { FormSheet } from '@/components/form-sheet';
import { Txt } from '@/components/text';
import { addDays, fmt, today } from '@/data/format';
import { addIncubator, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { space } from '@/theme';

/** Start a batch of eggs: ROOST then times candling, lockdown and hatch day. */
export default function AddIncubator() {
  const tr = useT();
  const farm = useFarm();
  const [name, setName] = useState(() => `${tr('Incubator')} ${farm.incubators.length + 1}`);
  const [eggs, setEggs] = useState(100);
  const [daysAgo, setDaysAgo] = useState(0);
  const setOn = addDays(today(), -daysAgo);

  return (
    <FormSheet
      icon="calendar"
      title={tr('Set eggs')}
      lead={tr('ROOST reminds you to candle on days 7 and 14, lock down on day 18 and count chicks on day 21.')}
      footer={
        <Button
          title={tr('Start incubation')}
          size="xl"
          full
          disabled={!name.trim() || eggs < 1}
          onPress={() => {
            addIncubator(name.trim(), eggs, setOn);
            haptic.success();
            router.back();
          }}
        />
      }>
      <Field label={tr('Name')} value={name} onChangeText={setName} autoCapitalize="words" />
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('EGGS SET')}
        </Txt>
        <Stepper label={tr('Eggs set')} value={eggs} step={10} min={1} onChange={setEggs} unit={tr('eggs')} />
      </View>
      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          {tr('WHEN WERE THEY SET?')}
        </Txt>
        <ChipRow>
          <Chip label={tr('Today')} selected={daysAgo === 0} onPress={() => setDaysAgo(0)} />
          <Chip label={tr('Yesterday')} selected={daysAgo === 1} onPress={() => setDaysAgo(1)} />
        </ChipRow>
        <Stepper label={tr('Days in the incubator')} value={daysAgo} step={1} min={0} max={21} onChange={setDaysAgo} unit={tr('days ago · {date}', { date: fmt.dayShort(setOn) })} />
        <Txt variant="caption" tone="secondary">
          {tr('Hatch day: {date}', { date: fmt.dayShort(addDays(setOn, 21)) })}
        </Txt>
      </View>
    </FormSheet>
  );
}
