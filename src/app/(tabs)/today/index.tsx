import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertCard } from '@/components/alert-card';
import { Button } from '@/components/button';
import { Chip, ChipRow } from '@/components/controls';
import { FlockPulseCard } from '@/components/flock-pulse';
import { Icon } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Banner, Card, Divider, Row, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { EggHero, EmptyState, FeedRunwayRow, HeatStrip, SyncPill, TaskRow } from '@/components/today-parts';
import { currentSlot, fmt, greeting, today } from '@/data/format';
import {
  activeFlocks,
  activeWithdrawals,
  ageOf,
  alerts as getAlerts,
  allTasksDone,
  birdsIn,
  eggsOn,
  eggTarget,
  feedRunway,
  flockPulse,
  heatOutlook,
  houseName,
  isLaying,
  mortalitySpike,
  needsYou,
  tasksOn,
  type Alert,
} from '@/data/selectors';
import { addTask, dismissAlert, getFarm, markVaccination, toggleTask, updateSettings, useFarm, useSyncing } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { dateLocale, taskTitle, useLang, useT } from '@/lib/i18n';
import { radius, space, useTheme } from '@/theme';

export default function TodayScreen() {
  const c = useTheme();
  const farm = useFarm();
  const syncing = useSyncing();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 840;
  const t = today();

  const tr = useT();
  const lang = useLang();
  const me = farm.people.find((p) => p.id === farm.settings.meId);
  // Whole farm, or one house. Falls back to the whole farm if that house is removed elsewhere.
  const [houseId, setHouseId] = useState<string>();
  const house = farm.houses.find((h) => h.id === houseId);
  const flocks = activeFlocks(farm).filter((f) => !house || f.houseId === house.id);
  const scope = new Set(flocks.map((f) => f.id));
  const pulse = flockPulse(farm, t, house?.id);
  const alerts = getAlerts(farm);
  const count = needsYou(farm);
  const spike = mortalitySpike(farm);
  const withdrawals = activeWithdrawals(farm);
  const heat = heatOutlook(farm);
  // In one house: its own tasks plus the farm-wide ones (feeding round, biosecurity walk).
  const groups = tasksOn(farm).map((g) => ({ ...g, tasks: g.tasks.filter((x) => !house || !x.flockId || scope.has(x.flockId)) }));
  const total = groups.reduce((n, g) => n + g.tasks.length, 0);
  const done = groups.reduce((n, g) => n + g.tasks.filter((x) => x.doneAt).length, 0);
  const laying = flocks.some((f) => isLaying(f));
  const newFlock = flocks.find((f) => ageOf(f).days < 7);
  const eggsToday = house ? flocks.reduce((n, f) => n + eggsOn(farm, t, f.id), 0) : eggsOn(farm, t);
  const eggGoal = house ? flocks.reduce((n, f) => n + eggTarget(farm, t, f.id), 0) : eggTarget(farm, t);
  const slotNow = currentSlot();
  const closed = farm.coopClosed.includes(t);

  const runAlert = (a: Alert, which: 'primary' | 'secondary') => {
    const action = (which === 'primary' ? a.primary : a.secondary)?.action;
    if (!action) return;
    switch (action.type) {
      case 'add-task': {
        const worker = farm.people.find((p) => p.role === 'worker') ?? me;
        addTask({ slot: slotNow, title: action.title, detail: action.detail, flockId: action.flockId, kind: action.kind, assignee: worker?.id ?? farm.settings.meId });
        dismissAlert(a.id);
        haptic.success();
        break;
      }
      case 'navigate':
        router.push(action.href as never);
        break;
      case 'reorder':
        router.push('/today/feed');
        break;
      case 'vaccinate':
        markVaccination(action.vaccinationId, true);
        haptic.success();
        break;
      case 'dismiss':
        dismissAlert(a.id);
        break;
    }
  };

  const onToggle = (id: string) => {
    toggleTask(id);
    const s = getFarm();
    if (allTasksDone(s) && !s.coopClosed.includes(t)) {
      setTimeout(() => router.push('/close-coop'), 450);
    }
  };

  const headline =
    count === 0 ? tr('Everything is on track.') : count === 1 ? tr('1 thing needs you today.') : tr('{n} things need you today.', { n: count });

  const header = (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' }}>
        <Txt variant="label" tone="secondary">
          {fmt.dayLong(t, dateLocale(lang)).toUpperCase()}
        </Txt>
        <SyncPill pending={farm.sync.pending} syncing={syncing} offline={farm.settings.offline} onPress={() => router.push('/farm')} />
      </View>
      <View accessible accessibilityRole="header">
        <Txt variant="largeTitle">
          {tr(greeting())}
          {me?.name ? `, ${me.name}.` : '.'}
        </Txt>
        <Txt variant="title2" color={count > 0 ? c.barnText : c.sageText}>
          {headline}
        </Txt>
      </View>
    </View>
  );

  const urgent = (
    <>
      {spike && (
        <Banner
          strong
          tone="barn"
          icon="warning"
          title={tr('{house}: {n} losses today', { house: spike.house, n: spike.count })}
          body={tr('That is far above normal. Act now, calmly:')}>
          <View style={{ gap: space.xs }}>
            {([
              'Separate sick-looking birds and keep the house closed to visitors.',
              'Remove the dead birds and keep 2–3 for your vet to examine.',
              'Check water, feed and temperature right away.',
              'Call your vet. Share the health report below.',
            ] as const).map((step, i) => (
              <Txt key={step} variant="callout" color={c.onBarn}>
                {i + 1}. {tr(step)}
              </Txt>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button title={tr('Symptom check')} variant="secondary" onPress={() => router.push('/health/symptoms')} style={{ flexGrow: 1 }} />
            <Button title={tr('Log losses')} variant="secondary" onPress={() => router.push(`/log/losses?flock=${spike.flock.id}`)} style={{ flexGrow: 1 }} />
          </View>
        </Banner>
      )}
      {withdrawals.map((w) => (
        <Pressable
          key={w.id}
          onPress={() => router.push('/health')}
          accessibilityRole="button"
          accessibilityLabel={`${w.house} is in antibiotic withdrawal. Do not sell ${w.laying ? 'eggs or birds' : 'birds'} until ${fmt.monthDay(w.withdrawalUntil)}.`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.barnSoft, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: space.lg, minHeight: 56 }}>
          <Icon name="medication" size={22} color={c.barnText} />
          <Txt variant="callout" style={{ flex: 1 }}>
            <Txt variant="headline">{w.house}: </Txt>
            {tr('no sales until {date}', { date: fmt.monthDay(w.withdrawalUntil) })}
          </Txt>
          <Icon name="chevronRight" size={20} color={c.barnText} />
        </Pressable>
      ))}
    </>
  );

  // One chip per house, so every house is one tap away, including empty ones.
  const switcher = farm.houses.length > 1 && (
    <ChipRow scroll>
      <Chip label={tr('Whole farm')} icon="farm" selected={!house} onPress={() => setHouseId(undefined)} />
      {farm.houses.map((h) => {
        const n = birdsIn(farm, h.id);
        return (
          <Chip
            key={h.id}
            label={n ? h.name : `${h.name} · ${tr('empty')}`}
            icon={h.quarantine ? 'quarantine' : undefined}
            selected={house?.id === h.id}
            onPress={() => setHouseId(h.id)}
          />
        );
      })}
    </ChipRow>
  );

  const vitals = flocks.length ? (
    <>
      <FlockPulseCard {...pulse} title={house?.name} />
      {newFlock && (
        <Banner tone="sky" icon="chick" title={tr('{house}: brooding week, day {n}', { house: houseName(farm, newFlock), n: ageOf(newFlock).days })} body={tr('Less data this week, so here is what matters most:')}>
          <View style={{ gap: space.xs }}>
            {([
              'Brooder at 32–35°C. Chicks spread evenly means they are comfortable.',
              'Fresh water first, then feed. Dip a few beaks to teach them.',
              'Check on them every 3–4 hours, day and night.',
            ] as const).map((tip) => (
              <View key={tip} style={{ flexDirection: 'row', gap: space.sm }}>
                <Icon name="check" size={18} color={c.skyText} />
                <Txt variant="callout" style={{ flex: 1 }}>
                  {tr(tip)}
                </Txt>
              </View>
            ))}
          </View>
        </Banner>
      )}
      {laying && <EggHero eggs={eggsToday} target={eggGoal} onPress={() => router.push('/log-eggs')} />}
    </>
  ) : house ? (
    <Card>
      <EmptyState
        art="hens"
        title={tr('{name} is empty', { name: house.name })}
        body={tr('No birds here right now. When you place new birds, add them so ROOST can plan their vaccines and daily tasks.')}
        action={tr('Add birds to {name}', { name: house.name })}
        onAction={() => router.push({ pathname: '/add-flock', params: { house: house.id } })}
      />
    </Card>
  ) : (
    <Card>
      <EmptyState art="hens" title={tr('No active flocks')} body={tr('Add a flock and ROOST will build its vaccination plan and growth targets.')} action={tr('Add a flock')} onAction={() => router.push('/add-flock')} />
    </Card>
  );

  const alertList = alerts.length > 0 && (
    <View style={{ gap: space.md }}>
      <SectionHeader title={tr('Needs you')} />
      {alerts.map((a, i) => (
        <AlertCard
          key={a.id}
          alert={a}
          index={i}
          onPrimary={() => runAlert(a, 'primary')}
          onSecondary={() => runAlert(a, 'secondary')}
          onDismiss={() => dismissAlert(a.id)}
        />
      ))}
    </View>
  );

  const weather = heat && <HeatStrip hours={heat.hours} peak={heat.peak} guidance={heat.guidance} tempUnit={farm.settings.tempUnit} />;

  const tasks = total > 0 && (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <SectionHeader title={house ? tr('Tasks · {name}', { name: house.name }) : tr('Today’s tasks')} style={{ flex: 1 }} />
        <Txt variant="subhead" tone="secondary">
          {tr('{done} of {total} done', { done, total })}
        </Txt>
      </View>
      {groups.filter((g) => g.tasks.length).map((g) => {
        const allDone = g.tasks.every((x) => x.doneAt);
        return (
          <Card key={g.key} style={{ paddingVertical: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs }}>
              <Icon name={g.key === 'evening' ? 'moon' : 'sun'} size={18} color={g.key === slotNow ? c.yolkText : c.inkTertiary} />
              <Txt variant="label" color={g.key === slotNow ? c.yolkText : c.inkSecondary}>
                {tr(g.label).toUpperCase()}
                {g.key === slotNow ? ` · ${tr('NOW')}` : ''}
              </Txt>
              {allDone && <Icon name="checkCircle" size={16} color={c.sageText} />}
            </View>
            {g.tasks.map((task, i) => (
              <Fragment key={task.id}>
                {i > 0 && <Divider inset={30 + space.md} />}
                <TaskRow
                  task={{ ...task, title: taskTitle(task.title, lang) }}
                  who={farm.people.find((p) => p.id === (task.doneBy ?? task.assignee))}
                  onToggle={() => onToggle(task.id)}
                />
              </Fragment>
            ))}
            {g.key === 'evening' && allDone && (
              <Button
                title={closed ? tr('See today’s summary') : tr('Close the coop')}
                icon="moon"
                variant={closed ? 'secondary' : 'primary'}
                full
                onPress={() => router.push('/close-coop')}
                style={{ marginVertical: space.sm }}
              />
            )}
          </Card>
        );
      })}
    </View>
  );

  const feed = farm.stocks.length > 0 ? (
    <View style={{ gap: space.md }}>
      <SectionHeader title={tr('Feed runway')} action={tr('Feed & water')} onAction={() => router.push('/today/feed')} />
      <Card style={{ gap: space.lg }}>
        {farm.stocks.map((st, i) => {
          const r = feedRunway(farm, st.id);
          return (
            <Fragment key={st.id}>
              {i > 0 && <Divider />}
              <FeedRunwayRow name={st.name} days={r.days} fill={r.fill} untilMarket={r.untilMarket} dailyKg={r.dailyKg} onReorder={() => router.push(`/today/feed?reorder=${st.id}`)} />
            </Fragment>
          );
        })}
      </Card>
    </View>
  ) : flocks.length > 0 && (
    <Card style={{ paddingVertical: space.xs }}>
      <Row icon="feed" iconTone="yolk" title={tr('How much feed do you have?')} subtitle={tr('Add your feed store and ROOST warns you before it runs out.')} onPress={() => router.push('/add-feed')} />
    </Card>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={syncing}
          onRefresh={() => {
            // Pull to sync: flushes the offline queue if we are online.
            if (farm.settings.offline) haptic.warning();
            else updateSettings({ offline: false });
          }}
          colors={[c.yolk]}
          tintColor={c.yolk}
          progressBackgroundColor={c.surface}
        />
      }
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingHorizontal: space.gutter,
        paddingBottom: FAB_CLEARANCE + space.xl,
        gap: space.xl,
        maxWidth: wide ? 1200 : 720,
        width: '100%',
        alignSelf: 'center',
      }}>
      {header}
      {wide ? (
        <View style={{ flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: space.xl }}>
            {urgent}
            {switcher}
            {vitals}
            {alertList}
          </View>
          <View style={{ flex: 1, gap: space.xl }}>
            {weather}
            {tasks}
            {feed}
          </View>
        </View>
      ) : (
        <>
          {urgent}
          {switcher}
          {vitals}
          {alertList}
          {tasks}
          {weather}
          {feed}
        </>
      )}
    </ScrollView>
  );
}
