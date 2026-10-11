import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { Button, IconButton } from '@/components/button';
import { Chip, ChipRow, Field, Stepper } from '@/components/controls';
import { OnboardingFrame } from '@/components/onboarding-frame';
import { useDraft } from '@/components/onboarding-draft';
import { Card } from '@/components/surface';
import { Txt } from '@/components/text';
import type { HouseType } from '@/data/types';
import { space, useTheme } from '@/theme';

const TYPES: { key: HouseType; label: string }[] = [
  { key: 'deep-litter', label: 'Deep litter' },
  { key: 'cage', label: 'Cage' },
  { key: 'free-range', label: 'Free-range' },
];

/** A to-scale sketch of the farm: each house's footprint grows with its capacity. */
function FloorPlan({ houses }: { houses: { name: string; capacity: number; type: HouseType }[] }) {
  const c = useTheme();
  const [w, setW] = useState(0);
  const h = 132;
  const total = houses.reduce((n, x) => n + Math.max(50, x.capacity), 0);
  const gap = 10;
  const usable = Math.max(0, w - gap * (houses.length + 1));
  // Left edge of each house, laid out side by side in proportion to capacity.
  const xs = houses.map((_, i) => gap + houses.slice(0, i).reduce((n, p) => n + (Math.max(50, p.capacity) / total) * usable + gap, 0));
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Farm plan: ${houses.map((hs) => `${hs.name}, ${hs.capacity} birds, ${hs.type.replace('-', ' ')}`).join('; ')}`}>
      {w > 0 && <Svg width={w} height={h}>
        <Rect x={0} y={0} width={w} height={h} rx={18} fill={c.sageSoft} />
        {houses.map((house, i) => {
          const bw = (Math.max(50, house.capacity) / total) * usable;
          const bx = xs[i];
          const free = house.type === 'free-range';
          const bh = free ? 56 : 84;
          const by = 18;
          return (
            <G key={i}>
              {free && <Rect x={bx} y={by + bh + 4} width={bw} height={h - by - bh - 14} rx={8} fill="none" stroke={c.sageText} strokeDasharray="4 4" strokeWidth={1.5} />}
              <Rect x={bx} y={by} width={bw} height={bh} rx={10} fill={c.surface} stroke={c.wheat} strokeWidth={2} />
              {house.type === 'cage' &&
                [1, 2, 3].map((r) => <Line key={r} x1={bx + 6} x2={bx + bw - 6} y1={by + (bh / 4) * r} y2={by + (bh / 4) * r} stroke={c.wheat} strokeWidth={1} opacity={0.6} />)}
              {house.type === 'deep-litter' &&
                Array.from({ length: Math.max(0, Math.floor((bw - 16) / 12)) }).flatMap((_, k) =>
                  [0, 1].map((r) => <Circle key={`${k}-${r}`} cx={bx + 14 + k * 12} cy={by + bh - 22 + r * 10} r={2} fill={c.wheat} opacity={0.6} />),
                )}
              <SvgText x={bx + bw / 2} y={by + (house.type === 'deep-litter' ? bh / 2 - 4 : bh / 2 + 5)} fontSize={bw < 60 ? 10 : 13} fontWeight="700" fill={c.ink} textAnchor="middle">
                {house.name.replace('House ', '') || '?'}
              </SvgText>
            </G>
          );
        })}
      </Svg>}
    </View>
  );
}

export default function HousesStep() {
  const { draft, update } = useDraft();
  const houses = draft.houses;
  const set = (i: number, patch: Partial<(typeof houses)[number]>) => update({ houses: houses.map((h, k) => (k === i ? { ...h, ...patch } : h)) });
  const add = () =>
    update({ houses: [...houses, { name: `House ${String.fromCharCode(65 + houses.length)}`, capacity: 500, type: draft.farmTypes.includes('indigenous') ? 'free-range' : 'deep-litter' }] });

  return (
    <OnboardingFrame
      step={2}
      title="Your houses"
      subtitle="Where do your birds live? Capacity helps ROOST spot overcrowding."
      footer={<Button title="Continue" size="xl" full disabled={!houses.every((h) => h.name.trim())} onPress={() => router.push('/onboarding/flock')} />}>
      <FloorPlan houses={houses} />
      {houses.map((house, i) => (
        <Card key={i} style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Name" value={house.name} onChangeText={(name) => set(i, { name })} autoCapitalize="words" />
            </View>
            {houses.length > 1 && (
              <IconButton icon="close" label={`Remove ${house.name}`} onPress={() => update({ houses: houses.filter((_, k) => k !== i) })} size={56} />
            )}
          </View>
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              CAPACITY
            </Txt>
            <Stepper label={`${house.name} capacity`} value={house.capacity} step={50} min={10} onChange={(capacity) => set(i, { capacity })} unit="birds" />
          </View>
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              TYPE
            </Txt>
            <ChipRow>
              {TYPES.map((t) => (
                <Chip key={t.key} label={t.label} selected={house.type === t.key} onPress={() => set(i, { type: t.key })} />
              ))}
            </ChipRow>
          </View>
        </Card>
      ))}
      <Button title="Add another house" icon="add" variant="ghost" full onPress={add} />
      <Txt variant="caption" tone="secondary" center>
        {houses.reduce((n, h) => n + h.capacity, 0).toLocaleString()} birds of space across {houses.length} {houses.length === 1 ? 'house' : 'houses'}
      </Txt>
    </OnboardingFrame>
  );
}
