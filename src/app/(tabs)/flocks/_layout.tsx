import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/lib/i18n';

export default function FlocksStack() {
  const tr = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: tr('Flocks') }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="incubator/[id]" options={{ title: tr('Incubator'), headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
