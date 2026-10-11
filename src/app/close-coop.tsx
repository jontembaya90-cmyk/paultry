import { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/button';
import { GradientFill } from '@/components/gradient-fill';
import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/text';
import { addDays, daysBetween, fmt, today } from '@/data/format';
import { daySummary, houseName, vaccineDue } from '@/data/selectors';
import { closeCoop, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { dismiss } from '@/lib/nav';
import { fonts, radius, space } from '@/theme';

// Dusk is the same in both themes: this screen is the end of the day, whatever the setting.
const DUSK = {
  ink: '#FFF7EA',
  soft: 'rgba(255, 247, 234, 0.82)',
  card: 'rgba(255, 255, 255, 0.12)',
  hill: '#241F33',
  coop: '#17141F',
  window: '#F5B700',
};

const STARS = [
  [0.12, 0.1, 1.6], [0.28, 0.2, 1.1], [0.46, 0.08, 1.4], [0.63, 0.16, 1], [0.8, 0.07, 1.8], [0.9, 0.22, 1.2],
  [0.2, 0.32, 0.9], [0.72, 0.3, 1.1], [0.55, 0.27, 0.8], [0.06, 0.24, 1.0],
] as const;

function Star({ x, y, r, i, still }: { x: number; y: number; r: number; i: number; still: boolean }) {
  const o = useSharedValue(still ? 0.8 : 0);
  useEffect(() => {
    if (still) return;
    o.set(
      withDelay(
        900 + i * 160,
        withSequence(
          withTiming(0.9, { duration: 900, easing: Easing.out(Easing.quad) }),
          withRepeat(withSequence(withTiming(0.45, { duration: 1600 + i * 90, easing: Easing.inOut(Easing.sin) }), withTiming(0.9, { duration: 1600 + i * 90, easing: Easing.inOut(Easing.sin) })), -1),
        ),
      ),
    );
  }, [still, i, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: '#FFF7EA' }, style]} />;
}

export default function CloseTheCoop() {
  const farm = useFarm();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const t = today();
  const s = daySummary(farm, t);
  const perfect = s.losses === 0 && s.tasksDone === s.tasksTotal;
  const sceneH = Math.min(320, height * 0.38);

  const sun = useSharedValue(reduced ? sceneH * 0.18 : -sceneH * 0.05);
  useEffect(() => {
    haptic.success();
    if (!reduced) sun.set(withSpring(sceneH * 0.18, { duration: 2600, dampingRatio: 1 }));
  }, [reduced, sceneH, sun]);
  const sunStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sun.value }] }));

  // What tomorrow brings: vaccines and hatchery milestones due tomorrow.
  const tomorrow = addDays(t, 1);
  const next: string[] = [];
  for (const v of farm.vaccinations) {
    const f = farm.flocks.find((x) => x.id === v.flockId);
    if (!v.doneOn && f?.status === 'active' && vaccineDue(farm, v) === tomorrow) next.push(`${v.name}, ${houseName(farm, f)}`);
  }
  for (const inc of farm.incubators) {
    const d = daysBetween(inc.setOn, tomorrow);
    if (inc.hatched === undefined && (d === 7 || d === 14 || d === 18 || d === 21)) next.push(`${inc.name}: ${d === 18 ? 'lockdown' : d === 21 ? 'hatch day' : 'candling'}`);
  }

  const stats: { icon: IconName; value: string; label: string }[] = [
    { icon: 'egg', value: fmt.int(s.eggs), label: s.eggs === 1 ? 'egg' : 'eggs' },
    { icon: 'hen', value: String(s.losses), label: s.losses === 1 ? 'loss' : 'losses' },
    { icon: 'checkCircle', value: `${s.tasksDone}/${s.tasksTotal}`, label: 'tasks' },
  ];
  if (s.vaccines) stats.push({ icon: 'vaccine', value: String(s.vaccines), label: s.vaccines === 1 ? 'vaccine' : 'vaccines' });

  const sentence = [
    `${fmt.int(s.eggs)} eggs`,
    `${s.losses} ${s.losses === 1 ? 'loss' : 'losses'}`,
    s.tasksDone === s.tasksTotal ? 'all tasks done' : `${s.tasksTotal - s.tasksDone} tasks left`,
  ].join(', ');

  const enter = (d: number) => (reduced ? FadeIn.duration(400) : FadeInDown.delay(d).springify().damping(18));

  return (
    <View style={{ flex: 1, backgroundColor: '#1F1D3A' }}>
      <GradientFill stops={[[0, '#1F1D3A'], [0.3, '#4A3558'], [0.58, '#9A5560'], [0.82, '#E08A5A'], [1, '#F4B266']]} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl, gap: space.xl, minHeight: height }}>
        {/* Scene: stars, setting sun, the coop on the hill */}
        <View style={{ height: sceneH, width }} accessible={false} importantForAccessibility="no-hide-descendants">
          {STARS.map(([x, y, r], i) => (
            <Star key={i} x={x * width} y={y * sceneH} r={r * 1.3} i={i} still={reduced} />
          ))}
          <Animated.View style={[{ position: 'absolute', left: width / 2 - 70, top: sceneH * 0.32 }, sunStyle]}>
            <Svg width={140} height={140}>
              <Defs>
                <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFE08A" />
                  <Stop offset="0.55" stopColor="#F5B700" stopOpacity={0.9} />
                  <Stop offset="1" stopColor="#F5B700" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={70} cy={70} r={70} fill="url(#sun)" />
              <Circle cx={70} cy={70} r={34} fill="#FFD65C" />
            </Svg>
          </Animated.View>
          <Svg width={width} height={sceneH * 0.5} style={{ position: 'absolute', bottom: 0 }} viewBox={`0 0 ${width} ${sceneH * 0.5}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={DUSK.hill} />
                <Stop offset="0.55" stopColor={DUSK.hill} stopOpacity={0.85} />
                <Stop offset="1" stopColor={DUSK.hill} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={`M0 ${sceneH * 0.22} Q ${width * 0.3} ${sceneH * 0.05} ${width * 0.55} ${sceneH * 0.16} T ${width} ${sceneH * 0.12} V ${sceneH * 0.5} H 0 Z`} fill="url(#hill)" />
            {/* The coop: gable roof, a lit window, a little ramp. */}
            <Path
              d={`M${width * 0.64} ${sceneH * 0.2} l ${sceneH * 0.11} ${-sceneH * 0.11} l ${sceneH * 0.11} ${sceneH * 0.11} v ${sceneH * 0.14} h ${-sceneH * 0.22} Z`}
              fill={DUSK.coop}
            />
            <Rect x={width * 0.64 + sceneH * 0.08} y={sceneH * 0.235} width={sceneH * 0.04} height={sceneH * 0.04} rx={2} fill={DUSK.window} opacity={0.95} />
            <Path d={`M${width * 0.64 + sceneH * 0.2} ${sceneH * 0.33} l ${sceneH * 0.07} ${sceneH * 0.04}`} stroke={DUSK.coop} strokeWidth={3} />
          </Svg>
        </View>

        <View style={{ paddingHorizontal: space.gutter, gap: space.xl, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          <Animated.View entering={enter(500)} style={{ gap: space.sm }} accessible accessibilityRole="header" accessibilityLabel={`${perfect ? 'Great day.' : 'Good work today.'} ${sentence}.`}>
            <Txt variant="largeTitle" color={DUSK.ink} style={{ fontSize: 44, lineHeight: 50 }}>
              {perfect ? 'Great day.' : 'Good work today.'}
            </Txt>
            <Txt variant="title3" color={DUSK.soft}>
              {sentence.charAt(0).toUpperCase() + sentence.slice(1)}.
            </Txt>
          </Animated.View>

          <Animated.View entering={enter(700)} style={{ flexDirection: 'row', gap: space.sm }}>
            {stats.map((st) => (
              <View key={st.label} style={{ flex: 1, backgroundColor: DUSK.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.md, gap: space.xs, alignItems: 'center' }}>
                <Icon name={st.icon} size={22} color={DUSK.ink} />
                <Txt variant="title2" color={DUSK.ink} style={{ fontFamily: fonts.display, fontVariant: ['tabular-nums'] }}>
                  {st.value}
                </Txt>
                <Txt variant="caption" color={DUSK.soft}>
                  {st.label}
                </Txt>
              </View>
            ))}
          </Animated.View>

          {next.length > 0 && (
            <Animated.View entering={enter(900)} style={{ backgroundColor: DUSK.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name="sun" size={18} color={DUSK.ink} />
                <Txt variant="label" color={DUSK.soft}>
                  TOMORROW
                </Txt>
              </View>
              {next.map((n) => (
                <Txt key={n} variant="headline" color={DUSK.ink}>
                  {n}
                </Txt>
              ))}
            </Animated.View>
          )}

          <Animated.View entering={enter(1100)} style={{ gap: space.md }}>
            <Button
              title="Goodnight"
              icon="moon"
              size="xl"
              full
              onPress={() => {
                closeCoop();
                dismiss();
              }}
            />
            <Txt variant="caption" color={DUSK.soft} center>
              Everything is saved. Sleep well.
            </Txt>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
