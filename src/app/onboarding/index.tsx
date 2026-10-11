import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GradientFill } from '@/components/gradient-fill';
import { Illustration } from '@/components/illustration';
import { Txt } from '@/components/text';
import { loadSampleFarm } from '@/data/store';
import { fonts, space, useTheme } from '@/theme';

export default function Welcome() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const dark = c.scheme === 'dark';
  const enter = (delay: number) => (reduced ? FadeIn.duration(300) : FadeInDown.delay(delay).springify().damping(18));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: insets.top + space.xxl,
        paddingBottom: insets.bottom + space.xl,
        paddingHorizontal: space.gutter,
      }}>
      {/* A gentle sunrise: warm yolk light at the top fading into Feather (or Coop Night at dawn). */}
      <GradientFill stops={dark ? [[0, '#3A2A2A'], [0.3, '#2A2226'], [0.7, '#14161A']] : [[0, '#FFE3A3'], [0.35, '#FDF0D2'], [0.75, '#FBF8F2']]} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={reduced ? FadeIn : FadeIn.duration(900)}>
          <Illustration name="sunrise" size={240} />
        </Animated.View>
        <Animated.View entering={enter(200)} style={{ alignItems: 'center', gap: space.xs }}>
          <Txt variant="label" tone="secondary" style={{ letterSpacing: 4, fontFamily: fonts.display }}>
            ROOST
          </Txt>
          <Txt variant="largeTitle" center accessibilityRole="header">
            Let’s set up your farm.
          </Txt>
          <Txt variant="body" tone="secondary" center>
            Your whole flock, at a glance. Log in seconds, see what needs you, and keep every bird healthy.
          </Txt>
        </Animated.View>
      </View>
      <Animated.View entering={enter(400)} style={{ gap: space.md, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Button title="Set up my farm" size="xl" full onPress={() => router.push('/onboarding/farm')} />
        <Button
          title="Explore a sample farm"
          variant="ghost"
          full
          accessibilityHint="Opens Sunrise Poultry Farm with example flocks, so you can look around first"
          onPress={() => loadSampleFarm()}
        />
        <Txt variant="caption" tone="tertiary" center>
          Works offline. Everything is saved on this phone first.
        </Txt>
      </Animated.View>
    </View>
  );
}
