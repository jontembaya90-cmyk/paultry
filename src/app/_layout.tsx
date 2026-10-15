import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import symbolsRegular from 'expo-symbols/androidWeights/regular';
import { useEffect } from 'react';
import { Appearance, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startCloudSync, stopCloudSync } from '@/data/cloud';
import { ensureToday, useFarm } from '@/data/store';
import { useAuth } from '@/lib/auth';
import { usePushNotifications } from '@/lib/notifications';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const farm = useFarm();
  const auth = useAuth();
  const c = useTheme();
  const [loaded, error] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    // Preload the Material Symbols face so Android icons never flash in empty.
    [symbolsRegular.name]: symbolsRegular.font,
  });

  // The deep-blue theme is dark: keep system chrome (dialogs, keyboard, date pickers) dark too.
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') Appearance.setColorScheme('dark');
  }, []);

  // Build today's task list on launch and whenever the app returns on a new day.
  useEffect(() => {
    ensureToday();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && ensureToday());
    return () => sub.remove();
  }, []);

  // Mirror the farm to Firestore while signed in.
  const user = auth.status === 'signedIn' ? auth.user : undefined;
  useEffect(() => {
    if (user) void startCloudSync(user);
    else stopCloudSync();
  }, [user]);

  // Ask for notifications once the farm is set up (never on the sign-in or welcome screens),
  // and route taps on a push to the screen it names.
  const fontsReady = loaded || !!error;
  usePushNotifications(user?.uid, fontsReady && !!user && farm.onboarded);

  // Hold the splash until fonts load and Firebase has restored any saved session.
  const ready = (loaded || !!error) && auth.status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = c.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.bg, text: c.ink, primary: c.yolkText, border: c.hairline, notification: c.barn },
  };

  const { settings } = farm;
  // 'unavailable' is an older dev build without the auth native modules: let it through.
  const signedIn = auth.status === 'signedIn' || auth.status === 'unavailable';
  const onboarded = signedIn && farm.onboarded;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !farm.onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={onboarded && !settings.workerMode}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="sale" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded && settings.workerMode}>
            <Stack.Screen name="worker" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen
              name="quick-log"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.72, 1],
                sheetGrabberVisible: true,
                sheetCornerRadius: 28,
                contentStyle: { backgroundColor: c.bg },
              }}
            />
            <Stack.Screen name="log-eggs" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="log/[kind]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="close-coop" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Screen name="explore" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
