import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { Button, IconButton } from '@/components/button';
import { HouseFields, nextHouseName } from '@/components/flock-form';
import { OnboardingFrame } from '@/components/onboarding-frame';
import { useDraft } from '@/components/onboarding-draft';
import { Card } from '@/components/surface';
import { Txt } from '@/components/text';
import type { HouseType } from '@/data/types';
import { useT } from '@/lib/i18n';
import { space, useTheme } from '@/theme';

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
                {house.name.replace(/^(House|Banda) /, '') || '?'}
              </SvgText>
            </G>
          );
        })}
      </Svg>}
    </View>
  );
}

export default function HousesStep() {
  const tr = useT();
  const { draft, update, removeHouse } = useDraft();
  const houses = draft.houses;
  const set = (i: number, patch: Partial<(typeof houses)[number]>) => update({ houses: houses.map((h, k) => (k === i ? { ...h, ...patch } : h)) });
  const freshHouse = (names: string[]) => ({
    name: nextHouseName(names, tr('House')),
    capacity: 500,
    type: (draft.farmTypes.includes('indigenous') ? 'free-range' : 'deep-litter') as HouseType,
  });
  const add = () => update({ houses: [...houses, freshHouse(houses.map((h) => h.name))] });

  // First visit: one house, with birds in it, ready to fill in.
  useEffect(() => {
    if (houses.length === 0) update({ houses: [freshHouse([])], flocks: [{ breedId: '', houseIndex: 0, ageDays: 0, count: 500 }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <OnboardingFrame
      step={2}
      title={tr('Your houses')}
      subtitle={tr('Where do your birds live? Capacity helps ROOST spot overcrowding.')}
      footer={<Button title={tr('Continue')} size="xl" full disabled={!houses.length || !houses.every((h) => h.name.trim())} onPress={() => router.push('/onboarding/flock')} />}>
      <FloorPlan houses={houses} />
      {houses.map((house, i) => (
        <Card key={i} style={{ gap: space.lg }}>
          {houses.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -space.lg }}>
              <IconButton icon="close" label={tr('Remove {name}', { name: house.name })} onPress={() => removeHouse(i)} size={48} />
            </View>
          )}
          <HouseFields house={house} onChange={(patch) => set(i, patch)} />
        </Card>
      ))}
      <Button title={tr('Add another house')} icon="add" variant="ghost" full onPress={add} />
      <Txt variant="caption" tone="secondary" center>
        {tr('{birds} birds of space across {n} {n|house|houses}', { birds: houses.reduce((n, h) => n + h.capacity, 0).toLocaleString(), n: houses.length })}
      </Txt>
    </OnboardingFrame>
  );
}
