import { Fragment, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Avatar, Chip, ChipRow, Field } from '@/components/controls';
import { Icon } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { fmt, today } from '@/data/format';
import { tasksOn } from '@/data/selectors';
import { addPerson, assignTask, removePerson, useFarm } from '@/data/store';
import type { Role } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { space, useTheme } from '@/theme';

const ROLES: { key: Role; label: string; can: string }[] = [
  { key: 'owner', label: 'Owner', can: 'Everything, including money and team' },
  { key: 'manager', label: 'Manager', can: 'All records and tasks; sees sales, not profit' },
  { key: 'worker', label: 'Worker', can: 'Today’s tasks and quick logging only' },
  { key: 'vet', label: 'Vet', can: 'Health history, vaccines and treatments' },
];

export default function Team() {
  const c = useTheme();
  const farm = useFarm();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('worker');
  const [moving, setMoving] = useState<string | null>(null);
  const open = tasksOn(farm).flatMap((g) => g.tasks).filter((t) => !t.doneAt);
  const shiftNotes = farm.notes.filter((n) => n.day >= today().slice(0, 8) + '01').sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 4);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Card style={{ paddingVertical: space.xs }}>
        {farm.people.map((p, i) => {
          const r = ROLES.find((x) => x.key === p.role)!;
          const mine = open.filter((t) => t.assignee === p.id).length;
          return (
            <Fragment key={p.id}>
              {i > 0 && <Divider inset={56} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72 }}>
                <Avatar name={p.name} id={p.id} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="headline">
                    {p.name || 'You'}
                    {p.name && p.id === farm.settings.meId ? ' (you)' : ''}
                  </Txt>
                  <Txt variant="caption" tone="secondary">
                    {r.label} · {r.can}
                  </Txt>
                  {mine > 0 && <Badge tone="yolk" label={`${mine} open ${mine === 1 ? 'task' : 'tasks'} today`} size="sm" />}
                </View>
                {p.phone && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Call ${p.name}`} onPress={() => Linking.openURL(`tel:${p.phone}`)} hitSlop={8} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="call" size={24} color={c.inkSecondary} />
                  </Pressable>
                )}
                {p.id !== farm.settings.meId && p.role !== 'owner' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${p.name}`}
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert(`Remove ${p.name}?`, 'Their open tasks come back to you.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removePerson(p.id) },
                      ])
                    }
                    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="close" size={22} color={c.inkTertiary} />
                  </Pressable>
                )}
              </View>
            </Fragment>
          );
        })}
      </Card>

      {adding ? (
        <Card style={{ gap: space.lg }}>
          <Txt variant="title3">Invite someone</Txt>
          <Field label="Name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
          <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <ChipRow>
            {ROLES.filter((r) => r.key !== 'owner').map((r) => (
              <Chip key={r.key} label={r.label} selected={role === r.key} onPress={() => setRole(r.key)} />
            ))}
          </ChipRow>
          <Txt variant="subhead" tone="secondary">
            {ROLES.find((r) => r.key === role)!.can}.
          </Txt>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Cancel" variant="ghost" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            <Button
              title="Add"
              disabled={name.trim().length < 2}
              onPress={() => {
                addPerson(name.trim(), role, phone.trim() || undefined);
                haptic.success();
                setAdding(false);
                setName('');
                setPhone('');
              }}
              style={{ flex: 2 }}
            />
          </View>
        </Card>
      ) : (
        <Button title="Invite someone" icon="personAdd" variant="secondary" onPress={() => setAdding(true)} />
      )}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Open tasks today" />
        <Card style={{ paddingVertical: space.xs }}>
          {open.length === 0 ? (
            <Txt variant="body" tone="secondary" style={{ paddingVertical: space.md }}>
              Everything is done for today.
            </Txt>
          ) : (
            open.map((t, i) => {
              const who = farm.people.find((p) => p.id === t.assignee);
              return (
                <Fragment key={t.id}>
                  {i > 0 && <Divider />}
                  <View style={{ paddingVertical: space.md, gap: space.sm }}>
                    <Pressable
                      onPress={() => setMoving(moving === t.id ? null : t.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.title}, ${t.detail ?? ''}, assigned to ${who?.name ?? 'nobody'}. Tap to reassign.`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 }}>
                      <View style={{ flex: 1 }}>
                        <Txt variant="headline">{t.title}</Txt>
                        <Txt variant="caption" tone="secondary">
                          {t.slot.charAt(0).toUpperCase() + t.slot.slice(1)} · {t.detail}
                        </Txt>
                      </View>
                      {who && <Avatar name={who.name} id={who.id} size={32} />}
                    </Pressable>
                    {moving === t.id && (
                      <ChipRow>
                        {farm.people.filter((p) => p.role !== 'vet').map((p) => (
                          <Chip
                            key={p.id}
                            label={p.name}
                            selected={p.id === t.assignee}
                            onPress={() => {
                              assignTask(t.id, p.id);
                              setMoving(null);
                            }}
                          />
                        ))}
                      </ChipRow>
                    )}
                  </View>
                </Fragment>
              );
            })
          )}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Shift notes" />
        {shiftNotes.length === 0 ? (
          <Card>
            <Txt variant="body" tone="secondary">
              Notes from the team appear here. Use Quick Log → Note.
            </Txt>
          </Card>
        ) : (
          shiftNotes.map((n) => {
            const who = farm.people.find((p) => p.id === n.by);
            return (
              <Card key={n.id} style={{ flexDirection: 'row', gap: space.md }}>
                {who && <Avatar name={who.name} id={who.id} size={32} />}
                <View style={{ flex: 1, gap: space.xs }}>
                  <Txt variant="body" selectable>
                    {n.text}
                  </Txt>
                  <Txt variant="caption" tone="secondary">
                    {who?.name ?? 'Someone'} · {fmt.dayShort(n.day)}, {fmt.time(n.at)}
                  </Txt>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
