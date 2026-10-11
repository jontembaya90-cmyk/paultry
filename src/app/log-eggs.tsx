import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/button';
import { StackedBar } from '@/components/charts';
import { Segmented } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { Banner } from '@/components/surface';
import { Txt } from '@/components/text';
import { TrayGlyph } from '@/components/today-parts';
import { breedById } from '@/data/breeds';
import { EGGS_PER_TRAY, fmt, today } from '@/data/format';
import { activeFlocks, eggsOn, houseName, isLaying, withdrawalFor } from '@/data/selectors';
import { logEggs, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { dismiss } from '@/lib/nav';
import { parseEggSpeech } from '@/lib/voice-parse';
import { fonts, motion, radius, space, touch, useTheme } from '@/theme';

type Mode = 'trays' | 'keypad' | 'voice';
type Grade = 'medium' | 'small' | 'cracked' | 'dirty';

const GRADES: { key: Grade | 'large'; label: string }[] = [
  { key: 'large', label: 'Large' },
  { key: 'medium', label: 'Medium' },
  { key: 'small', label: 'Small' },
  { key: 'cracked', label: 'Cracked' },
  { key: 'dirty', label: 'Dirty' },
];

export default function LogEggs() {
  const c = useTheme();
  const farm = useFarm();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const flocks = activeFlocks(farm).filter((f) => isLaying(f));
  const [flockId, setFlockId] = useState(flocks[0]?.id ?? '');
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState<Mode>('trays');
  const [grades, setGrades] = useState<Record<Grade, number>>({ medium: 0, small: 0, cracked: 0, dirty: 0 });
  const [speech, setSpeech] = useState('');
  const [saved, setSaved] = useState(false);

  const flock = flocks.find((f) => f.id === flockId);
  const soFar = eggsOn(farm, today(), flockId || undefined);
  const graded = grades.medium + grades.small + grades.cracked + grades.dirty;
  const large = Math.max(0, count - graded);
  const withdrawal = withdrawalFor(farm, flockId);

  const bump = useSharedValue(1);
  const counterStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const pulse = (big: boolean) => {
    if (reduced) return;
    bump.set(withSequence(withTiming(big ? 1.08 : 1.03, { duration: 70 }), withSpring(1, motion.snappy)));
  };

  const add = (n: number) => {
    const next = Math.max(0, count + n);
    if (next === count) return;
    if (Math.abs(n) >= EGGS_PER_TRAY) haptic.tray();
    else haptic.tick();
    pulse(Math.abs(n) >= EGGS_PER_TRAY);
    setCount(next);
    clampGrades(next);
  };

  const clampGrades = (total: number) => {
    setGrades((g) => {
      let over = g.medium + g.small + g.cracked + g.dirty - total;
      if (over <= 0) return g;
      const out = { ...g };
      for (const k of ['medium', 'small', 'dirty', 'cracked'] as Grade[]) {
        const cut = Math.min(out[k], over);
        out[k] -= cut;
        over -= cut;
      }
      return out;
    });
  };

  const onSpeech = (text: string) => {
    setSpeech(text);
    const r = parseEggSpeech(text);
    if (r.house) {
      const match = flocks.find((f) => houseName(farm, f).toLowerCase().replace('house ', '') === r.house);
      if (match) setFlockId(match.id);
    }
    if (r.total !== undefined) {
      setCount(r.total);
      setGrades({ medium: r.medium ?? 0, small: r.small ?? 0, cracked: r.cracked ?? 0, dirty: r.dirty ?? 0 });
    }
  };

  // Save → the button morphs into a checkmark while an egg drops into it.
  const morph = useSharedValue(0);
  const drop = useSharedValue(-90);
  const saveStyle = useAnimatedStyle(() => ({
    width: `${100 - morph.value * 100}%`,
    minWidth: touch.hero,
    alignSelf: 'center',
  }));
  const eggStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }], opacity: drop.value < -80 ? 0 : 1 }));

  const save = () => {
    if (!flock || count === 0 || saved) return;
    logEggs({ flockId: flock.id, large, ...grades });
    setSaved(true);
    haptic.success();
    if (reduced) {
      setTimeout(() => dismiss(), 700);
      return;
    }
    morph.set(withSpring(1, motion.spring));
    drop.set(withDelay(120, withSpring(0, { duration: 500, dampingRatio: 0.55 })));
    setTimeout(() => dismiss(), 1100);
  };

  if (!flocks.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.md, paddingHorizontal: space.gutter, gap: space.xl }}>
        <IconButton icon="close" label="Close" onPress={() => dismiss()} />
        <Banner tone="sky" icon="egg" title="No laying flocks yet" body="Egg logging opens when a flock reaches point of lay. Until then, log feed, water and weights." />
      </View>
    );
  }

  const unit = flock ? breedById(flock.breedId) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.gutter, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
          <IconButton icon="close" label="Close without saving" onPress={() => dismiss()} />
          <Txt variant="title3" accessibilityRole="header">
            Log eggs
          </Txt>
          <View style={{ alignItems: 'flex-end', minWidth: 48 }}>
            <Txt variant="caption" tone="secondary">
              Today
            </Txt>
            <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
              {fmt.int(soFar)}
            </Txt>
          </View>
        </View>
        {flocks.length > 1 ? (
          <Segmented options={flocks.map((f) => ({ value: f.id, label: houseName(farm, f) }))} value={flockId} onChange={setFlockId} />
        ) : (
          <Txt variant="subhead" tone="secondary" center>
            {flock ? `${houseName(farm, flock)} · ${unit?.name}` : ''}
          </Txt>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        {withdrawal && (
          <Banner tone="barn" icon="medication" title={`Withdrawal until ${fmt.monthDay(withdrawal.withdrawalUntil)}`} body="Log these eggs as usual. They can’t be sold until the withdrawal ends." />
        )}

        {/* The giant counter */}
        <Animated.View
          style={[{ alignItems: 'center', gap: space.xs }, counterStyle]}
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${count} eggs, that is ${fmt.trays(count)}`}>
          <Txt variant="hero" style={{ fontSize: 96, lineHeight: 104 }} selectable>
            {fmt.int(count)}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <TrayGlyph size={20} filled={count % EGGS_PER_TRAY === 0 && count > 0 ? 30 : count % EGGS_PER_TRAY} />
            <Txt variant="title3" tone="secondary">
              {count === 0 ? 'eggs' : fmt.trays(count)}
            </Txt>
          </View>
        </Animated.View>

        <Segmented
          options={[
            { value: 'trays', label: 'Trays', icon: 'tray' },
            { value: 'keypad', label: 'Keypad', icon: 'keypad' },
            { value: 'voice', label: 'Voice', icon: 'note' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'trays' && (
          <Animated.View entering={FadeIn.duration(motion.fade)} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <BigKey label="+1 tray" sub="30 eggs" icon="tray" primary flex={3} onPress={() => add(EGGS_PER_TRAY)} onLong={() => add(EGGS_PER_TRAY * 5)} />
              <BigKey label="+1 egg" icon="egg" flex={2} onPress={() => add(1)} onLong={() => add(10)} />
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <SmallKey label="−1 tray" onPress={() => add(-EGGS_PER_TRAY)} />
              <SmallKey label="−1 egg" onPress={() => add(-1)} />
            </View>
            <Txt variant="caption" tone="secondary" center>
              Hold +1 tray to add 5 trays · hold +1 egg to add 10
            </Txt>
          </Animated.View>
        )}

        {mode === 'keypad' && (
          <Animated.View entering={FadeIn.duration(motion.fade)} style={{ gap: space.sm }}>
            {[[1, 2, 3], [4, 5, 6], [7, 8, 9], ['clear', 0, 'back']].map((row, r) => (
              <View key={r} style={{ flexDirection: 'row', gap: space.sm }}>
                {row.map((k) => (
                  <Pressable
                    key={String(k)}
                    accessibilityRole="button"
                    accessibilityLabel={k === 'back' ? 'Delete last digit' : k === 'clear' ? 'Clear' : String(k)}
                    onPress={() => {
                      haptic.tick();
                      let next = count;
                      if (k === 'back') next = Math.floor(count / 10);
                      else if (k === 'clear') next = 0;
                      else next = Math.min(99999, count * 10 + (k as number));
                      setCount(next);
                      clampGrades(next);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 68,
                      borderRadius: radius.md,
                      borderCurve: 'continuous',
                      backgroundColor: pressed ? c.straw : typeof k === 'number' ? c.surface : c.surfaceAlt,
                      boxShadow: typeof k === 'number' ? c.shadowCard : undefined,
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}>
                    {k === 'back' ? (
                      <Icon name="backspace" size={28} color={c.ink} />
                    ) : (
                      <Txt variant={k === 'clear' ? 'headline' : 'title'} style={{ fontFamily: k === 'clear' ? undefined : fonts.display }}>
                        {k === 'clear' ? 'Clear' : k}
                      </Txt>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </Animated.View>
        )}

        {mode === 'voice' && (
          <Animated.View entering={FadeIn.duration(motion.fade)} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md, backgroundColor: c.skySoft, padding: space.lg, borderRadius: radius.md, borderCurve: 'continuous' }}>
              <Icon name="note" size={24} color={c.skyText} />
              <Txt variant="callout" style={{ flex: 1 }}>
                Tap the box, then the microphone on your keyboard, and say something like: “Two hundred forty eggs, House A, twelve cracked.”
              </Txt>
            </View>
            <TextInput
              value={speech}
              onChangeText={onSpeech}
              multiline
              autoFocus
              placeholder="Say or type the count…"
              placeholderTextColor={c.inkTertiary}
              accessibilityLabel="Spoken egg count"
              style={{ minHeight: 96, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline, padding: space.lg, fontSize: 20, color: c.ink, textAlignVertical: 'top' }}
            />
            {speech.length > 0 && (
              <Txt variant="subhead" tone="secondary">
                {count > 0
                  ? `Heard ${fmt.int(count)} eggs${graded ? `, ${[grades.cracked && `${grades.cracked} cracked`, grades.dirty && `${grades.dirty} dirty`, grades.small && `${grades.small} small`].filter(Boolean).join(', ')}` : ''}${flock ? ` for ${houseName(farm, flock)}` : ''}.`
                  : 'Listening for a number of eggs or trays…'}
              </Txt>
            )}
          </Animated.View>
        )}

        {/* Grades */}
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt variant="title3">Grades</Txt>
            <Txt variant="caption" tone="secondary">
              Large is everything not counted below
            </Txt>
          </View>
          <StackedBar
            parts={[
              { label: 'Large', value: large, color: c.yolk },
              { label: 'Medium', value: grades.medium, color: c.wheat },
              { label: 'Small', value: grades.small, color: c.straw },
              { label: 'Cracked', value: grades.cracked, color: c.barn },
              { label: 'Dirty', value: grades.dirty, color: c.inkTertiary },
            ]}
          />
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderCurve: 'continuous', paddingHorizontal: space.lg, boxShadow: c.shadowCard }}>
            {GRADES.map((g, i) => (
              <View
                key={g.key}
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: touch.log + 8, gap: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.hairline }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: [c.yolk, c.wheat, c.straw, c.barn, c.inkTertiary][i] }} />
                <Txt variant="headline" style={{ flex: 1 }}>
                  {g.label}
                </Txt>
                {g.key === 'large' ? (
                  <Txt variant="title3" style={{ fontVariant: ['tabular-nums'], minWidth: 56, textAlign: 'center' }}>
                    {fmt.int(large)}
                  </Txt>
                ) : (
                  <MiniStepper
                    label={g.label}
                    value={grades[g.key as Grade]}
                    onChange={(v) => {
                      const k = g.key as Grade;
                      const room = count - (graded - grades[k]);
                      setGrades({ ...grades, [k]: Math.max(0, Math.min(room, v)) });
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Save */}
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: insets.bottom + space.lg, borderTopWidth: 1, borderTopColor: c.hairline }}>
        <Animated.View style={saveStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Saved' : count ? `Save ${count} eggs` : 'Add eggs to save'}
            accessibilityState={{ disabled: count === 0 || saved }}
            disabled={count === 0 || saved}
            onPress={save}
            style={({ pressed }) => ({
              height: touch.hero,
              borderRadius: saved ? touch.hero / 2 : radius.lg,
              borderCurve: 'continuous',
              backgroundColor: saved ? c.sage : c.yolk,
              opacity: count === 0 ? 0.45 : 1,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.98 : 1 }],
              overflow: 'visible',
            })}>
            {saved ? (
              <>
                <Animated.View style={[{ position: 'absolute', top: -14 }, eggStyle]}>
                  <Icon name="egg" size={28} color={c.onSage} />
                </Animated.View>
                <Animated.View entering={reduced ? undefined : ZoomIn.delay(420).springify().damping(10)}>
                  <Icon name="check" size={36} color="#FFFFFF" />
                </Animated.View>
              </>
            ) : (
              <Txt variant="title3" color={c.onYolk}>
                {count ? `Save ${fmt.int(count)} eggs` : 'Save'}
              </Txt>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function BigKey({ label, sub, icon, primary, flex, onPress, onLong }: { label: string; sub?: string; icon: IconName; primary?: boolean; flex: number; onPress: () => void; onLong: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label.replace('+', 'Add ')}
      accessibilityHint="Hold to add more at once"
      onPress={onPress}
      onLongPress={onLong}
      delayLongPress={450}
      android_ripple={{ color: c.track }}
      style={({ pressed }) => ({
        flex,
        height: 120,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: primary ? c.yolk : c.surface,
        boxShadow: primary ? undefined : c.shadowCard,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.xs,
        overflow: 'hidden',
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      <Icon name={icon} size={30} color={primary ? c.onYolk : c.ink} />
      <Txt variant="title2" color={primary ? c.onYolk : c.ink}>
        {label}
      </Txt>
      {sub && (
        <Txt variant="caption" color={primary ? c.onYolk : c.inkSecondary}>
          {sub}
        </Txt>
      )}
    </Pressable>
  );
}

function SmallKey({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label.replace('−', 'Remove ')}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: touch.log,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: c.hairline,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? c.surfaceAlt : 'transparent',
      })}>
      <Txt variant="headline">{label}</Txt>
    </Pressable>
  );
}

function MiniStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const c = useTheme();
  const btn = (icon: IconName, d: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d > 0 ? 'More' : 'Fewer'} ${label.toLowerCase()} eggs`}
      onPress={() => {
        haptic.tick();
        onChange(value + d);
      }}
      onLongPress={() => {
        haptic.tray();
        onChange(value + d * 10);
      }}
      style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 16, backgroundColor: pressed ? c.straw : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' })}>
      <Icon name={icon} size={24} color={c.ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessible={false}>
      {btn('remove', -1)}
      <Txt variant="title3" style={{ fontVariant: ['tabular-nums'], minWidth: 48, textAlign: 'center' }} accessibilityLabel={`${value} ${label}`}>
        {value}
      </Txt>
      {btn('add', 1)}
    </View>
  );
}
