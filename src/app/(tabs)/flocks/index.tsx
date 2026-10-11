import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { FlockCard } from '@/components/flock-card';
import { HatchRing } from '@/components/hatch-ring';
import { Icon } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Card, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { EmptyState } from '@/components/today-parts';
import { incubatorStatus } from '@/data/selectors';
import { useFarm } from '@/data/store';
import { space, useTheme } from '@/theme';

export default function FlocksScreen() {
  const c = useTheme();
  const farm = useFarm();
  const active = farm.flocks.filter((f) => f.status === 'active');
  const archived = farm.flocks.filter((f) => f.status === 'archived');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.lg, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {active.length === 0 && (
        <Card>
          <EmptyState art="hens" title="No active flocks" body="When you place new birds, add them here to get their vaccination plan and growth targets." />
        </Card>
      )}
      {active.map((f) => (
        <FlockCard key={f.id} s={farm} flock={f} onPress={() => router.push(`/flocks/${f.id}`)} />
      ))}

      {farm.incubators.length > 0 && (
        <>
          <SectionHeader title="Hatchery" />
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
                      {inc.eggs} eggs · day {st.day} of 21
                    </Txt>
                    <Txt variant="headline" color={c.skyText}>
                      {inc.hatched !== undefined ? `${inc.hatched} chicks hatched` : `${st.next.label} on day ${st.next.day}`}
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
          <SectionHeader title="Past flocks" />
          {archived.map((f) => (
            <FlockCard key={f.id} s={farm} flock={f} onPress={() => router.push(`/flocks/${f.id}`)} />
          ))}
        </>
      )}
    </ScrollView>
  );
}
