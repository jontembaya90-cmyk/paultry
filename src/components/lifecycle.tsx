import { useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/text';
import type { Stage } from '@/data/breeds';
import { radius, space, useTheme } from '@/theme';

const STAGE_ICON: Record<Stage['icon'], IconName> = {
  chick: 'chick',
  brooding: 'heat',
  grower: 'hen',
  lay: 'egg',
  peak: 'trendingUp',
  market: 'sale',
  end: 'moon',
};

const STEP = 132;

/**
 * Horizontal journey from day-old chick to end of lay or market, with a "You are here"
 * marker positioned inside the current stage by how far through it the flock is.
 */
export function LifecycleTimeline({ stages, index, ageDays, endDay }: { stages: Stage[]; index: number; ageDays: number; endDay: number }) {
  const c = useTheme();
  const ref = useRef<ScrollView>(null);
  const cur = stages[index];
  const nextStart = stages[index + 1]?.startDay ?? endDay;
  const within = Math.max(0, Math.min(1, (ageDays - cur.startDay) / Math.max(1, nextStart - cur.startDay)));
  const markerX = index * STEP + within * STEP;
  const fmtStart = (d: number) => (d < 56 ? `Day ${d}` : `Week ${Math.round(d / 7)}`);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => ref.current?.scrollTo({ x: Math.max(0, markerX - e.nativeEvent.layout.width / 2 + space.gutter), animated: false })}
      contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: 34 }}
      style={{ marginHorizontal: -space.gutter }}
      accessible
      accessibilityLabel={`Lifecycle. Now in ${cur.name}${stages[index + 1] ? `. Next: ${stages[index + 1].name}, ${fmtStart(stages[index + 1].startDay).toLowerCase()}` : ''}.`}>
      <View style={{ width: stages.length * STEP }}>
        {/* Track */}
        <View style={{ position: 'absolute', top: 21, left: 22, right: STEP - 22, height: 4, borderRadius: 2, backgroundColor: c.track }} />
        <View style={{ position: 'absolute', top: 21, left: 22, width: Math.max(0, markerX - 22 + 22), height: 4, borderRadius: 2, backgroundColor: c.yolk }} />
        {/* Marker */}
        <View style={{ position: 'absolute', top: -34, left: markerX + 22 - 48, width: 96, alignItems: 'center' }}>
          <View style={{ backgroundColor: c.ink, borderRadius: radius.full, paddingHorizontal: space.sm, paddingVertical: 3 }}>
            <Txt variant="label" color={c.bg} maxFontSizeMultiplier={1.3}>
              You are here
            </Txt>
          </View>
          <View style={{ width: 2, height: 14, backgroundColor: c.ink }} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {stages.map((st, i) => {
            const past = i < index;
            const now = i === index;
            return (
              <View key={st.name} style={{ width: STEP, gap: space.sm }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: now ? c.yolk : past ? c.yolkSoft : c.surface,
                    borderWidth: now || past ? 0 : 2,
                    borderColor: c.hairline,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name={past ? 'check' : STAGE_ICON[st.icon]} size={24} color={now ? c.onYolk : past ? c.yolkText : c.inkTertiary} />
                </View>
                <View style={{ paddingEnd: space.sm }}>
                  <Txt variant="headline" tone={now ? 'primary' : 'secondary'} numberOfLines={2}>
                    {st.name}
                  </Txt>
                  <Txt variant="caption" tone="secondary">
                    {fmtStart(st.startDay)}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
