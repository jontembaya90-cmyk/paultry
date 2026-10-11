import { Fragment, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/controls';
import { QuarantineStripes } from '@/components/flock-card';
import { Icon, type IconName } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { fmt, today } from '@/data/format';
import { addVisitor, setBiosecurity, setQuarantine, useFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';

const CHECKS: { id: string; label: string; icon: IconName }[] = [
  { id: 'footbath', label: 'Footbaths refreshed', icon: 'footprint' },
  { id: 'visitors', label: 'Visitors logged', icon: 'people' },
  { id: 'disposal', label: 'Dead birds disposed of', icon: 'hen' },
  { id: 'feeders', label: 'Feeders and drinkers cleaned', icon: 'drinker' },
  { id: 'rodents', label: 'Rodent bait checked', icon: 'shield' },
  { id: 'clothes', label: 'Boots and overalls at the door', icon: 'lock' },
];

export default function Biosecurity() {
  const c = useTheme();
  const farm = useFarm();
  const t = today();
  const done = farm.biosecurity[t] ?? {};
  const count = CHECKS.filter((x) => done[x.id]).length;
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [risk, setRisk] = useState(false);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <SectionHeader title="Today's checklist" style={{ flex: 1 }} />
          <Txt variant="subhead" tone="secondary">
            {count} of {CHECKS.length}
          </Txt>
        </View>
        <Card style={{ paddingVertical: space.xs }}>
          {CHECKS.map((x, i) => {
            const on = !!done[x.id];
            return (
              <Fragment key={x.id}>
                {i > 0 && <Divider inset={40 + space.md} />}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={x.label}
                  onPress={() => {
                    if (on) haptic.toggleOff();
                    else haptic.toggleOn();
                    setBiosecurity(x.id, !on);
                  }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, opacity: pressed ? 0.6 : 1 })}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: on ? c.sage : 'transparent', borderWidth: on ? 0 : 2, borderColor: c.inkTertiary, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={on ? 'check' : x.icon} size={22} color={on ? '#FFFFFF' : c.inkSecondary} />
                  </View>
                  <Txt variant="headline" tone={on ? 'secondary' : 'primary'} style={{ flex: 1 }}>
                    {x.label}
                  </Txt>
                </Pressable>
              </Fragment>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Visitors" action={signing ? undefined : 'Sign in'} onAction={() => setSigning(true)} />
        {signing && (
          <Card style={{ gap: space.lg }}>
            <Field label="Name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
            <Field label="Reason for visit" value={purpose} onChangeText={setPurpose} placeholder="e.g. Feed delivery" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }}>
              <Txt variant="body" style={{ flex: 1 }}>
                Visited another poultry farm in the last 48 hours?
              </Txt>
              <Switch value={risk} onValueChange={setRisk} trackColor={{ true: c.barn, false: c.track }} accessibilityLabel="Visited another poultry farm in the last 48 hours" />
            </View>
            {risk && (
              <Txt variant="subhead" color={c.barnText}>
                Ask them to change boots and overalls, use the footbath, and stay out of the houses if possible.
              </Txt>
            )}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Cancel" variant="ghost" onPress={() => setSigning(false)} style={{ flex: 1 }} />
              <Button
                title="Sign in"
                disabled={name.trim().length < 2}
                onPress={() => {
                  addVisitor(name.trim(), purpose.trim() || 'Not given', risk);
                  setBiosecurity('visitors', true);
                  haptic.success();
                  setSigning(false);
                  setName('');
                  setPurpose('');
                  setRisk(false);
                }}
                style={{ flex: 2 }}
              />
            </View>
          </Card>
        )}
        <Card style={{ paddingVertical: space.xs }}>
          {farm.visitors.length === 0 ? (
            <Txt variant="body" tone="secondary" style={{ paddingVertical: space.md }}>
              No visitors yet.
            </Txt>
          ) : (
            farm.visitors.slice(0, 8).map((v, i) => (
              <Fragment key={v.id}>
                {i > 0 && <Divider />}
                <View style={{ paddingVertical: space.md, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                    <Txt variant="headline" style={{ flex: 1 }}>
                      {v.name}
                    </Txt>
                    {v.otherFarmRecently && <Badge tone="yolk" icon="warning" label="Other farm < 48h" size="sm" />}
                  </View>
                  <Txt variant="subhead" tone="secondary">
                    {v.purpose} · {fmt.dayShort(v.at.slice(0, 10))}, {fmt.time(v.at)}
                  </Txt>
                </View>
              </Fragment>
            ))
          )}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Quarantine" />
        <Txt variant="subhead" tone="secondary">
          Quarantine marks a house so everyone cares for it last, with separate boots, and keeps visitors out.
        </Txt>
        {farm.houses.map((h) => (
          <View key={h.id} style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surface, boxShadow: c.shadowCard }}>
            {h.quarantine && <QuarantineStripes />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 72 }}>
              <Icon name={h.quarantine ? 'quarantine' : 'coop'} size={28} color={h.quarantine ? c.barnText : c.inkSecondary} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="headline">{h.name}</Txt>
                {h.quarantine && <Badge tone="barn" icon="quarantine" label="In quarantine" size="sm" />}
              </View>
              <Switch
                value={!!h.quarantine}
                onValueChange={(v) => {
                  setQuarantine(h.id, v);
                  if (v) haptic.warning();
                }}
                trackColor={{ true: c.barn, false: c.track }}
                accessibilityLabel={`Quarantine ${h.name}`}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
