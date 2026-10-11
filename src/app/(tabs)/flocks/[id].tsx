import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { TargetChart } from '@/components/charts';
import { Icon } from '@/components/icon';
import { LifecycleTimeline } from '@/components/lifecycle';
import { MetricTile } from '@/components/metric-tile';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Banner, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { EmptyState } from '@/components/today-parts';
import { breedById, SPECIES_LABEL } from '@/data/breeds';
import { fmt } from '@/data/format';
import { ageOf, currentStage, flockMetrics, houseOf, performanceSeries, personName, vaccineState, withdrawalFor } from '@/data/selectors';
import { addPhoto, archiveFlock, useFarm } from '@/data/store';
import type { LossCause } from '@/data/types';
import { pickFlockPhoto } from '@/lib/photos';
import { radius, space, useTheme } from '@/theme';

const CAUSE: Record<LossCause, { label: string; tone: 'barn' | 'yolk' | 'sky' | 'neutral' }> = {
  disease: { label: 'Illness', tone: 'barn' },
  predator: { label: 'Predator', tone: 'yolk' },
  heat: { label: 'Heat', tone: 'barn' },
  culled: { label: 'Culled', tone: 'neutral' },
  unknown: { label: 'Not sure', tone: 'neutral' },
};

export default function FlockDetail() {
  const c = useTheme();
  const farm = useFarm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const flock = farm.flocks.find((f) => f.id === id);

  if (!flock) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: space.gutter }}>
        <EmptyState art="hen" title="Flock not found" body="It may have been removed on another phone." action="Back to flocks" onAction={() => router.back()} />
      </View>
    );
  }

  const breed = breedById(flock.breedId);
  const house = houseOf(farm, flock);
  const m = flockMetrics(farm, flock);
  const age = ageOf(flock);
  const stage = currentStage(flock);
  const perf = performanceSeries(farm, flock);
  const withdrawal = withdrawalFor(farm, flock.id);
  const unit = SPECIES_LABEL[breed.species];
  const losses = farm.losses.filter((l) => l.flockId === flock.id).sort((a, b) => (a.day < b.day ? 1 : -1));
  const photos = farm.photos.filter((p) => p.flockId === flock.id).sort((a, b) => (a.day < b.day ? 1 : -1));
  const notes = farm.notes.filter((n) => n.flockId === flock.id).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 3);
  const vaccines = farm.vaccinations.filter((v) => v.flockId === flock.id);
  const nextVaccine = vaccines.find((v) => !v.doneOn);
  const isLayer = m.layRate !== undefined;
  const endDay = breed.marketDay ?? 560;
  const active = flock.status === 'active';

  const heroValue = isLayer ? fmt.pct(m.layRate!) : m.avgKg ? `${m.avgKg.toFixed(2)} kg` : fmt.int(m.alive);
  const heroLabel = isLayer ? 'Lay rate' : m.avgKg ? 'Average weight' : unit.many;
  const heroStd = isLayer ? m.stdLay! : m.stdKg;
  const heroActual = isLayer ? m.layRate! : m.avgKg;
  const diff = heroActual !== undefined ? heroActual / heroStd - 1 : 0;

  const addPhotoFrom = async (source: 'camera' | 'library') => {
    const uri = await pickFlockPhoto(source);
    if (uri) addPhoto(flock.id, uri);
  };

  return (
    <>
      <Stack.Screen options={{ title: house?.name ?? 'Flock' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {/* Hero */}
        <View style={{ gap: space.xs }} accessible accessibilityLabel={`${heroLabel} ${heroValue}${heroActual !== undefined ? `, ${Math.abs(diff * 100).toFixed(1)} percent ${diff >= 0 ? 'above' : 'below'} breed standard` : ''}. ${fmt.int(m.alive)} ${breed.name} ${unit.many}, ${age.spoken}.`}>
          <Txt variant="subhead" tone="secondary">
            {breed.name} · {age.label} · {fmt.int(m.alive)} {unit.many}
          </Txt>
          <Txt variant="label" tone="secondary">
            {heroLabel.toUpperCase()}
          </Txt>
          <Txt variant="hero">{heroValue}</Txt>
          {heroActual !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Icon name={diff >= -0.05 ? 'checkCircle' : 'trendingDown'} size={18} color={diff >= -0.05 ? c.sageText : c.barnText} />
              <Txt variant="headline" color={diff >= -0.05 ? c.sageText : c.barnText}>
                {diff >= 0 ? '+' : '−'}
                {Math.abs(diff * 100).toFixed(1)}% vs {breed.name} standard ({isLayer ? fmt.pct(heroStd) : `${heroStd.toFixed(2)} kg`})
              </Txt>
            </View>
          )}
          {flock.note && (
            <Txt variant="body" tone="secondary">
              {flock.note}
            </Txt>
          )}
        </View>

        {withdrawal && (
          <Banner tone="barn" icon="medication" title={`Do not sell from ${house?.name} until ${fmt.monthDay(withdrawal.withdrawalUntil)}`} body={`${withdrawal.drug}. ${withdrawal.reason}.`} />
        )}
        {house?.quarantine && <Banner tone="barn" icon="quarantine" title={`${house.name} is in quarantine`} body="Visitors and equipment stay out. Care for this house last each day." />}

        <View style={{ gap: space.md }}>
          <SectionHeader title="Journey" />
          <LifecycleTimeline stages={stage.stages} index={stage.index} ageDays={age.days} endDay={endDay} />
        </View>

        <Card style={{ gap: space.md }}>
          <Txt variant="title3">{perf.kind === 'lay' ? 'Lay rate vs standard' : 'Weight vs standard'}</Txt>
          {perf.actual.length > 0 ? (
            <TargetChart actual={perf.actual} standard={perf.standard} now={perf.now} unit={perf.unit} yFormat={perf.yFormat} color={perf.kind === 'lay' ? c.yolk : c.wheat} />
          ) : (
            <Txt variant="body" tone="secondary">
              Weigh a sample of birds to start the curve. Most farmers weigh once a week.
            </Txt>
          )}
          {perf.kind === 'weight' && active && <Button title="Log weight" icon="weight" variant="secondary" onPress={() => router.push(`/log/weight?flock=${flock.id}`)} />}
        </Card>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Numbers" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <MetricTile
              label={isLayer ? 'Feed per kg eggs' : 'FCR'}
              value={m.fcr ? m.fcr.toFixed(2) : '—'}
              sub={m.fcr ? (isLayer ? 'Lower is better · target ≈ 2.1' : `Lower is better · target ≈ ${(1.35 + age.days / 120).toFixed(2)}`) : 'Needs feed and weight records'}
              status={m.fcr ? (m.fcr <= (isLayer ? 2.15 : 1.4 + age.days / 120) ? 'good' : 'watch') : undefined}
            />
            <MetricTile label="Mortality" value={fmt.pct(m.mortality, 1)} sub={`${fmt.int(flock.placedCount - m.alive)} of ${fmt.int(flock.placedCount)} placed`} status={m.mortality < 0.03 ? 'good' : m.mortality < 0.05 ? 'watch' : 'bad'} />
            <MetricTile label="Avg weight" value={m.avgKg ? `${m.avgKg.toFixed(2)} kg` : '—'} sub={`Standard ${m.stdKg.toFixed(2)} kg`} status={m.avgKg ? (m.avgKg >= m.stdKg * 0.95 ? 'good' : 'watch') : undefined} />
            <MetricTile label="Uniformity" value={m.uniformity ? fmt.pct(m.uniformity) : '—'} sub="Birds within ±10% of average" status={m.uniformity ? (m.uniformity >= 0.8 ? 'good' : 'watch') : undefined} />
            {isLayer && <MetricTile label="Eggs per hen housed" value={m.eggsPerHenHoused ? m.eggsPerHenHoused.toFixed(0) : '—'} sub="Since records began" />}
            <MetricTile label="Cost per bird" value={fmt.money(m.costPerBird, farm.settings.currency)} sub="This month" />
          </View>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Losses" action={active ? 'Record' : undefined} onAction={() => router.push(`/log/losses?flock=${flock.id}`)} />
          <Card style={{ paddingVertical: space.sm }}>
            {losses.length === 0 ? (
              <Txt variant="body" tone="secondary" style={{ paddingVertical: space.md }}>
                No losses recorded. Long may it last.
              </Txt>
            ) : (
              losses.slice(0, 6).map((l, i) => (
                <View key={l.id}>
                  {i > 0 && <Divider />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }} accessible accessibilityLabel={`${fmt.dayShort(l.day)}: ${l.count} ${l.count === 1 ? unit.one : unit.many}, cause ${CAUSE[l.cause].label}`}>
                    <Txt variant="title3" style={{ width: 40, fontVariant: ['tabular-nums'] }}>
                      {l.count}
                    </Txt>
                    <View style={{ flex: 1 }}>
                      <Txt variant="headline">{fmt.dayShort(l.day)}</Txt>
                      {l.note && (
                        <Txt variant="caption" tone="secondary">
                          {l.note}
                        </Txt>
                      )}
                    </View>
                    <Badge tone={CAUSE[l.cause].tone} label={CAUSE[l.cause].label} size="sm" style={{ alignSelf: 'center' }} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Photo journal" />
          {photos.length === 0 ? (
            <Card>
              <View style={{ alignItems: 'center', gap: space.md }}>
                <Icon name="photo" size={36} color={c.inkTertiary} />
                <Txt variant="body" tone="secondary" center>
                  A weekly photo makes changes easy to see: feathering, litter, crowding.
                </Txt>
              </View>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: space.md }}>
              {photos.map((p) => (
                <View key={p.id} style={{ gap: space.xs }}>
                  <Image source={{ uri: p.uri }} style={{ width: 168, height: 126, borderRadius: radius.md }} contentFit="cover" accessibilityLabel={`Photo from ${fmt.dayShort(p.day)}`} />
                  <Txt variant="caption" tone="secondary">
                    {fmt.dayShort(p.day)}
                  </Txt>
                </View>
              ))}
            </ScrollView>
          )}
          {active && (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Take photo" icon="camera" variant="secondary" onPress={() => addPhotoFrom('camera')} style={{ flex: 1 }} />
              <Button title="From gallery" icon="photo" variant="ghost" onPress={() => addPhotoFrom('library')} style={{ flex: 1 }} />
            </View>
          )}
        </View>

        {notes.length > 0 && (
          <View style={{ gap: space.md }}>
            <SectionHeader title="Notes" />
            {notes.map((n) => (
              <Card key={n.id} style={{ gap: space.xs }}>
                <Txt variant="body" selectable>
                  {n.text}
                </Txt>
                <Txt variant="caption" tone="secondary">
                  {personName(farm, n.by)} · {fmt.dayShort(n.day)}
                </Txt>
              </Card>
            ))}
          </View>
        )}

        {nextVaccine && active && (
          <Card onPress={() => router.push('/health')} accessibilityLabel={`Next vaccine: ${nextVaccine.name}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Icon name="vaccine" size={28} color={c.skyText} />
              <View style={{ flex: 1 }}>
                <Txt variant="caption" tone="secondary">
                  Next vaccine · {vaccines.filter((v) => v.doneOn).length} of {vaccines.length} given
                </Txt>
                <Txt variant="headline">
                  {nextVaccine.name} · day {nextVaccine.ageDay}
                </Txt>
              </View>
              <Badge
                tone={vaccineState(farm, nextVaccine) === 'overdue' ? 'barn' : vaccineState(farm, nextVaccine) === 'due' ? 'yolk' : 'sky'}
                label={{ overdue: 'Overdue', due: 'Today', soon: 'This week', upcoming: 'Upcoming', done: 'Done' }[vaccineState(farm, nextVaccine)]}
                size="sm"
              />
            </View>
          </Card>
        )}

        {active && (
          <Button
            title="Close this flock"
            icon="archive"
            variant="ghost"
            onPress={() =>
              Alert.alert('Close this flock?', `${house?.name} will move to past flocks. Its records stay.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Close flock', style: 'destructive', onPress: () => { archiveFlock(flock.id); router.back(); } },
              ])
            }
          />
        )}
      </ScrollView>
    </>
  );
}
