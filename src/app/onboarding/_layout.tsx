import { Stack } from 'expo-router';

import { DraftProvider } from '@/components/onboarding-draft';
import { useTheme } from '@/theme';

export default function OnboardingLayout() {
  const c = useTheme();
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="ready" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </DraftProvider>
  );
}
