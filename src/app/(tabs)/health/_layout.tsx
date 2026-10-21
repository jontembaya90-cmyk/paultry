import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/lib/i18n';

export default function HealthStack() {
  const tr = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: tr('Health') }} />
      <Stack.Screen name="symptoms" options={{ title: tr('Symptom check'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="guide" options={{ title: tr('Care guide'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="biosecurity" options={{ title: tr('Biosecurity'), headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
