import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Segmented, Stepper } from '@/components/controls';
import { HatchRing } from '@/components/hatch-ring';
import { Icon } from '@/components/icon';
import { MetricTile } from '@/components/metric-tile';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Banner, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { addDays, fmt } from '@/data/format';
import { HATCH_MILESTONES, incubatorStatus } from '@/data/selectors';
import { recordCandling, recordHatch, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { space, useTheme } from '@/theme';

export default function IncubatorScreen() {
  const c = useTheme();
  const farm = useFarm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const inc = farm.incubators.find((x) => x.id === id);
  const [, tick] = useState(0);
  useEffect(() => {
    const h = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(h);
  }, []);

  const [candleDay, setCandleDay] = useState<'7' | '14'>(() => (inc && incubatorStatus(inc).day >= 14 ? '14' : '7'));
  const existing = inc?.candling.find((x) => String(x.day) === candleDay);
  const [fertile, setFertile] = useState(existing?.fertile ?? inc?.eggs ?? 0);
  const [clear, setClear] = useState(existing?.clear ?? 0);
  const [dead, setDead] = useState(existing?.deadInShell ?? 0);
  const [hatched, setHatched] = useState(inc?.hatched ?? 0);

  if (!inc) return null;
  const st = incubatorStatus(inc);
  const lockdown = st.day >= 18;
  const tempOk = inc.tempC >= 37.4 && inc.tempC <= 37.8;
  const humTarget = lockdown ? [65, 70] : [50, 60];
  const humOk = inc.humidity >= humTarget[0] && inc.humidity <= humTarget[1] + 3;
  const unit = farm.settings.tempUnit;

  const switchCandle = (d: '7' | '14') => {
    setCandleDay(d);
    const e = inc.candling.find((x) => String(x.day) === d);
    const base = d === '14' ? (inc.candling.find((x) => x.day === 7)?.fertile ?? inc.eggs) : inc.eggs;
    setFertile(e?.fertile ?? base);
    setClear(e?.clear ?? 0);
    setDead(e?.deadInShell ?? 0);
  };

  return (
    <>
      <Stack.Screen options={{ title: inc.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: space.md }} accessible accessibilityLabel={`Day ${st.day} of 21. ${inc.hatched !== undefined ? `${inc.hatched} chicks hatched` : `Hatch in ${st.hatchIn.days} days ${st.hatchIn.hours} hours`}.`}>
          <View style={{ width: 248, height: 248, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute' }}>
              <HatchRing day={st.day} size={248} labels />
            </View>
            <Txt variant="caption" tone="secondary">
              DAY
            </Txt>
            <Txt variant="kpi">{st.day}</Txt>
            <Txt variant="subhead" tone="secondary">
              of 21
            </Txt>
          </View>
          <Txt variant="title2" center>
            {inc.hatched !== undefined ? `${inc.hatched} chicks hatched` : `Hatch in ${st.hatchIn.days}d ${st.hatchIn.hours}h`}
          </Txt>
          <Txt variant="subhead" tone="secondary" center>
            {inc.eggs} eggs set {fmt.dayShort(inc.setOn)} · hatch day {fmt.dayShort(addDays(inc.setOn, 21))}
          </Txt>
        </View>

        {st.day === 17 && (
          <Banner tone="sky" icon="incubator" title="Lockdown tomorrow" body="On day 18: stop turning, move eggs to the hatching tray and raise humidity to 65–70%. Keep the lid closed until hatch." />
        )}
        {lockdown && inc.hatched === undefined && (
          <Banner tone="sky" icon="lock" title="In lockdown" body="Keep the lid closed. Opening it drops humidity just when chicks need it most." />
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          <MetricTile label="Temperature" value={fmt.temp1(inc.tempC, unit)} sub={`Target ${fmt.temp1(37.5, unit)}–${fmt.temp1(37.8, unit)}`} status={tempOk ? 'good' : 'bad'} />
          <MetricTile label="Humidity" value={`${inc.humidity}%`} sub={`Target ${humTarget[0]}–${humTarget[1]}%${lockdown ? ' (lockdown)' : ''}`} status={humOk ? 'good' : 'watch'} />
          <MetricTile label="Fertile" value={fmt.pct(st.fertility)} sub={`${st.fertile} of ${inc.eggs} eggs`} status={st.fertility >= 0.85 ? 'good' : 'watch'} />
          <MetricTile label="Hatchability" value={st.hatchability !== undefined ? fmt.pct(st.hatchability) : '—'} sub="Chicks per fertile egg" status={st.hatchability !== undefined ? (st.hatchability >= 0.85 ? 'good' : 'watch') : undefined} />
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Milestones" />
          <Card style={{ paddingVertical: space.sm }}>
            {HATCH_MILESTONES.map((m, i) => {
              const done = st.day >= m.day;
              const candled = inc.candling.find((x) => x.day === m.day);
              return (
                <View key={m.day}>
                  {i > 0 && <Divider inset={40} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }}>
                    <Icon name={done ? 'checkCircle' : 'circle'} size={26} color={done ? c.sageText : c.inkTertiary} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="headline">
                        Day {m.day}: {m.label === 'Candle' ? 'Candle the eggs' : m.label === 'Lockdown' ? 'Lockdown' : 'Hatch'}
                      </Txt>
                      <Txt variant="caption" tone="secondary">
                        {fmt.dayShort(addDays(inc.setOn, m.day))}
                        {candled ? ` · ${candled.fertile} fertile, ${candled.clear} clear, ${candled.deadInShell} dead in shell` : ''}
                      </Txt>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Candling results" />
          <Card style={{ gap: space.lg }}>
            <Segmented options={[{ value: '7', label: 'Day 7' }, { value: '14', label: 'Day 14' }]} value={candleDay} onChange={switchCandle} />
            <View style={{ gap: space.md }}>
              <Txt variant="label" tone="secondary">FERTILE</Txt>
              <Stepper label="Fertile eggs" value={fertile} min={0} max={inc.eggs} onChange={setFertile} />
              <Txt variant="label" tone="secondary">CLEAR (INFERTILE)</Txt>
              <Stepper label="Clear eggs" value={clear} min={0} max={inc.eggs} onChange={setClear} />
              <Txt variant="label" tone="secondary">DEAD IN SHELL</Txt>
              <Stepper label="Dead in shell" value={dead} min={0} max={inc.eggs} onChange={setDead} />
            </View>
            <Txt variant="subhead" tone="secondary">
              Fertility {fmt.pct(fertile / Math.max(1, inc.eggs))} · {fertile + clear + dead} of {inc.eggs} eggs counted
            </Txt>
            <Button
              title={existing ? 'Update candling' : 'Save candling'}
              variant="secondary"
              onPress={() => {
                recordCandling(inc.id, { day: Number(candleDay), fertile, clear, deadInShell: dead });
                haptic.success();
              }}
            />
          </Card>
        </View>

        {st.day >= 19 && (
          <View style={{ gap: space.md }}>
            <SectionHeader title="Hatch" />
            <Card style={{ gap: space.lg }}>
              <Stepper label="Chicks hatched" value={hatched} min={0} max={inc.eggs} step={1} onChange={setHatched} unit="healthy chicks" />
              <Txt variant="subhead" tone="secondary">
                Hatchability {fmt.pct(hatched / Math.max(1, st.fertile))} of fertile eggs
              </Txt>
              <Button
                title="Record hatch"
                onPress={() => {
                  recordHatch(inc.id, hatched);
                  haptic.success();
                }}
              />
            </Card>
          </View>
        )}
      </ScrollView>
    </>
  );
}
