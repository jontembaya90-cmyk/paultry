import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';

export default function FlocksStack() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: 'Flocks' }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="incubator/[id]" options={{ title: 'Incubator', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
