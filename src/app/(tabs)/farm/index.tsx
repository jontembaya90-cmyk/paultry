import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Avatar, Chip, ChipRow, Progress, Segmented } from '@/components/controls';
import { QuarantineStripes } from '@/components/flock-card';
import { houseTypeLabel } from '@/components/flock-form';
import { Icon } from '@/components/icon';
import { LanguageSwitch } from '@/components/language-switch';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Card, Divider, Row, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { leaveCloud, unsyncedChanges } from '@/data/cloud';
import { fmt } from '@/data/format';
import { activeFlocks, aliveOn, birdsIn, flocksIn } from '@/data/selectors';
import { loadSampleFarm, resetFarm, updateSettings, useFarm, useSyncing } from '@/data/store';
import { signOut, useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { enablePush, unregisterFromPush, usePushStatus } from '@/lib/notifications';
import { radius, space, useTheme } from '@/theme';

const CURRENCIES = ['$', 'KES', 'UGX', 'TZS', 'NGN', 'GHS', 'ZAR', 'ETB', '€', '£', '₹'];
const ROLE = { owner: 'Owner', manager: 'Manager', worker: 'Worker', vet: 'Vet' } as const;

export default function FarmScreen() {
  const c = useTheme();
  const tr = useT();
  const farm = useFarm();
  const syncing = useSyncing();
  const auth = useAuth();
  const push = usePushStatus();
  const st = farm.settings;
  const [handing, setHanding] = useState(false);
  const birds = activeFlocks(farm).reduce((n, f) => n + aliveOn(farm, f), 0);
  const workers = farm.people.filter((p) => p.role === 'worker' || p.role === 'manager');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 2 }}>
        <Txt variant="title2">{farm.farmName}</Txt>
        <Txt variant="subhead" tone="secondary">
          {tr('{h} {h|house|houses} · {b} birds · {p} {p|person|people}', { h: farm.houses.length, b: fmt.int(birds), p: farm.people.length })}
        </Txt>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title={tr('Houses')} action={tr('Add house')} onAction={() => router.push('/house')} />
        {farm.houses.map((h) => {
          const flocks = flocksIn(farm, h.id);
          const alive = birdsIn(farm, h.id);
          const occ = alive / h.capacity;
          return (
            <View key={h.id} style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surface, boxShadow: c.shadowCard }}>
              {h.quarantine && <QuarantineStripes />}
              <Pressable
                onPress={() => router.push({ pathname: '/house', params: { id: h.id } })}
                accessibilityRole="button"
                accessibilityHint={tr('Edit {name}', { name: h.name })}
                style={{ padding: space.lg, gap: space.sm }}
                accessibilityLabel={`${h.name}, ${tr(houseTypeLabel(h.type))}, ${tr('{n} of {cap} birds', { n: fmt.int(alive), cap: fmt.int(h.capacity) })}${h.quarantine ? `, ${tr('Quarantine')}` : ''}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Icon name="coop" size={26} color={c.inkSecondary} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="headline">{h.name}</Txt>
                    <Txt variant="caption" tone="secondary">
                      {tr(houseTypeLabel(h.type))}
                      {flocks.length === 0 ? ` · ${tr('empty')}` : flocks.length > 1 ? ` · ${tr('{n} flocks', { n: flocks.length })}` : ''}
                    </Txt>
                  </View>
                  <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                    {fmt.int(alive)}
                    <Txt variant="subhead" tone="secondary">
                      {' '}/ {fmt.int(h.capacity)}
                    </Txt>
                  </Txt>
                </View>
                <Progress value={occ} color={occ > 0.95 ? c.barn : c.sage} height={8} />
                {h.quarantine && <Badge tone="barn" icon="quarantine" label={tr('Quarantine')} size="sm" />}
              </Pressable>
              {flocks.length === 0 && (
                <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
                  <Button title={tr('Add birds to {name}', { name: h.name })} icon="add" variant="secondary" full onPress={() => router.push({ pathname: '/add-flock', params: { house: h.id } })} />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title={tr('Team')} action={tr('Manage')} onAction={() => router.push('/farm/team')} />
        <Card onPress={() => router.push('/farm/team')} accessibilityLabel={`Team: ${farm.people.map((p) => `${p.name}, ${ROLE[p.role]}`).join('; ')}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flexDirection: 'row' }}>
              {farm.people.slice(0, 5).map((p, i) => (
                <View key={p.id} style={{ marginStart: i ? -10 : 0, borderWidth: 2, borderColor: c.surface, borderRadius: 22 }}>
                  <Avatar name={p.name} id={p.id} size={40} />
                </View>
              ))}
            </View>
            <Txt variant="subhead" tone="secondary" style={{ flex: 1 }}>
              {farm.people.map((p) => p.name).join(', ')}
            </Txt>
            <Icon name="chevronRight" size={22} color={c.inkTertiary} />
          </View>
        </Card>
      </View>

      <Card style={{ gap: space.md, backgroundColor: c.yolkSoft }}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Icon name="hen" size={32} color={c.yolkText} />
          <View style={{ flex: 1 }}>
            <Txt variant="title3">{tr('Worker mode')}</Txt>
            <Txt variant="subhead" tone="secondary">
              {tr('A simple screen with only today’s tasks and big log buttons. In English, Kiswahili or French.')}
            </Txt>
          </View>
        </View>
        {!handing ? (
          <Button title={tr('Hand this phone to a worker')} onPress={() => setHanding(true)} />
        ) : (
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              {tr('WHO WILL USE IT?')}
            </Txt>
            <ChipRow>
              {workers.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  size="lg"
                  onPress={() => {
                    haptic.success();
                    updateSettings({ workerMode: true, meId: p.id });
                  }}
                />
              ))}
            </ChipRow>
            {workers.length === 0 && (
              <Txt variant="subhead" tone="secondary">
                {tr('Add a worker in Team first.')}
              </Txt>
            )}
          </View>
        )}
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title={tr('Sync')} />
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name={syncing ? 'sync' : farm.sync.pending ? (st.offline ? 'cloudOff' : 'hourglass') : 'cloudDone'} size={28} color={farm.sync.pending ? c.skyText : c.sageText} />
            <View style={{ flex: 1 }}>
              <Txt variant="headline">
                {syncing
                  ? tr('Syncing…')
                  : farm.sync.pending
                    ? tr('{n} {n|entry|entries} waiting to sync', { n: farm.sync.pending })
                    : tr('Everything is synced')}
              </Txt>
              <Txt variant="subhead" tone="secondary">
                {farm.sync.pending
                  ? tr('Safe on this phone. They’ll send on their own when there’s signal.')
                  : farm.sync.lastSyncedAt
                    ? tr('Last synced {time}', { time: fmt.time(farm.sync.lastSyncedAt) })
                    : tr('Saved on this phone')}
              </Txt>
            </View>
          </View>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
            <Txt variant="body" style={{ flex: 1 }}>
              {tr('Save data: work offline')}
            </Txt>
            <Switch
              value={st.offline}
              onValueChange={(v) => updateSettings({ offline: v })}
              trackColor={{ true: c.sky, false: c.track }}
              accessibilityLabel={tr('Save data: work offline')}
            />
          </View>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title={tr('Settings')} />
        <Card style={{ gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              {tr('LANGUAGE')}
            </Txt>
            <LanguageSwitch icon={false} />
            <Txt variant="caption" tone="secondary">
              {tr('Only this phone changes. Everyone on the farm can pick their own.')}
            </Txt>
          </View>
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              {tr('CURRENCY')}
            </Txt>
            <ChipRow scroll>
              {CURRENCIES.map((x) => (
                <Chip key={x} label={x} selected={st.currency === x} onPress={() => updateSettings({ currency: x })} />
              ))}
            </ChipRow>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1, gap: space.sm }}>
              <Txt variant="label" tone="secondary">
                {tr('WEIGHT')}
              </Txt>
              <Segmented options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={st.weightUnit} onChange={(weightUnit) => updateSettings({ weightUnit })} />
            </View>
            <View style={{ flex: 1, gap: space.sm }}>
              <Txt variant="label" tone="secondary">
                {tr('TEMPERATURE')}
              </Txt>
              <Segmented options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} value={st.tempUnit} onChange={(tempUnit) => updateSettings({ tempUnit })} />
            </View>
          </View>
        </Card>
      </View>

      <Card style={{ paddingVertical: space.xs }}>
        <Row
          icon="feed"
          iconTone="yolk"
          title={tr('Feed in store')}
          subtitle={farm.stocks.length ? tr('{n} {n|feed store|feed stores}', { n: farm.stocks.length }) : tr('Add your feed store and ROOST warns you before it runs out.')}
          onPress={() => router.push(farm.stocks.length ? '/today/feed' : '/add-feed')}
        />
        <Divider inset={52} />
        <Row
          icon="calendar"
          iconTone="sky"
          title={tr('Hatchery')}
          subtitle={farm.incubators.length ? tr('{n} {n|incubator|incubators}', { n: farm.incubators.length }) : tr('Set eggs in an incubator')}
          onPress={() => router.push(farm.incubators.length ? '/flocks' : '/add-incubator')}
        />
        <Divider inset={52} />
        <Row icon="sensors" iconTone="sky" title={tr('Environment & sensors')} subtitle={tr('Temperature, humidity, ammonia, lights')} onPress={() => router.push('/farm/environment')} />
        <Divider inset={52} />
        <Row icon="palette" iconTone="yolk" title="Design system" subtitle="Tokens, components and widgets" onPress={() => router.push('/farm/design')} />
        <Divider inset={52} />
        <Row
          icon="history"
          iconTone="neutral"
          title={farm.isSample ? tr('Set up my own farm') : tr('Explore the sample farm')}
          subtitle={farm.isSample ? tr('Back to your own farm') : tr('Your own farm stays saved in your account')}
          onPress={() =>
            Alert.alert(
              farm.isSample ? tr('Set up your own farm?') : tr('Load the sample farm?'),
              farm.isSample ? tr('The sample records will be cleared.') : tr('Changes to the sample farm aren’t saved. Your own farm comes back when you leave it.'),
              [
                { text: tr('Cancel'), style: 'cancel' },
                { text: tr('Continue'), style: 'destructive', onPress: () => (farm.isSample ? resetFarm() : loadSampleFarm()) },
              ],
            )
          }
        />
      </Card>
      {auth.status === 'signedIn' && (
        <View style={{ gap: space.md }}>
          <SectionHeader title={tr('Account')} />
          <Card style={{ paddingVertical: space.xs }}>
            <Row
              icon="person"
              iconTone="sky"
              title={auth.user.name ?? 'Google account'}
              subtitle={auth.user.email ?? undefined}
              accessibilityLabel={`Signed in as ${auth.user.name ?? ''} ${auth.user.email ?? ''}`}
            />
            {push !== 'unavailable' && (
              <>
                <Divider inset={52} />
                <Row
                  icon="message"
                  iconTone={push === 'granted' ? 'sage' : 'neutral'}
                  title={tr('Notifications')}
                  subtitle={
                    push === 'granted'
                      ? tr('On: vaccine reminders and urgent alerts')
                      : push === 'denied'
                        ? tr('Off. Turn on in phone settings')
                        : tr('Get vaccine reminders and urgent alerts')
                  }
                  chevron={push !== 'granted'}
                  onPress={push === 'granted' ? undefined : () => void enablePush(auth.user.uid)}
                />
              </>
            )}
            <Divider inset={52} />
            <Row
              icon="logout"
              iconTone="barn"
              title={tr('Sign out')}
              subtitle={tr('Your farm stays saved in your account')}
              chevron={false}
              onPress={() => {
                const unsynced = unsyncedChanges();
                Alert.alert(
                  tr('Sign out of ROOST?'),
                  unsynced
                    ? tr('{n} {n|change hasn’t|changes haven’t} reached your account yet. Signing out now loses {n|it|them}. Wait for signal to keep {n|it|them}.', { n: unsynced })
                    : tr('Your farm is saved in your account. Sign in again on any phone to pick it up.'),
                  [
                    { text: tr('Cancel'), style: 'cancel' },
                    {
                      text: tr('Sign out'),
                      style: 'destructive',
                      onPress: async () => {
                        // Drop this phone's push token while still signed in, so the rules allow it.
                        await unregisterFromPush(auth.user.uid);
                        leaveCloud();
                        await signOut();
                      },
                    },
                  ],
                );
              }}
            />
          </Card>
        </View>
      )}

      <Txt variant="caption" tone="secondary" center>
        {tr('ROOST · Your whole flock, at a glance.')}
      </Txt>
    </ScrollView>
  );
}
