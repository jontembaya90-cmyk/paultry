import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { FlockCard } from '@/components/flock-card';
import { HatchRing } from '@/components/hatch-ring';
import { Icon } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Card, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { EmptyState } from '@/components/today-parts';
import { incubatorStatus } from '@/data/selectors';
import { useFarm } from '@/data/store';
import { useT } from '@/lib/i18n';
import { space, useTheme } from '@/theme';

export default function FlocksScreen() {
  const c = useTheme();
  const tr = useT();
  const farm = useFarm();
  const active = farm.flocks.filter((f) => f.status === 'active');
  const archived = farm.flocks.filter((f) => f.status === 'archived');
  const hatchery = farm.farmTypes.includes('hatchery') || farm.incubators.length > 0;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.lg, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {active.length === 0 ? (
        <Card>
          <EmptyState
            art="hens"
            title={tr('No active flocks')}
            body={tr('When you place new birds, add them here to get their vaccination plan and growth targets.')}
            action={tr('Add a flock')}
            onAction={() => router.push('/add-flock')}
          />
        </Card>
      ) : (
        <Button title={tr('Add a flock')} icon="add" variant="secondary" full onPress={() => router.push('/add-flock')} />
      )}
      {active.map((f) => (
        <FlockCard key={f.id} s={farm} flock={f} onPress={() => router.push(`/flocks/${f.id}`)} />
      ))}

      {hatchery && (
        <>
          <SectionHeader title={tr('Hatchery')} action={tr('Set eggs')} onAction={() => router.push('/add-incubator')} />
          {farm.incubators.length === 0 && (
            <Txt variant="subhead" tone="secondary">
              {tr('ROOST reminds you to candle on days 7 and 14, lock down on day 18 and count chicks on day 21.')}
            </Txt>
          )}
          {farm.incubators.map((inc) => {
            const st = incubatorStatus(inc);
            return (
              <Card
                key={inc.id}
                onPress={() => router.push(`/flocks/incubator/${inc.id}`)}
                accessibilityLabel={`${inc.name}, ${inc.eggs} eggs, day ${st.day} of 21. Next: ${st.next.label} on day ${st.next.day}.`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
                  <HatchRing day={st.day} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="title3">{inc.name}</Txt>
                    <Txt variant="subhead" tone="secondary">
                      {tr('{eggs} eggs · day {day} of 21', { eggs: inc.eggs, day: st.day })}
                    </Txt>
                    <Txt variant="headline" color={c.skyText}>
                      {inc.hatched !== undefined ? tr('{n} chicks hatched', { n: inc.hatched }) : tr('{label} on day {day}', { label: tr(st.next.label), day: st.next.day })}
                    </Txt>
                  </View>
                  <Icon name="chevronRight" size={22} color={c.inkTertiary} />
                </View>
              </Card>
            );
          })}
        </>
      )}

      {archived.length > 0 && (
        <>
          <SectionHeader title={tr('Past flocks')} />
          {archived.map((f) => (
            <FlockCard key={f.id} s={farm} flock={f} onPress={() => router.push(`/flocks/${f.id}`)} />
          ))}
        </>
      )}
    </ScrollView>
  );
}
