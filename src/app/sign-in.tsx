import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { GradientFill } from '@/components/gradient-fill';
import { Illustration } from '@/components/illustration';
import { Banner } from '@/components/surface';
import { Txt } from '@/components/text';
import { AuthError, signInWithGoogle } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { fonts, space, useTheme } from '@/theme';

/** The multicolour Google "G", as Google's branding guidelines require on sign-in buttons. */
function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export default function SignIn() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const enter = (delay: number) => (reduced ? FadeIn.duration(300) : FadeInDown.delay(delay).springify().damping(18));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onGoogle() {
    setBusy(true);
    setError(undefined);
    try {
      // On success the root layout's auth guard moves on to onboarding or Today.
      if (await signInWithGoogle()) haptic.success();
    } catch (e) {
      haptic.warning();
      setError(e instanceof AuthError ? e.message : 'Couldn’t sign in with Google. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: insets.top + space.xxl,
        paddingBottom: insets.bottom + space.xl,
        paddingHorizontal: space.gutter,
      }}>
      {/* First light over deep blue: a lifted navy at the top fading into the background. */}
      <GradientFill stops={[[0, '#21447F'], [0.4, '#14305E'], [0.8, c.bg]]} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={reduced ? FadeIn : FadeIn.duration(900)}>
          <Illustration name="sunrise" size={220} />
        </Animated.View>
        <Animated.View entering={enter(200)} style={{ alignItems: 'center', gap: space.xs }}>
          <Txt variant="label" tone="secondary" style={{ letterSpacing: 4, fontFamily: fonts.display }}>
            ROOST
          </Txt>
          <Txt variant="largeTitle" center accessibilityRole="header">
            Good morning.
          </Txt>
          <Txt variant="body" tone="secondary" center>
            Sign in to keep your farm records safe and with you, on any phone.
          </Txt>
        </Animated.View>
      </View>
      <Animated.View entering={enter(400)} style={{ gap: space.md, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        {error && <Banner tone="barn" icon="error" title="Not signed in" body={error} />}
        <Button variant="ghost" size="xl" full loading={busy} onPress={onGoogle} accessibilityLabel="Continue with Google" style={{ backgroundColor: c.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <GoogleG />
            <Txt variant="title3">Continue with Google</Txt>
          </View>
        </Button>
        <Txt variant="caption" tone="tertiary" center>
          Signing in needs signal once. After that ROOST works offline.
        </Txt>
      </Animated.View>
    </View>
  );
}
