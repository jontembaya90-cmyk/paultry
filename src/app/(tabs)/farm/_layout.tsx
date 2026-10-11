import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';

export default function FarmStack() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: 'Farm' }} />
      <Stack.Screen name="environment" options={{ title: 'Environment', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="team" options={{ title: 'Team', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="design" options={{ title: 'Design system', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
