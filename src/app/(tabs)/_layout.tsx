import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { View } from 'react-native';

import { QuickLogFab } from '@/components/quick-log-fab';
import { useFarm } from '@/data/store';
import { activeWithdrawals, needsYou, vaccinesDueToday } from '@/data/selectors';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const c = useTheme();
  const farm = useFarm();
  const urgent = needsYou(farm);
  const health = vaccinesDueToday(farm).length + activeWithdrawals(farm).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <NativeTabs
        backgroundColor={c.surface}
        indicatorColor={c.yolkSoft}
        rippleColor={c.track}
        tintColor={c.ink}
        iconColor={{ default: c.inkSecondary, selected: c.ink }}
        labelStyle={{ default: { color: c.inkSecondary }, selected: { color: c.ink, fontWeight: '700' } }}
        badgeBackgroundColor={c.barn}
        labelVisibilityMode="labeled">
        <NativeTabs.Trigger name="today">
          <NativeTabs.Trigger.Icon sf={{ default: 'sun.horizon', selected: 'sun.horizon.fill' }} md="wb_twilight" />
          <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
          {urgent > 0 && <NativeTabs.Trigger.Badge>{String(urgent)}</NativeTabs.Trigger.Badge>}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="flocks">
          <NativeTabs.Trigger.Icon sf={{ default: 'bird', selected: 'bird.fill' }} md="egg" />
          <NativeTabs.Trigger.Label>Flocks</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="health">
          <NativeTabs.Trigger.Icon sf={{ default: 'cross.case', selected: 'cross.case.fill' }} md="health_and_safety" />
          <NativeTabs.Trigger.Label>Health</NativeTabs.Trigger.Label>
          {health > 0 && <NativeTabs.Trigger.Badge />}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="business">
          <NativeTabs.Trigger.Icon sf={{ default: 'storefront', selected: 'storefront.fill' }} md="storefront" />
          <NativeTabs.Trigger.Label>Business</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="farm">
          <NativeTabs.Trigger.Icon sf={{ default: 'house.lodge', selected: 'house.lodge.fill' }} md="home_work" />
          <NativeTabs.Trigger.Label>Farm</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <QuickLogFab />
    </View>
  );
}
