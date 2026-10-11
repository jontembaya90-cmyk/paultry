import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';

export default function HealthStack() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: 'Health' }} />
      <Stack.Screen name="symptoms" options={{ title: 'Symptom check', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="biosecurity" options={{ title: 'Biosecurity', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
