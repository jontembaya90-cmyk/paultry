import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/stack-options';

export default function BusinessStack() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: 'Business' }} />
      <Stack.Screen name="customers" options={{ title: 'Customers', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
