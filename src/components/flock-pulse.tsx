import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { Icon, type IconName } from '@/components/icon';
import { Card } from '@/components/surface';
import { Txt } from '@/components/text';
import type { Vital } from '@/data/selectors';
import { useT } from '@/lib/i18n';
import { motion, space, useTheme, type Palette } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function vitalColor(c: Palette, key: Vital['key']) {
  return { lay: c.yolk, feed: c.wheat, water: c.sky, livability: c.sage }[key];
}

export function vitalTextColor(c: Palette, key: Vital['key']) {
  return { lay: c.yolkText, feed: c.wheatText, water: c.skyText, livability: c.sageText }[key];
}

const VITAL_ICON: Record<Vital['key'], IconName> = { lay: 'egg', feed: 'feed', water: 'water', livability: 'hen' };

function Ring({ r, stroke, color, track, fill, index, still }: { r: number; stroke: number; color: string; track: string; fill: number; index: number; still: boolean }) {
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    // No data yet: an empty track, not a stray round dot.
    const target = fill <= 0 ? 0 : Math.max(0.015, Math.min(1, fill));
    progress.set(still ? withTiming(target, { duration: motion.fade }) : withDelay(index * motion.stagger, withSpring(target, motion.gentle)));
  }, [fill, index, still, progress]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value), strokeOpacity: progress.value > 0.001 ? 1 : 0 }));
  return (
    <>
      <Circle r={r} cx={0} cy={0} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        r={r}
        cx={0}
        cy={0}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={props}
      />
    </>
  );
}

/** The four concentric vitals. Breathes gently unless Reduce Motion is on. */
export function PulseRings({ vitals, size, breathe = true }: { vitals: Vital[]; size: number; breathe?: boolean }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const stroke = size * 0.088;
  const gap = stroke * 0.3;
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduced || !breathe) return;
    // A slow 4-second breath, eased on both ends. Never linear, never attention-seeking.
    scale.set(
      withRepeat(
        withSequence(
          withTiming(1.018, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [reduced, breathe, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <G transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
          {vitals.map((v, i) => (
            <Ring
              key={v.key}
              r={size / 2 - stroke / 2 - i * (stroke + gap)}
              stroke={stroke}
              color={vitalColor(c, v.key)}
              track={c.track}
              fill={v.fill}
              index={i}
              still={reduced}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

function Legend({ v }: { v: Vital }) {
  const c = useTheme();
  const tr = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 }}>
      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: vitalColor(c, v.key), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={VITAL_ICON[v.key]} size={18} color={v.key === 'lay' ? c.onYolk : '#FFFFFF'} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {tr(v.label)}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
            {v.value}
          </Txt>
          {!v.ok && v.value !== '—' && <Icon name="warning" size={16} color={c.barnText} />}
        </View>
      </View>
    </View>
  );
}

export interface PulseHouse {
  flock: { id: string };
  house: string;
  vitals: Vital[];
}

/**
 * FLOCK PULSE: the signature element. Whole-farm vitals at a glance; tap to see each house.
 */
export function FlockPulseCard({
  vitals,
  houses,
  weak,
  ok,
  title,
}: {
  vitals: Vital[];
  houses: PulseHouse[];
  weak: string[];
  ok: boolean;
  /** A house name when the card shows one house instead of the whole farm. */
  title?: string;
}) {
  const c = useTheme();
  const tr = useT();
  const [open, setOpen] = useState(false);
  // One flock means nothing to break down, so the card stops being a toggle.
  const split = houses.length > 1;
  const summary = title
    ? ok ? tr('On track') : tr('Needs a look')
    : weak.length === 0 ? tr('All houses on track') : weak.length === 1 ? tr('{house} needs a look', { house: weak[0] }) : tr('{n} houses need a look', { n: weak.length });
  const spoken = vitals.map((v) => `${tr(v.label)} ${v.value}${!v.ok && v.value !== '—' ? `, ${tr('below target')}` : ''}`).join('. ');

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)}>
      <Card padded={false}>
        <Pressable
          onPress={split ? () => setOpen((o) => !o) : undefined}
          disabled={!split}
          accessibilityRole={split ? 'button' : undefined}
          accessibilityLabel={`${title ?? tr('Flock pulse')}. ${summary}. ${spoken}.`}
          accessibilityHint={split ? (open ? tr('Hides each house') : tr('Shows each house')) : undefined}
          accessibilityState={split ? { expanded: open } : undefined}
          style={{ padding: space.lg, gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <Txt variant="label" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {(title ?? tr('Flock pulse')).toUpperCase()}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 }}>
              <Icon name={ok ? 'checkCircle' : 'warning'} size={18} color={ok ? c.sageText : c.barnText} />
              <Txt variant="label" color={ok ? c.sageText : c.barnText} numberOfLines={1}>
                {summary}
              </Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
            <PulseRings vitals={vitals} size={152} />
            <View style={{ flex: 1, gap: space.xs }}>
              {vitals.map((v) => (
                <Legend key={v.key} v={v} />
              ))}
            </View>
          </View>
          {split && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs }}>
              <Txt variant="label" tone="secondary">
                {open ? tr('Hide houses') : tr('Each house')}
              </Txt>
              <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} color={c.inkSecondary} />
            </View>
          )}
        </Pressable>
        {open && split && (
          <Animated.View entering={FadeIn.duration(motion.fade)} exiting={FadeOut.duration(150)} style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md }}>
            {houses.map((h) => (
              <View
                key={h.flock.id}
                accessible
                accessibilityLabel={`${h.house}. ${h.vitals.map((v) => `${v.label} ${v.value}`).join(', ')}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.hairline }}>
                <PulseRings vitals={h.vitals} size={64} breathe={false} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="headline">{h.house}</Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 2 }}>
                    {h.vitals.map((v) => (
                      <View key={v.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Icon name={VITAL_ICON[v.key]} size={14} color={vitalTextColor(c, v.key)} />
                        <Txt variant="caption" color={!v.ok && v.value !== '—' ? c.barnText : c.inkSecondary} style={{ fontVariant: ['tabular-nums'] }}>
                          {v.value}
                        </Txt>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </Card>
    </Animated.View>
  );
}
