import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Avatar } from '@/components/controls';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Card } from '@/components/surface';
import { Txt } from '@/components/text';
import { EmptyState } from '@/components/today-parts';
import { daysBetween, fmt, today } from '@/data/format';
import { customerBalances } from '@/data/selectors';
import { useFarm } from '@/data/store';
import { space } from '@/theme';

export default function Customers() {
  const farm = useFarm();
  const cur = farm.settings.currency;
  const list = customerBalances(farm);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.md, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {list.length === 0 && <EmptyState art="nest" title="No customers yet" body="Customers are added when you log your first sale." action="Log a sale" onAction={() => router.push('/sale')} />}
      {list.map((cu) => (
        <Card key={cu.id} style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name={cu.name} id={cu.id} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{cu.name}</Txt>
              <Txt variant="subhead" tone="secondary">
                {cu.last ? `Last order ${daysBetween(cu.last, today()) === 0 ? 'today' : `${daysBetween(cu.last, today())} days ago`}` : 'No orders yet'} · {fmt.money(cu.total, cur)} total
              </Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {cu.owed > 0 && <Badge tone="barn" icon="hourglass" label={`Owes ${fmt.money(cu.owed, cur)}`} />}
            {cu.reorderDue && <Badge tone="yolk" icon="history" label={`Usually orders every ${cu.cadenceDays} days`} />}
            {cu.owed === 0 && !cu.reorderDue && <Badge tone="sage" icon="checkCircle" label="All settled" />}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {cu.phone && <Button title="Call" icon="call" variant="secondary" size="md" onPress={() => Linking.openURL(`tel:${cu.phone}`)} style={{ flex: 1 }} />}
            {cu.phone && (
              <Button
                title={cu.owed > 0 ? 'Remind' : 'Message'}
                icon="message"
                variant="secondary"
                size="md"
                onPress={() =>
                  Linking.openURL(
                    `sms:${cu.phone}?body=${encodeURIComponent(
                      cu.owed > 0
                        ? `Hello ${cu.name}, a friendly reminder from ${farm.farmName}: ${fmt.money(cu.owed, cur)} is outstanding. Thank you!`
                        : `Hello ${cu.name}, fresh eggs are ready at ${farm.farmName}. Would you like your usual order?`,
                    )}`,
                  )
                }
                style={{ flex: 1 }}
              />
            )}
            <Button title="Sell" icon="sale" variant="tinted" tone="sage" size="md" onPress={() => router.push(`/sale?customer=${cu.id}`)} style={{ flex: 1 }} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
