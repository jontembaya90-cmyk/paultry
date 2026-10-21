import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { Linking, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Stepper } from '@/components/controls';
import { Icon } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { Silo } from '@/components/today-parts';
import { addDays, fmt, today } from '@/data/format';
import { activeFlocks, aliveOn, expectedFeed, expectedWater, feedOn, feedRunway, houseName, waterOn } from '@/data/selectors';
import { reorderFeed, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { radius, space, useTheme } from '@/theme';

const INGREDIENTS = [
  { name: 'Maize', pct: 60, price: 0.32 },
  { name: 'Soya meal', pct: 20, price: 0.62 },
  { name: 'Fish meal (omena)', pct: 8, price: 0.9 },
  { name: 'Wheat bran', pct: 8, price: 0.2 },
  { name: 'Limestone', pct: 3, price: 0.1 },
  { name: 'Premix', pct: 1, price: 2.4 },
];

function Bars({ actual, expected, color }: { actual: number[]; expected: number[]; color: string }) {
  const c = useTheme();
  const max = Math.max(...actual, ...expected, 0.0001) * 1.1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56 }}>
      {actual.map((a, i) => {
        const off = expected[i] ? a / expected[i] - 1 : 0;
        const anomaly = Math.abs(off) > 0.12;
        return (
          <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', bottom: `${(expected[i] / max) * 100}%`, left: -2, right: -2, height: 2, backgroundColor: c.inkTertiary }} />
            <View style={{ height: `${(a / max) * 100}%`, borderRadius: 4, backgroundColor: anomaly ? c.barn : color, opacity: i === actual.length - 1 ? 1 : 0.6 }} />
          </View>
        );
      })}
    </View>
  );
}

