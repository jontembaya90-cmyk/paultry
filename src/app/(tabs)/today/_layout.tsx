import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/lib/i18n';

export default function TodayStack() {
  const tr = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ headerShown: false, title: tr('Today') }} />
      <Stack.Screen name="feed" options={{ title: tr('Feed & water'), headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
