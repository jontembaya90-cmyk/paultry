import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Chip, ChipRow } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { Card, Divider } from '@/components/surface';
import { Txt } from '@/components/text';
import { SyncPill, TaskRow } from '@/components/today-parts';
import { today } from '@/data/format';
import { tasksOn } from '@/data/selectors';
import { toggleTask, updateSettings, useFarm, useSyncing } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { LANGUAGES, t as strings, taskTitle } from '@/lib/i18n';
import { motion, radius, space, toneColors, useTheme, type Tone } from '@/theme';

/**
 * Worker mode: the whole app reduced to today's own tasks and four huge logging buttons.
 * Every button leads with an icon, so it works for anyone, in any of the three languages.
 */
export default function WorkerMode() {
  const c = useTheme();
  const farm = useFarm();
  const syncing = useSyncing();
  const insets = useSafeAreaInsets();
  const lang = farm.settings.language;
  const s = strings(lang);
  const me = farm.people.find((p) => p.id === farm.settings.meId);
  const mine = tasksOn(farm, today(), me?.id);
  const open = mine.flatMap((g) => g.tasks).filter((x) => !x.doneAt).length;
  const hour = new Date().getHours();
  const hello = hour < 12 ? s.morning : hour < 17 ? s.afternoon : s.evening;

  const big: { key: string; label: string; icon: IconName; tone: Tone; href: string }[] = [
    { key: 'eggs', label: s.eggs, icon: 'egg', tone: 'yolk', href: '/log-eggs' },
    { key: 'feed', label: s.feed, icon: 'feeder', tone: 'wheat', href: '/log/feed' },
    { key: 'water', label: s.water, icon: 'drinker', tone: 'sky', href: '/log/water' },
    { key: 'losses', label: s.losses, icon: 'hen', tone: 'barn', href: '/log/losses' },
  ];

  // Leaving worker mode is deliberate: press and hold for 1.5 seconds.
  const hold = useSharedValue(0);
  const owner = farm.people.find((p) => p.role === 'owner') ?? farm.people[0];
  const exit = () => {
    haptic.success();
    updateSettings({ workerMode: false, meId: owner?.id ?? farm.settings.meId });
  };
  const holdStyle = useAnimatedStyle(() => ({ width: `${hold.value * 100}%` }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.gutter, gap: space.xl, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
        <Icon name="language" size={24} color={c.inkSecondary} />
        <ChipRow style={{ flex: 1 }}>
          {LANGUAGES.map((l) => (
            <Chip key={l.key} label={l.label} selected={lang === l.key} onPress={() => updateSettings({ language: l.key })} />
          ))}
        </ChipRow>
      </View>

      <View style={{ gap: space.xs }}>
        <Txt variant="largeTitle" accessibilityRole="header">
          {hello}
          {me?.name ? `, ${me.name}` : ''}
        </Txt>
        <SyncPill pending={farm.sync.pending} syncing={syncing} offline={farm.settings.offline} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {big.map((b) => {
          const tc = toneColors(c, b.tone);
          return (
            <Pressable
              key={b.key}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              onPress={() => {
                haptic.tick();
                router.push(b.href as never);
              }}
              android_ripple={{ color: c.track }}
              style={({ pressed }) => ({
                flexBasis: '47%',
                flexGrow: 1,
                height: 152,
                borderRadius: radius.xl,
                borderCurve: 'continuous',
                backgroundColor: b.key === 'eggs' ? tc.fill : tc.soft,
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                overflow: 'hidden',
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}>
              <Icon name={b.icon} size={64} color={b.key === 'eggs' ? tc.on : tc.text} />
              <Txt variant="title2" color={b.key === 'eggs' ? tc.on : c.ink}>
                {b.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Txt variant="title2">{s.myTasks}</Txt>
          {open > 0 && (
            <Txt variant="headline" tone="secondary">
              {s.left(open)}
            </Txt>
          )}
        </View>
        <Card style={{ paddingVertical: space.xs }}>
          {mine.every((g) => g.tasks.length === 0) || open === 0 ? (
            <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
              <Icon name="checkCircle" size={48} color={c.sageText} />
              <Txt variant="title3">{s.allDone}</Txt>
            </View>
          ) : (
            mine.flatMap((g) => g.tasks).map((task, i) => (
              <Fragment key={task.id}>
                {i > 0 && <Divider inset={40 + space.md} />}
                <TaskRow big task={{ ...task, title: taskTitle(task.title, lang) }} onToggle={() => toggleTask(task.id)} />
              </Fragment>
            ))
          )}
        </Card>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.hold}
        accessibilityHint="Press and hold for one and a half seconds"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={exit}
        onPressIn={() => {
          hold.set(
            withTiming(1, { duration: 1500 }, (finished) => {
              if (finished) scheduleOnRN(exit);
            }),
          );
        }}
        onPressOut={() => {
          hold.set(withSpring(0, motion.spring));
        }}
        style={{ height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: c.hairline, overflow: 'hidden', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: c.straw }, holdStyle]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
          <Icon name="lock" size={18} color={c.inkSecondary} />
          <Txt variant="headline" tone="secondary">
            {s.hold}
          </Txt>
        </View>
      </Pressable>
    </ScrollView>
  );
}