export default function FeedAndWater() {
  const c = useTheme();
  const tr = useT();
  const farm = useFarm();
  const params = useLocalSearchParams<{ reorder?: string }>();
  const [open, setOpen] = useState<string | undefined>(params.reorder);
  const [qty, setQty] = useState(1000);
  const [mix, setMix] = useState(INGREDIENTS);
  const [showMix, setShowMix] = useState(false);
  const cur = farm.settings.currency;
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const mixPct = mix.reduce((n, x) => n + x.pct, 0);
  const mixCost = mix.reduce((n, x) => n + (x.pct / 100) * x.price, 0);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: space.md }}>
        <SectionHeader title={tr('In store')} action={tr('Add feed')} onAction={() => router.push('/add-feed')} />
        {farm.stocks.length === 0 && (
          <Txt variant="subhead" tone="secondary">
            {tr('Add your feed store and ROOST warns you before it runs out.')}
          </Txt>
        )}
        <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
          {farm.stocks.map((st) => {
            const r = feedRunway(farm, st.id);
            const low = !r.untilMarket && r.days <= 7;
            return (
              <Pressable
                key={st.id}
                onPress={() => {
                  setOpen(open === st.id ? undefined : st.id);
                  setQty(Math.max(50, Math.round((st.capacityKg - st.kgOnHand) / 50) * 50));
                }}
                accessibilityRole="button"
                accessibilityLabel={`${st.name}: ${fmt.int(st.kgOnHand)} kilograms, ${r.days} days left. Tap to reorder.`}
                style={{ flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: space.xs, padding: space.md, borderRadius: radius.lg, backgroundColor: open === st.id ? c.yolkSoft : c.surface, boxShadow: c.shadowCard }}>
                <Silo fill={st.kgOnHand / st.capacityKg} low={low} width={64} height={104} />
                <Txt variant="headline" center numberOfLines={2}>
                  {st.name}
                </Txt>
                <Txt variant="title3" color={low ? c.barnText : c.ink}>
                  {r.days} days
                </Txt>
                <Txt variant="caption" tone="secondary">
                  {fmt.int(st.kgOnHand)} / {fmt.int(st.capacityKg)} kg
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {open && (() => {
        const st = farm.stocks.find((x) => x.id === open);
        if (!st) return null;
        const sup = farm.suppliers.find((x) => x.id === st.supplierId);
        const msg = `Hello ${sup?.name ?? ''}, this is ${farm.farmName}. Please deliver ${fmt.int(qty)} kg of ${st.name.toLowerCase()} (${Math.round(qty / 50)} bags). Thank you.`;
        return (
          <Card style={{ gap: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Icon name="cart" size={26} color={c.yolkText} />
              <View style={{ flex: 1 }}>
                <Txt variant="title3">Reorder {st.name.toLowerCase()}</Txt>
                <Txt variant="subhead" tone="secondary">
                  {sup ? `${sup.name} · ${sup.phone}` : 'No supplier saved yet'}
                </Txt>
              </View>
            </View>
            <Stepper label="Amount to order" value={qty} step={50} min={50} max={st.capacityKg} onChange={setQty} unit={`kg · ${Math.round(qty / 50)} bags · about ${fmt.money(qty * st.pricePerKg, cur)}`} />
            {sup && (
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button title="Call" icon="call" variant="secondary" onPress={() => Linking.openURL(`tel:${sup.phone}`)} style={{ flex: 1 }} />
                <Button title="Message" icon="message" variant="secondary" onPress={() => Linking.openURL(`sms:${sup.phone}?body=${encodeURIComponent(msg)}`)} style={{ flex: 1 }} />
              </View>
            )}
            <Button
              title="Delivered: add to store"
              icon="check"
              onPress={() => {
                reorderFeed(st.id, qty);
                haptic.success();
                setOpen(undefined);
              }}
              accessibilityHint="Adds this amount to the silo and records the expense"
            />
          </Card>
        );
      })()}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Per bird, last 7 days" />
        {activeFlocks(farm).map((f) => {
          const feed = days.map((d) => (feedOn(farm, f.id, d) * 1000) / Math.max(1, aliveOn(farm, f, d)));
          const feedExp = days.map((d) => (expectedFeed(farm, f, d) * 1000) / Math.max(1, aliveOn(farm, f, d)));
          const water = days.map((d) => waterOn(farm, f.id, d) / Math.max(1, aliveOn(farm, f, d)));
          const waterExp = days.map((d) => expectedWater(farm, f, d) / Math.max(1, aliveOn(farm, f, d)));
          const fOff = feedExp[6] ? feed[6] / feedExp[6] - 1 : 0;
          const wOff = waterExp[6] ? water[6] / waterExp[6] - 1 : 0;
          return (
            <Card key={f.id} style={{ gap: space.lg }}>
              <Txt variant="title3">{houseName(farm, f)}</Txt>
              {[
                { label: 'Feed', icon: 'feeder' as const, now: `${Math.round(feed[6])} g`, exp: `${Math.round(feedExp[6])} g`, off: fOff, a: feed, e: feedExp, color: c.wheat },
                { label: 'Water', icon: 'drinker' as const, now: `${water[6].toFixed(2)} L`, exp: `${waterExp[6].toFixed(2)} L`, off: wOff, a: water, e: waterExp, color: c.sky },
              ].map((row, i) => (
                <Fragment key={row.label}>
                  {i > 0 && <Divider />}
                  <View style={{ gap: space.sm }} accessible accessibilityLabel={`${row.label} today: ${row.now} per bird, expected ${row.exp}, ${Math.abs(Math.round(row.off * 100))} percent ${row.off >= 0 ? 'above' : 'below'}.`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Icon name={row.icon} size={20} color={c.inkSecondary} />
                      <Txt variant="headline" style={{ flex: 1 }}>
                        {row.label}: {row.now}
                        <Txt variant="subhead" tone="secondary">
                          {' '}
                          of {row.exp}
                        </Txt>
                      </Txt>
                      {Math.abs(row.off) > 0.12 ? (
                        <Badge tone="barn" icon="warning" label={`${row.off > 0 ? '+' : '−'}${Math.abs(Math.round(row.off * 100))}%`} size="sm" />
                      ) : (
                        <Badge tone="sage" icon="checkCircle" label="On track" size="sm" />
                      )}
                    </View>
                    <Bars actual={row.a} expected={row.e} color={row.color} />
                  </View>
                </Fragment>
              ))}
            </Card>
          );
        })}
        <Txt variant="caption" tone="secondary">
          Grey line: what the breed is expected to eat or drink at this age. Red bars: more than 12% off.
        </Txt>
      </View>

      <View style={{ gap: space.md }}>
        <Pressable onPress={() => setShowMix((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: showMix }} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: space.sm }}>
          <Txt variant="title3" style={{ flex: 1 }}>
            Mix your own feed
          </Txt>
          <Badge tone="neutral" label="Optional" size="sm" />
          <Icon name={showMix ? 'chevronUp' : 'chevronDown'} size={22} color={c.inkSecondary} />
        </Pressable>
        {showMix && (
          <Card style={{ gap: space.sm }}>
            {mix.map((ing, i) => (
              <View key={ing.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56 }}>
                <Txt variant="headline" style={{ flex: 1 }}>
                  {ing.name}
                </Txt>
                <TextInput
                  value={String(ing.pct)}
                  onChangeText={(v) => setMix(mix.map((x, k) => (k === i ? { ...x, pct: Number(v) || 0 } : x)))}
                  keyboardType="number-pad"
                  accessibilityLabel={`${ing.name} percent`}
                  style={{ width: 64, height: 48, borderRadius: radius.sm, backgroundColor: c.surfaceAlt, textAlign: 'center', fontSize: 17, color: c.ink }}
                />
                <Txt variant="subhead" tone="secondary">
                  %
                </Txt>
                <TextInput
                  value={String(ing.price)}
                  onChangeText={(v) => setMix(mix.map((x, k) => (k === i ? { ...x, price: Number(v.replace(',', '.')) || 0 } : x)))}
                  keyboardType="decimal-pad"
                  accessibilityLabel={`${ing.name} price per kilogram`}
                  style={{ width: 72, height: 48, borderRadius: radius.sm, backgroundColor: c.surfaceAlt, textAlign: 'center', fontSize: 17, color: c.ink }}
                />
                <Txt variant="caption" tone="secondary">
                  /kg
                </Txt>
              </View>
            ))}
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space.sm }}>
              <Badge tone={mixPct === 100 ? 'sage' : 'barn'} icon={mixPct === 100 ? 'checkCircle' : 'warning'} label={`${mixPct}% total`} />
              <Txt variant="title3">{fmt.money(mixCost, cur)} / kg</Txt>
            </View>
            <Txt variant="caption" tone="secondary">
              A starting point for a layer ration. Ask a nutritionist before changing a laying flock’s feed.
            </Txt>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
