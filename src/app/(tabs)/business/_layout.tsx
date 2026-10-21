import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/lib/i18n';

export default function BusinessStack() {
  const tr = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: tr('Business') }} />
      <Stack.Screen name="customers" options={{ title: tr('Customers'), headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
