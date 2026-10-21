import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GradientFill } from '@/components/gradient-fill';
import { Illustration } from '@/components/illustration';
import { LanguageSwitch } from '@/components/language-switch';
import { Txt } from '@/components/text';
import { loadSampleFarm } from '@/data/store';
import { useT } from '@/lib/i18n';
import { fonts, space, useTheme } from '@/theme';

export default function Welcome() {
  const c = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const enter = (delay: number) => (reduced ? FadeIn.duration(300) : FadeInDown.delay(delay).springify().damping(18));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: insets.top + space.lg,
        paddingBottom: insets.bottom + space.xl,
        paddingHorizontal: space.gutter,
      }}>
      {/* First light over deep blue: a lifted navy at the top fading into the background. */}
      <GradientFill stops={[[0, '#21447F'], [0.4, '#14305E'], [0.8, c.bg]]} />
      <Animated.View entering={reduced ? FadeIn : FadeIn.duration(600)} style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <LanguageSwitch />
      </Animated.View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={reduced ? FadeIn : FadeIn.duration(900)}>
          <Illustration name="sunrise" size={240} />
        </Animated.View>
        <Animated.View entering={enter(200)} style={{ alignItems: 'center', gap: space.xs }}>
          <Txt variant="label" tone="secondary" style={{ letterSpacing: 4, fontFamily: fonts.display }}>
            ROOST
          </Txt>
          <Txt variant="largeTitle" center accessibilityRole="header">
            {tr('Let’s set up your farm.')}
          </Txt>
          <Txt variant="body" tone="secondary" center>
            {tr('Your whole flock, at a glance. Log in seconds, see what needs you, and keep every bird healthy.')}
          </Txt>
        </Animated.View>
      </View>
      <Animated.View entering={enter(400)} style={{ gap: space.md, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Button title={tr('Set up my farm')} size="xl" full onPress={() => router.push('/onboarding/farm')} />
        <Button
          title={tr('Explore a sample farm')}
          variant="ghost"
          full
          accessibilityHint={tr('Opens Sunrise Poultry Farm with example flocks, so you can look around first')}
          onPress={() => loadSampleFarm()}
        />
        <Txt variant="caption" tone="tertiary" center>
          {tr('Works offline. Everything is saved on this phone first.')}
        </Txt>
      </Animated.View>
    </View>
  );
}
