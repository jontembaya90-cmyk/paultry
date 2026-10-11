import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';

export default function TodayStack() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Today' }} />
      <Stack.Screen name="feed" options={{ title: 'Feed & water', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
