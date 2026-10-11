import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { haptic } from '@/lib/haptics';
import { motion, space, useTheme } from '@/theme';

/** Height of the Material bottom navigation bar on Android (80dp), the iOS tab bar elsewhere. */
const TAB_BAR = process.env.EXPO_OS === 'android' ? 80 : process.env.EXPO_OS === 'web' ? 64 : 56;

/**
 * The persistent Quick Log button. Yolk, 64dp, bottom-end above the tab bar, inside the
 * thumb's natural arc. Tap opens the log menu; long-press jumps straight to eggs.
 */
export function QuickLogFab() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={ZoomIn.delay(400).springify().damping(14)}
      style={[
        {
          position: 'absolute',
          end: space.gutter,
          bottom: TAB_BAR + insets.bottom + space.lg,
          borderRadius: 22,
          borderCurve: 'continuous',
          boxShadow: c.shadowRaised,
        },
        style,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick log"
        accessibilityHint="Log eggs, feed, water, losses, weight, medication, a sale or a note. Long press to log eggs."
        onPressIn={() => {
          scale.set(withSpring(0.92, motion.snappy));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, motion.spring));
        }}
        onPress={() => {
          haptic.tick();
          router.push('/quick-log');
        }}
        onLongPress={() => {
          haptic.tray();
          router.push('/log-eggs');
        }}
        android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 22,
          borderCurve: 'continuous',
          backgroundColor: c.yolk,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        <Icon name="add" size={34} color={c.onYolk} />
      </Pressable>
    </Animated.View>
  );
}

export const FAB_CLEARANCE = 64 + space.xl * 2;
