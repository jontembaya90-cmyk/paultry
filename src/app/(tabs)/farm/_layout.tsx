import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/lib/i18n';

export default function FarmStack() {
  const tr = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: tr('Farm') }} />
      <Stack.Screen name="environment" options={{ title: tr('Environment'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="team" options={{ title: tr('Team'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="design" options={{ title: tr('Design system'), headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
