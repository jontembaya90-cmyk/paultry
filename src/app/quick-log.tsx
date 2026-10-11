import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/text';
import { haptic } from '@/lib/haptics';
import { radius, space, toneColors, useTheme, type Tone } from '@/theme';

const ITEMS: { key: string; label: string; hint: string; icon: IconName; tone: Tone; href: string }[] = [
  { key: 'eggs', label: 'Eggs', hint: 'Trays, count or voice', icon: 'egg', tone: 'yolk', href: '/log-eggs' },
  { key: 'feed', label: 'Feed', hint: 'Kilograms given', icon: 'feeder', tone: 'wheat', href: '/log/feed' },
  { key: 'water', label: 'Water', hint: 'Meter reading', icon: 'drinker', tone: 'sky', href: '/log/water' },
  { key: 'losses', label: 'Losses', hint: 'Birds lost, and why', icon: 'hen', tone: 'barn', href: '/log/losses' },
  { key: 'weight', label: 'Weight', hint: 'Sample average', icon: 'weight', tone: 'sage', href: '/log/weight' },
  { key: 'medication', label: 'Medication', hint: 'Treatment + withdrawal', icon: 'medication', tone: 'sky', href: '/log/medication' },
  { key: 'sale', label: 'Sale', hint: 'Eggs, birds, manure', icon: 'sale', tone: 'sage', href: '/sale' },
  { key: 'note', label: 'Note', hint: 'Speak or type', icon: 'note', tone: 'neutral', href: '/log/note' },
];

/** The Quick Log menu: eight big targets, two per row, in the bottom of the screen. */
export default function QuickLog() {
  const c = useTheme();
  const reduced = useReducedMotion();
  return (
    <ScrollView contentContainerStyle={{ padding: space.gutter, paddingTop: space.xl, gap: space.lg }}>
      <Txt variant="title2" accessibilityRole="header">
        What are you logging?
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {ITEMS.map((it, i) => {
          const t = toneColors(c, it.tone);
          return (
            <Animated.View
              key={it.key}
              entering={reduced ? undefined : FadeInDown.delay(i * 35).springify().damping(18)}
              style={{ flexBasis: '47%', flexGrow: 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${it.label}. ${it.hint}`}
                onPress={() => {
                  haptic.tick();
                  router.replace(it.href as never);
                }}
                android_ripple={{ color: c.track }}
                style={({ pressed }) => ({
                  minHeight: 120,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  backgroundColor: c.surface,
                  boxShadow: c.shadowCard,
                  padding: space.lg,
                  gap: space.md,
                  overflow: 'hidden',
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}>
                <View style={{ width: 48, height: 48, borderRadius: 16, borderCurve: 'continuous', backgroundColor: it.key === 'eggs' ? t.fill : t.soft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={it.icon} size={28} color={it.key === 'eggs' ? t.on : t.text} />
                </View>
                <View>
                  <Txt variant="title3">{it.label}</Txt>
                  <Txt variant="caption" tone="secondary">
                    {it.hint}
                  </Txt>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}
