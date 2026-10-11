import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AlertCard } from '@/components/alert-card';
import { Button } from '@/components/button';
import { TargetChart } from '@/components/charts';
import { Segmented } from '@/components/controls';
import { FlockCard } from '@/components/flock-card';
import { PulseRings } from '@/components/flock-pulse';
import { HatchRing } from '@/components/hatch-ring';
import { Icon } from '@/components/icon';
import { MetricTile } from '@/components/metric-tile';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { ReceiptCard } from '@/components/receipt-card';
import { Badge, Banner, Card, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { EggHero, EmptyState, SyncPill, TaskRow, TrayGlyph } from '@/components/today-parts';
import { fmt, today } from '@/data/format';
import { activeFlocks, alerts, eggsOn, eggTarget, feedRunway, flockPulse, incubatorStatus, performanceSeries, tasksOn, vaccinesDueToday } from '@/data/selectors';
import { useFarm } from '@/data/store';
import { fonts, motion, palettes, radius, space, type, useTheme, type Palette } from '@/theme';

function lum(hex: string) {
  const v = hex.replace('#', '').match(/.{2}/g)!.map((h) => {
    const x = parseInt(h, 16) / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const SWATCHES: { key: keyof Palette; name: string; role: string; on?: keyof Palette }[] = [
  { key: 'yolk', name: 'Yolk', role: 'Primary accent, eggs', on: 'onYolk' },
  { key: 'barn', name: 'Barn', role: 'Alerts, losses, urgent', on: 'onBarn' },
  { key: 'sage', name: 'Sage', role: 'Health, on track', on: 'onSage' },
  { key: 'sky', name: 'Sky', role: 'Water, information', on: 'onSky' },
  { key: 'wheat', name: 'Wheat', role: 'Feed', on: 'onWheat' },
  { key: 'straw', name: 'Straw', role: 'Warm secondary surface' },
  { key: 'bg', name: 'Feather / Coop Night', role: 'Background' },
  { key: 'ink', name: 'Ink', role: 'Primary text' },
];

function Phone({ children, w = 168, h = 168, label }: { children: React.ReactNode; w?: number; h?: number; label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: space.xs, alignItems: 'center' }}>
      <View style={{ width: w, height: h, borderRadius: 28, borderCurve: 'continuous', backgroundColor: c.surface, padding: space.md, boxShadow: c.shadowRaised, overflow: 'hidden' }}>{children}</View>
      <Txt variant="caption" tone="secondary">
        {label}
      </Txt>
    </View>
  );
}

export default function DesignSystem() {
  const c = useTheme();
  const farm = useFarm();
  const [mode, setMode] = useState<'light' | 'dark'>(c.scheme === 'dark' ? 'dark' : 'light');
  const p = palettes[mode];
  const t = today();
  const pulse = flockPulse(farm);
  const flock = activeFlocks(farm)[0];
  const perf = flock ? performanceSeries(farm, flock) : undefined;
  const alert = alerts(farm)[0];
  const task = tasksOn(farm).flatMap((g) => g.tasks)[0];
  const sale = farm.sales[farm.sales.length - 1];
  const inc = farm.incubators[0];
  const runway = farm.stocks[0] ? feedRunway(farm, farm.stocks[0].id) : undefined;
  const next = vaccinesDueToday(farm)[0];
  const eggs = eggsOn(farm, t);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xxl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
      <Txt variant="body" tone="secondary">
        Every screen in ROOST draws from these tokens and components. Live data from your farm fills the examples.
      </Txt>

      {/* Colour */}
      <View style={{ gap: space.md }}>
        <SectionHeader title="Colour" />
        <Segmented options={[{ value: 'light', label: 'Day', icon: 'sun' }, { value: 'dark', label: 'Dawn', icon: 'moon' }]} value={mode} onChange={setMode} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, backgroundColor: p.bg, padding: space.md, borderRadius: radius.lg }}>
          {SWATCHES.map((s) => {
            const fill = p[s.key] as string;
            const on = s.on ? (p[s.on] as string) : contrast(fill, '#FFFFFF') > contrast(fill, '#1C1C1E') ? '#FFFFFF' : '#1C1C1E';
            const ratio = contrast(fill, on);
            return (
              <View key={s.key} style={{ flexBasis: '47%', flexGrow: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: p.surface }}>
                <View style={{ height: 64, backgroundColor: fill, padding: space.sm, justifyContent: 'flex-end', borderWidth: s.key === 'bg' ? 1 : 0, borderColor: p.hairline }}>
                  <Txt variant="label" color={on}>
                    Aa {ratio.toFixed(1)}:1
                  </Txt>
                </View>
                <View style={{ padding: space.sm }}>
                  <Txt variant="headline" color={p.ink}>
                    {s.name}
                  </Txt>
                  <Txt variant="caption" color={p.inkSecondary}>
                    {fill.toUpperCase()} · {s.role}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>
        <Txt variant="caption" tone="secondary">
          Text colours on {mode === 'light' ? 'Feather' : 'Coop Night'}: ink {contrast(p.ink, p.bg).toFixed(1)}:1 · secondary {contrast(p.inkSecondary, p.bg).toFixed(1)}:1 · Barn text {contrast(p.barnText, p.bg).toFixed(1)}:1 · Sage text {contrast(p.sageText, p.bg).toFixed(1)}:1 · Yolk text {contrast(p.yolkText, p.bg).toFixed(1)}:1. Every status pairs colour with an icon and a word.
        </Txt>
      </View>

      {/* Type */}
      <View style={{ gap: space.md }}>
        <SectionHeader title="Type" />
        <Card style={{ gap: space.md }}>
          {(Object.keys(type) as (keyof typeof type)[]).map((k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
              <Txt variant="caption" tone="secondary" style={{ width: 84 }}>
                {k} · {type[k].fontSize}
              </Txt>
              <Txt variant={k} numberOfLines={1} style={{ flex: 1 }}>
                {k === 'hero' || k === 'kpi' || k === 'number' ? '1,104' : k === 'label' ? 'EGGS TODAY' : 'Your whole flock'}
              </Txt>
            </View>
          ))}
          <Txt variant="caption" tone="secondary">
            Display: Nunito (rounded, tabular figures). Text: system face. All styles scale with the phone’s font size; hero numerals cap at 125%.
          </Txt>
        </Card>
      </View>

      {/* Space, radius, elevation, motion */}
      <View style={{ gap: space.md }}>
        <SectionHeader title="Space, shape, depth, motion" />
        <Card style={{ gap: space.lg }}>
          <View style={{ gap: space.xs }}>
            {Object.entries(space).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Txt variant="caption" tone="secondary" style={{ width: 84 }}>
                  {k} · {v}
                </Txt>
                <View style={{ width: v * 3, height: 10, borderRadius: 3, backgroundColor: c.yolk }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
            {Object.entries(radius).filter(([k]) => k !== 'full').map(([k, v]) => (
              <View key={k} style={{ width: 64, height: 64, borderRadius: v, borderCurve: 'continuous', backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="caption">{k}</Txt>
              </View>
            ))}
            <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: c.surface, boxShadow: c.shadowCard, alignItems: 'center', justifyContent: 'center' }}>
              <Txt variant="caption">card</Txt>
            </View>
            <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: c.surface, boxShadow: c.shadowRaised, alignItems: 'center', justifyContent: 'center' }}>
              <Txt variant="caption">raised</Txt>
            </View>
          </View>
          <Txt variant="caption" tone="secondary">
            Springs: standard {motion.spring.duration} ms / damping {motion.spring.dampingRatio}; gentle {motion.gentle.duration} ms; snappy {motion.snappy.duration} ms. Stagger {motion.stagger} ms. Reduce Motion swaps every spring for a {motion.fade} ms crossfade.
            Touch: 48dp minimum, 56dp for logging, 72dp for primary actions.
          </Txt>
        </Card>
      </View>

      {/* Components */}
      <View style={{ gap: space.lg }}>
        <SectionHeader title="Components" />
        <Txt variant="label" tone="secondary">FLOCK PULSE</Txt>
        <Card style={{ alignItems: 'center' }}>
          <PulseRings vitals={pulse.vitals} size={200} />
        </Card>
        <Txt variant="label" tone="secondary">KPI · EGG HERO · TRAY</Txt>
        <EggHero eggs={eggs} target={eggTarget(farm, t)} compact />
        <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
          <MetricTile label="FCR" value="1.52" sub="Target ≈ 1.55" status="good" />
          <MetricTile label="Mortality" value="1.9%" sub="38 of 2,038" status="watch" />
        </View>
        <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
          <TrayGlyph size={48} />
          <TrayGlyph size={48} filled={24} />
          <Txt variant="subhead" tone="secondary" style={{ flex: 1 }}>
            One tray = 30 eggs. Partial trays show what is left.
          </Txt>
        </View>
        {flock && (
          <>
            <Txt variant="label" tone="secondary">FLOCK CARD</Txt>
            <FlockCard s={farm} flock={flock} onPress={() => router.push(`/flocks/${flock.id}`)} />
          </>
        )}
        {alert && (
          <>
            <Txt variant="label" tone="secondary">ALERT CARD · SWIPE TO DISMISS</Txt>
            <AlertCard alert={alert} index={0} onPrimary={() => {}} onSecondary={() => {}} onDismiss={() => {}} />
          </>
        )}
        {task && (
          <>
            <Txt variant="label" tone="secondary">TASK ROW</Txt>
            <Card style={{ paddingVertical: space.xs }}>
              <TaskRow task={task} who={farm.people.find((x) => x.id === task.assignee)} onToggle={() => {}} />
              <TaskRow task={{ ...task, id: 'x', title: 'Newcastle booster', kind: 'vaccine', doneAt: undefined, detail: 'House A · drinking water' }} onToggle={() => {}} />
            </Card>
          </>
        )}
        {perf && perf.actual.length > 0 && (
          <>
            <Txt variant="label" tone="secondary">CHART WITH TARGET BAND · DRAG TO SCRUB</Txt>
            <Card>
              <TargetChart actual={perf.actual} standard={perf.standard} now={perf.now} unit={perf.unit} yFormat={perf.yFormat} color={c.yolk} height={160} />
            </Card>
          </>
        )}
        <Txt variant="label" tone="secondary">STATUS BADGES</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Badge tone="sage" icon="checkCircle" label="On track" />
          <Badge tone="yolk" icon="vaccine" label="Due today" />
          <Badge tone="barn" icon="warning" label="Overdue" />
          <Badge tone="sky" icon="info" label="Lockdown tomorrow" />
          <Badge tone="barn" icon="quarantine" label="Quarantine" />
          <Badge tone="neutral" label="Upcoming" />
        </View>
        <Txt variant="label" tone="secondary">SYNC STATES</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <SyncPill pending={0} syncing={false} offline={false} />
          <SyncPill pending={12} syncing={false} offline />
          <SyncPill pending={3} syncing offline={false} />
        </View>
        <Banner tone="yolk" icon="syncProblem" title="Two egg counts for House A this morning" body="Grace logged 540 at 6:40 a.m. and Peter logged 552 at 6:45 a.m. on different phones. Keep one, or add them if they were separate collections.">
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button title="Keep 552" variant="secondary" size="md" style={{ flexGrow: 1 }} />
            <Button title="Keep 540" variant="secondary" size="md" style={{ flexGrow: 1 }} />
            <Button title="Add both" variant="ghost" size="md" style={{ flexGrow: 1 }} />
          </View>
        </Banner>
        <Banner strong tone="barn" icon="warning" title="House B: 14 losses today" body="That is far above normal. Separate sick birds, keep 2–3 for your vet, check water and temperature, and call your vet." />
        <Txt variant="label" tone="secondary">EMPTY STATE</Txt>
        <Card>
          <EmptyState art="chick" title="No eggs logged yet" body="Your first collection shows up here. Tap + then Eggs." />
        </Card>
        <Txt variant="label" tone="secondary">QUICK LOG BUTTON</Txt>
        <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: c.yolk, alignItems: 'center', justifyContent: 'center', boxShadow: c.shadowRaised }}>
            <Icon name="add" size={34} color={c.onYolk} />
          </View>
          <Txt variant="subhead" tone="secondary" style={{ flex: 1 }}>
            64dp, Yolk, bottom-end above the tabs. Tap for the menu; hold for eggs.
          </Txt>
        </View>
        {sale && (
          <>
            <Txt variant="label" tone="secondary">RECEIPT CARD</Txt>
            <ReceiptCard farmName={farm.farmName} sale={sale} customer={farm.customers.find((x) => x.id === sale.customerId)} currency={farm.settings.currency} />
          </>
        )}
      </View>

      {/* Ecosystem */}
      <View style={{ gap: space.lg }}>
        <SectionHeader title="Beyond the app" />
        <Txt variant="body" tone="secondary">
          Designs for home-screen widgets, the lock screen, an ongoing hatch notification and Wear OS. They need native widget code and ship in a later build.
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center' }}>
          <Phone label="Widget 2×2 · Eggs today">
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <Icon name="egg" size={22} color={c.yolkText} />
              <View>
                <Txt variant="kpi" style={{ fontSize: 44, lineHeight: 48 }}>
                  {fmt.int(eggs)}
                </Txt>
                <Txt variant="caption" tone="secondary">
                  {fmt.trays(eggs)}
                </Txt>
              </View>
            </View>
          </Phone>
          <Phone label="Widget 4×2 · Pulse + alert" w={344}>
            <View style={{ flexDirection: 'row', gap: space.md, flex: 1, alignItems: 'center' }}>
              <PulseRings vitals={pulse.vitals} size={120} breathe={false} />
              <View style={{ flex: 1, gap: space.xs }}>
                <Badge tone={pulse.ok ? 'sage' : 'barn'} icon={pulse.ok ? 'checkCircle' : 'warning'} label={pulse.summary} size="sm" />
                <Txt variant="headline" numberOfLines={3}>
                  {alert?.title ?? 'Nothing needs you right now.'}
                </Txt>
              </View>
            </View>
          </Phone>
          <Phone label="Widget 4×4 · Today’s tasks" w={344} h={300}>
            <Txt variant="label" tone="secondary">TODAY · {tasksOn(farm).flatMap((g) => g.tasks).filter((x) => x.doneAt).length} OF {tasksOn(farm).flatMap((g) => g.tasks).length} DONE</Txt>
            {tasksOn(farm).flatMap((g) => g.tasks).slice(0, 5).map((x) => (
              <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 }}>
                <Icon name={x.doneAt ? 'checkCircle' : 'circle'} size={22} color={x.doneAt ? c.sageText : c.inkTertiary} />
                <Txt variant="headline" tone={x.doneAt ? 'secondary' : 'primary'} numberOfLines={1} style={{ flex: 1 }}>
                  {x.title}
                </Txt>
              </View>
            ))}
          </Phone>
        </View>
        <View style={{ backgroundColor: '#14161A', borderRadius: radius.xl, padding: space.xl, gap: space.lg }}>
          <Txt variant="label" color="#BDB3A2">
            LOCK SCREEN · AT A GLANCE
          </Txt>
          <Txt variant="hero" color="#F3ECDF" style={{ fontFamily: fonts.displaySemi }}>
            5:42
          </Txt>
          <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
            {runway && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.full }}>
                <Icon name="feeder" size={18} color="#F3ECDF" />
                <Txt variant="headline" color="#F3ECDF">
                  {runway.days} days of feed
                </Txt>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.full }}>
              <Icon name="vaccine" size={18} color="#F3ECDF" />
              <Txt variant="headline" color="#F3ECDF">
                {next ? `${next.name} today` : 'No vaccine today'}
              </Txt>
            </View>
          </View>
          {inc && (
            <View style={{ backgroundColor: '#1E1F21', borderRadius: radius.lg, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <HatchRing day={incubatorStatus(inc).day} size={52} />
              <View style={{ flex: 1 }}>
                <Txt variant="caption" color="#BDB3A2">
                  ROOST · ongoing notification
                </Txt>
                <Txt variant="headline" color="#F3ECDF">
                  Hatch in {incubatorStatus(inc).hatchIn.days}d {incubatorStatus(inc).hatchIn.hours}h · {inc.tempC.toFixed(1)}°C · {inc.humidity}%
                </Txt>
              </View>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'center', gap: space.xs }}>
          <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 6, borderColor: '#2A2A2E' }}>
            <Txt variant="caption" color="#BDB3A2">
              House A · eggs
            </Txt>
            <Txt variant="kpi" color="#F5B700" style={{ fontSize: 48, lineHeight: 52 }}>
              {fmt.int(eggs)}
            </Txt>
            <Txt variant="caption" color="#BDB3A2">
              Turn crown: ±1 · press: +1 tray
            </Txt>
          </View>
          <Txt variant="caption" tone="secondary">
            Wear OS · egg tally with the rotating crown
          </Txt>
        </View>
      </View>
    </ScrollView>
  );
}
