import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Avatar, Chip, ChipRow, Progress, Segmented } from '@/components/controls';
import { QuarantineStripes } from '@/components/flock-card';
import { Icon } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Card, Divider, Row, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { leaveCloud, unsyncedChanges } from '@/data/cloud';
import { fmt } from '@/data/format';
import { activeFlocks, aliveOn } from '@/data/selectors';
import { loadSampleFarm, resetFarm, updateSettings, useFarm, useSyncing } from '@/data/store';
import type { Appearance } from '@/data/types';
import { signOut, useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';

const CURRENCIES = ['$', 'KES', 'UGX', 'TZS', 'NGN', 'GHS', 'ZAR', 'ETB', '€', '£', '₹'];
const ROLE = { owner: 'Owner', manager: 'Manager', worker: 'Worker', vet: 'Vet' } as const;

export default function FarmScreen() {
  const c = useTheme();
  const farm = useFarm();
  const syncing = useSyncing();
  const auth = useAuth();
  const st = farm.settings;
  const [handing, setHanding] = useState(false);
  const birds = activeFlocks(farm).reduce((n, f) => n + aliveOn(farm, f), 0);
  const workers = farm.people.filter((p) => p.role === 'worker' || p.role === 'manager');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 2 }}>
        <Txt variant="title2">{farm.farmName}</Txt>
        <Txt variant="subhead" tone="secondary">
          {farm.houses.length} {farm.houses.length === 1 ? 'house' : 'houses'} · {fmt.int(birds)} birds · {farm.people.length} {farm.people.length === 1 ? 'person' : 'people'}
        </Txt>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Houses" action="Environment" onAction={() => router.push('/farm/environment')} />
        {farm.houses.map((h) => {
          const flock = activeFlocks(farm).find((f) => f.houseId === h.id);
          const alive = flock ? aliveOn(farm, flock) : 0;
          const occ = alive / h.capacity;
          return (
            <View key={h.id} style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surface, boxShadow: c.shadowCard }}>
              {h.quarantine && <QuarantineStripes />}
              <View
                style={{ padding: space.lg, gap: space.sm }}
                accessible
                accessibilityLabel={`${h.name}, ${h.type.replace('-', ' ')}, ${fmt.int(alive)} of ${fmt.int(h.capacity)} birds, ${Math.round(occ * 100)} percent full${h.quarantine ? ', in quarantine' : ''}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Icon name="coop" size={26} color={c.inkSecondary} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="headline">{h.name}</Txt>
                    <Txt variant="caption" tone="secondary">
                      {h.type === 'deep-litter' ? 'Deep litter' : h.type === 'cage' ? 'Cage' : 'Free-range'}
                      {flock ? '' : ' · empty'}
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
                {h.quarantine && <Badge tone="barn" icon="quarantine" label="Quarantine" size="sm" />}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Team" action="Manage" onAction={() => router.push('/farm/team')} />
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
            <Txt variant="title3">Worker mode</Txt>
            <Txt variant="subhead" tone="secondary">
              A simple screen with only today’s tasks and big log buttons. In English, Kiswahili or French.
            </Txt>
          </View>
        </View>
        {!handing ? (
          <Button title="Hand this phone to a worker" onPress={() => setHanding(true)} />
        ) : (
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              WHO WILL USE IT?
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
                Add a worker in Team first.
              </Txt>
            )}
          </View>
        )}
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Sync" />
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name={syncing ? 'sync' : farm.sync.pending ? (st.offline ? 'cloudOff' : 'hourglass') : 'cloudDone'} size={28} color={farm.sync.pending ? c.skyText : c.sageText} />
            <View style={{ flex: 1 }}>
              <Txt variant="headline">
                {syncing
                  ? 'Syncing…'
                  : farm.sync.pending
                    ? `${farm.sync.pending} ${farm.sync.pending === 1 ? 'entry' : 'entries'} waiting to sync`
                    : 'Everything is synced'}
              </Txt>
              <Txt variant="subhead" tone="secondary">
                {farm.sync.pending
                  ? 'Safe on this phone. They’ll send on their own when there’s signal.'
                  : farm.sync.lastSyncedAt
                    ? `Last synced ${fmt.time(farm.sync.lastSyncedAt)}`
                    : 'Saved on this phone'}
              </Txt>
            </View>
          </View>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
            <Txt variant="body" style={{ flex: 1 }}>
              Save data: work offline
            </Txt>
            <Switch
              value={st.offline}
              onValueChange={(v) => updateSettings({ offline: v })}
              trackColor={{ true: c.sky, false: c.track }}
              accessibilityLabel="Work offline to save mobile data"
            />
          </View>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Settings" />
        <Card style={{ gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              APPEARANCE
            </Txt>
            <Segmented<Appearance>
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Day', icon: 'sun' },
                { value: 'dawn', label: 'Dawn', icon: 'moon' },
              ]}
              value={st.appearance}
              onChange={(appearance) => updateSettings({ appearance })}
            />
            <Txt variant="caption" tone="secondary">
              Dawn Mode is dark, warm and low-glare for early checks.
            </Txt>
          </View>
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              CURRENCY
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
                WEIGHT
              </Txt>
              <Segmented options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={st.weightUnit} onChange={(weightUnit) => updateSettings({ weightUnit })} />
            </View>
            <View style={{ flex: 1, gap: space.sm }}>
              <Txt variant="label" tone="secondary">
                TEMPERATURE
              </Txt>
              <Segmented options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} value={st.tempUnit} onChange={(tempUnit) => updateSettings({ tempUnit })} />
            </View>
          </View>
        </Card>
      </View>

      <Card style={{ paddingVertical: space.xs }}>
        <Row icon="sensors" iconTone="sky" title="Environment & sensors" subtitle="Temperature, humidity, ammonia, lights" onPress={() => router.push('/farm/environment')} />
        <Divider inset={52} />
        <Row icon="palette" iconTone="yolk" title="Design system" subtitle="Tokens, components and widgets" onPress={() => router.push('/farm/design')} />
        <Divider inset={52} />
        <Row
          icon="history"
          iconTone="neutral"
          title={farm.isSample ? 'Set up my own farm' : 'Explore the sample farm'}
          subtitle={farm.isSample ? 'Back to your own farm' : 'Your own farm stays saved in your account'}
          onPress={() =>
            Alert.alert(
              farm.isSample ? 'Set up your own farm?' : 'Load the sample farm?',
              farm.isSample ? 'The sample records will be cleared.' : 'Changes to the sample farm aren’t saved. Your own farm comes back when you leave it.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Continue', style: 'destructive', onPress: () => (farm.isSample ? resetFarm() : loadSampleFarm()) },
              ],
            )
          }
        />
      </Card>
      {auth.status === 'signedIn' && (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Account" />
          <Card style={{ paddingVertical: space.xs }}>
            <Row
              icon="person"
              iconTone="sky"
              title={auth.user.name ?? 'Google account'}
              subtitle={auth.user.email ?? undefined}
              accessibilityLabel={`Signed in as ${auth.user.name ?? ''} ${auth.user.email ?? ''}`}
            />
            <Divider inset={52} />
            <Row
              icon="logout"
              iconTone="barn"
              title="Sign out"
              subtitle="Your farm stays saved in your account"
              chevron={false}
              onPress={() => {
                const unsynced = unsyncedChanges();
                Alert.alert(
                  'Sign out of ROOST?',
                  unsynced
                    ? `${unsynced} ${unsynced === 1 ? 'change hasn’t' : 'changes haven’t'} reached your account yet. Signing out now loses ${unsynced === 1 ? 'it' : 'them'}. Wait for signal to keep ${unsynced === 1 ? 'it' : 'them'}.`
                    : 'Your farm is saved in your account. Sign in again on any phone to pick it up.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign out',
                      style: 'destructive',
                      onPress: () => {
                        leaveCloud();
                        void signOut();
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
        ROOST · Your whole flock, at a glance.
      </Txt>
    </ScrollView>
  );
}
