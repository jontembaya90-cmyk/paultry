import { View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { Sparkline } from '@/components/charts';
import { Icon, type IconName } from '@/components/icon';
import { Badge, Card } from '@/components/surface';
import { Txt } from '@/components/text';
import { breedById, SPECIES_LABEL } from '@/data/breeds';
import { fmt } from '@/data/format';
import { ageOf, flockMetrics, flockSentence, houseOf, keyMetric, sparkSeries, withdrawalFor } from '@/data/selectors';
import type { FarmState, Flock, Species } from '@/data/types';
import { radius, space, useTheme } from '@/theme';

export const SPECIES_ICON: Record<Species, IconName> = {
  layer: 'egg',
  broiler: 'hen',
  indigenous: 'hen',
  duck: 'duck',
  turkey: 'turkey',
  quail: 'quail',
};

/** Diagonal Barn stripes behind a quarantined house. Paired with a badge that says so. */
export function QuarantineStripes() {
  const c = useTheme();
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <Pattern id="stripes" patternUnits="userSpaceOnUse" width={18} height={18} patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={18} stroke={c.barn} strokeWidth={8} opacity={0.12} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#stripes)" />
    </Svg>
  );
}

export function FlockCard({ s, flock, onPress }: { s: FarmState; flock: Flock; onPress: () => void }) {
  const c = useTheme();
  const breed = breedById(flock.breedId);
  const m = flockMetrics(s, flock);
  const age = ageOf(flock);
  const km = keyMetric(s, flock);
  const house = houseOf(s, flock);
  const withdrawal = withdrawalFor(s, flock.id);
  const archived = flock.status === 'archived';
  const series = archived ? [] : sparkSeries(s, flock);

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel={flockSentence(s, flock)} accessibilityHint="Opens flock details">
      <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
        {house?.quarantine && <QuarantineStripes />}
        <View style={{ padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, borderCurve: 'continuous', backgroundColor: archived ? c.surfaceAlt : c.yolkSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={SPECIES_ICON[breed.species]} size={28} color={archived ? c.inkSecondary : c.yolkText} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="title3">{house?.name ?? 'Flock'}</Txt>
              <Txt variant="subhead" tone="secondary">
                {breed.name} · {age.label}
              </Txt>
            </View>
            <Icon name="chevronRight" size={22} color={c.inkTertiary} />
          </View>

          {archived ? (
            <Txt variant="subhead" tone="secondary">
              {flock.note ?? `Closed ${flock.archivedOn ? fmt.monthDay(flock.archivedOn) : ''}`}
            </Txt>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
              <View style={{ gap: 2 }}>
                <Txt variant="caption" tone="secondary">
                  {km.label}
                </Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Txt variant="number">{km.value}</Txt>
                  {!km.good && <Icon name="trendingDown" size={18} color={c.barnText} />}
                </View>
              </View>
              <View style={{ gap: 2, alignItems: 'flex-end' }}>
                <Txt variant="caption" tone="secondary">
                  {fmt.int(m.alive)} {SPECIES_LABEL[breed.species].many}
                </Txt>
                <Sparkline data={series} color={km.good ? c.sage : c.barn} />
              </View>
            </View>
          )}

          {(house?.quarantine || withdrawal) && (
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {house?.quarantine && <Badge tone="barn" icon="quarantine" label="Quarantine" size="sm" />}
              {withdrawal && <Badge tone="barn" icon="medication" label={`Withdrawal until ${fmt.monthDay(withdrawal.withdrawalUntil)}`} size="sm" />}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}
