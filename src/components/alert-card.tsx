import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Button } from '@/components/button';
import { Badge } from '@/components/surface';
import { Txt } from '@/components/text';
import type { Alert } from '@/data/selectors';
import { haptic } from '@/lib/haptics';
import { motion, radius, space, toneColors, useTheme } from '@/theme';

const ICON = { barn: 'warning', yolk: 'feed', sky: 'incubator' } as const;

/**
 * Prioritised alert. Slides in with depth; swipe sideways to dismiss (a "Later" button
 * does the same for people who do not swipe).
 */
export function AlertCard({
  alert,
  index,
  onPrimary,
  onSecondary,
  onDismiss,
}: {
  alert: Alert;
  index: number;
  onPrimary: () => void;
  onSecondary?: () => void;
  onDismiss: () => void;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const t = toneColors(c, alert.tone);
  const x = useSharedValue(0);
  const width = useSharedValue(360);

  const dismiss = () => {
    haptic.tick();
    onDismiss();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      const far = Math.abs(x.value) > width.value * 0.35 || Math.abs(e.velocityX) > 900;
      if (far) {
        x.value = withTiming(Math.sign(x.value || 1) * width.value * 1.2, { duration: 220 }, () => scheduleOnRN(dismiss));
      } else {
        x.value = withSpring(0, motion.spring);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotateZ: `${interpolate(x.value, [-width.value, width.value], [-4, 4])}deg` }],
    opacity: interpolate(Math.abs(x.value), [0, width.value], [1, 0.4]),
  }));

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(index * motion.stagger).springify().damping(16)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.springify().damping(18)}>
      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={(e) => {
            width.set(e.nativeEvent.layout.width);
          }}
          accessible={false}
          accessibilityActions={[{ name: 'dismiss', label: 'Dismiss alert' }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'dismiss' && dismiss()}
          style={[
            {
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              padding: space.lg,
              gap: space.md,
              boxShadow: c.shadowCard,
              borderStartWidth: 5,
              borderStartColor: t.fill,
            },
            style,
          ]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge tone={alert.tone} icon={ICON[alert.tone]} label={alert.kicker} size="sm" />
          </View>
          <View style={{ gap: space.xs }} accessible accessibilityRole={alert.priority === 0 ? 'alert' : undefined}>
            <Txt variant="title3">{alert.title}</Txt>
            <Txt variant="body" tone="secondary">
              {alert.body}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button title={alert.primary.label} variant="tinted" tone={alert.tone === 'yolk' ? 'yolk' : alert.tone} onPress={onPrimary} style={{ flexGrow: 1 }} />
            {alert.secondary && <Button title={alert.secondary.label} variant="ghost" onPress={onSecondary} style={{ flexGrow: 1 }} />}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
