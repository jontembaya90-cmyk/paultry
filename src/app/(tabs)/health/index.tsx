import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Segmented } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Banner, Card, Divider, Row, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { ROUTE_LABEL } from '@/data/breeds';
import { daysBetween, fmt, parseDay, toDay, today } from '@/data/format';
import { activeWithdrawals, houseName, vaccineDue, vaccineState, type VaccineState } from '@/data/selectors';
import { markVaccination, useFarm } from '@/data/store';
import type { FarmState, Vaccination, VaccineRoute } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { radius, space, useTheme, type Tone } from '@/theme';

const ROUTE_ICON: Record<VaccineRoute, IconName> = { water: 'drinker', 'eye-drop': 'water', injection: 'vaccine', 'wing-web': 'vaccine', spray: 'air' };
const STATE: Record<VaccineState, { label: string; tone: Tone; icon: IconName }> = {
  overdue: { label: 'Overdue', tone: 'barn', icon: 'warning' },
  due: { label: 'Due today', tone: 'yolk', icon: 'vaccine' },
  soon: { label: 'This week', tone: 'sky', icon: 'calendar' },
  upcoming: { label: 'Upcoming', tone: 'neutral', icon: 'calendar' },
  done: { label: 'Given', tone: 'sage', icon: 'checkCircle' },
};

function VaccineRow({ s, v }: { s: FarmState; v: Vaccination }) {
  const c = useTheme();
  const f = s.flocks.find((x) => x.id === v.flockId)!;
  const state = vaccineState(s, v);
  const due = vaccineDue(s, v);
  const actionable = state === 'due' || state === 'overdue' || state === 'soon';
  const meta = STATE[state];
  const confirm = () =>
    Alert.alert(`Mark ${v.name} as given?`, `${houseName(s, f)} · ${ROUTE_LABEL[v.route].toLowerCase()} · ${v.dose}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Given today',
        onPress: () => {
          markVaccination(v.id, true);
          haptic.success();
        },
      },
    ]);
  return (
    <Pressable
      disabled={!actionable}
      onPress={confirm}
      accessibilityRole={actionable ? 'button' : undefined}
      accessibilityLabel={`${v.name} for ${houseName(s, f)}, day ${v.ageDay}. ${ROUTE_LABEL[v.route]}, ${v.dose}. ${meta.label}${v.doneOn ? ` on ${fmt.dayShort(v.doneOn)}` : `, ${fmt.dayShort(due)}`}.`}
      accessibilityHint={actionable ? 'Marks this vaccine as given' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, paddingVertical: space.md, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 14, borderCurve: 'continuous', backgroundColor: state === 'done' ? c.sageSoft : state === 'overdue' ? c.barnSoft : c.skySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={ROUTE_ICON[v.route]} size={24} color={state === 'done' ? c.sageText : state === 'overdue' ? c.barnText : c.skyText} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{v.name}</Txt>
        <Txt variant="subhead" tone="secondary">
          {houseName(s, f)} · day {v.ageDay} · {v.doneOn ? `given ${fmt.dayShort(v.doneOn)}` : fmt.dayShort(due)}
        </Txt>
        <Txt variant="caption" tone="secondary">
          {ROUTE_LABEL[v.route]} · {v.dose}
        </Txt>
        <View style={{ marginTop: space.xs }}>
          <Badge tone={meta.tone} icon={meta.icon} label={meta.label} size="sm" />
        </View>
      </View>
      {actionable && <Icon name="chevronRight" size={20} color={c.inkTertiary} />}
    </Pressable>
  );
}

function Calendar({ s, list }: { s: FarmState; list: Vaccination[] }) {
  const c = useTheme();
  const t = today();
  const [month, setMonth] = useState(() => t.slice(0, 7));
  const [picked, setPicked] = useState(t);
  const first = parseDay(`${month}-01`);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + daysIn) / 7) * 7 }, (_, i) => i - lead + 1);
  const byDay: Record<string, Vaccination[]> = {};
  for (const v of list) (byDay[v.doneOn ?? vaccineDue(s, v)] ??= []).push(v);
  const shift = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1);
    setMonth(toDay(d).slice(0, 7));
  };
  const dayList = byDay[picked] ?? [];
  return (
    <View style={{ gap: space.md }}>
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="back" label="Previous month" variant="ghost" onPress={() => shift(-1)} />
          <Txt variant="title3">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Txt>
          <IconButton icon="chevronRight" label="Next month" variant="ghost" onPress={() => shift(1)} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Txt key={i} variant="label" tone="secondary" center style={{ flex: 1 }}>
              {d}
            </Txt>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((n, i) => {
            if (n < 1 || n > daysIn) return <View key={i} style={{ width: `${100 / 7}%`, height: 52 }} />;
            const day = `${month}-${n < 10 ? `0${n}` : n}`;
            const vs = byDay[day] ?? [];
            const states = vs.map((v) => vaccineState(s, v));
            const tone = states.includes('overdue') ? c.barn : states.includes('due') ? c.yolk : states.every((x) => x === 'done') ? c.sage : c.sky;
            const sel = day === picked;
            return (
              <Pressable
                key={i}
                onPress={() => setPicked(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${fmt.dayLong(day)}${vs.length ? `, ${vs.length} vaccine${vs.length > 1 ? 's' : ''}` : ''}`}
                style={{ width: `${100 / 7}%`, height: 52, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? c.ink : day === t ? c.yolkSoft : 'transparent' }}>
                  <Txt variant="headline" color={sel ? c.bg : c.ink} maxFontSizeMultiplier={1.4}>
                    {n}
                  </Txt>
                </View>
                <View style={{ height: 6, flexDirection: 'row', gap: 2 }}>{vs.length > 0 && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone }} />}</View>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card style={{ paddingVertical: space.sm }}>
        <Txt variant="label" tone="secondary" style={{ paddingTop: space.sm }}>
          {fmt.dayLong(picked).toUpperCase()}
        </Txt>
        {dayList.length === 0 ? (
          <Txt variant="body" tone="secondary" style={{ paddingVertical: space.md }}>
            No vaccines this day.
          </Txt>
        ) : (
          dayList.map((v, i) => (
            <Fragment key={v.id}>
              {i > 0 && <Divider />}
              <VaccineRow s={s} v={v} />
            </Fragment>
          ))
        )}
      </Card>
    </View>
  );
}

export default function HealthScreen() {
  const c = useTheme();
  const tr = useT();
  const farm = useFarm();
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [showDone, setShowDone] = useState(false);
  const t = today();
  const withdrawals = activeWithdrawals(farm);
  const activeIds = new Set(farm.flocks.filter((f) => f.status === 'active').map((f) => f.id));
  const vaccines = farm.vaccinations.filter((v) => activeIds.has(v.flockId)).sort((a, b) => (vaccineDue(farm, a) < vaccineDue(farm, b) ? -1 : 1));
  const groups: { key: VaccineState; title: string; list: Vaccination[] }[] = [
    { key: 'overdue', title: 'Overdue', list: vaccines.filter((v) => vaccineState(farm, v) === 'overdue') },
    { key: 'due', title: 'Today', list: vaccines.filter((v) => vaccineState(farm, v) === 'due') },
    { key: 'soon', title: 'This week', list: vaccines.filter((v) => vaccineState(farm, v) === 'soon') },
    { key: 'upcoming', title: 'Next 2 months', list: vaccines.filter((v) => vaccineState(farm, v) === 'upcoming' && daysBetween(t, vaccineDue(farm, v)) <= 60) },
  ];
  const done = vaccines.filter((v) => v.doneOn).sort((a, b) => ((a.doneOn ?? '') < (b.doneOn ?? '') ? 1 : -1));
  const bio = farm.biosecurity[t] ?? {};
  const bioDone = Object.values(bio).filter(Boolean).length;
  const treatments = [...farm.treatments].sort((a, b) => (a.start < b.start ? 1 : -1));

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {withdrawals.map((w) => (
        <Banner key={w.id} tone="barn" icon="medication" title={`Do not sell eggs or birds from ${w.house} until ${fmt.monthDay(w.withdrawalUntil)}`} body={`Antibiotic withdrawal: ${w.drug}. Sales from this house are blocked until it ends.`} />
      ))}

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Card onPress={() => router.push('/health/symptoms')} style={{ flex: 1, gap: space.sm }} accessibilityLabel="Symptom check. Find possible causes and share with your vet.">
          <Icon name="stethoscope" size={28} color={c.barnText} />
          <Txt variant="headline">Symptom check</Txt>
          <Txt variant="caption" tone="secondary">
            Possible causes, then share with your vet
          </Txt>
        </Card>
        <Card onPress={() => router.push('/health/biosecurity')} style={{ flex: 1, gap: space.sm }} accessibilityLabel={`Biosecurity. ${bioDone} of 6 checks done today.`}>
          <Icon name="shield" size={28} color={c.sageText} />
          <Txt variant="headline">Biosecurity</Txt>
          <Txt variant="caption" tone="secondary">
            {bioDone} of 6 checks done today
          </Txt>
        </Card>
      </View>

      <Card style={{ paddingVertical: space.xs }}>
        <Row
          icon="vaccine"
          iconTone="sky"
          title={tr('Vaccine & feeding guide')}
          subtitle={tr('What to give and when, from day-old: layers, broilers, kienyeji and more')}
          onPress={() => router.push('/health/guide')}
        />
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Vaccinations" />
        <Segmented
          options={[
            { value: 'timeline', label: 'Timeline', icon: 'timeline' },
            { value: 'calendar', label: 'Calendar', icon: 'calendar' },
          ]}
          value={view}
          onChange={setView}
        />
        {view === 'calendar' ? (
          <Calendar s={farm} list={vaccines} />
        ) : (
          <>
            {groups.filter((g) => g.list.length).map((g) => (
              <View key={g.key} style={{ gap: space.sm }}>
                <Txt variant="label" color={g.key === 'overdue' ? c.barnText : g.key === 'due' ? c.yolkText : c.inkSecondary}>
                  {g.title.toUpperCase()}
                </Txt>
                <Card style={{ paddingVertical: space.xs }}>
                  {g.list.map((v, i) => (
                    <Fragment key={v.id}>
                      {i > 0 && <Divider inset={44 + space.md} />}
                      <VaccineRow s={farm} v={v} />
                    </Fragment>
                  ))}
                </Card>
              </View>
            ))}
            {groups.every((g) => !g.list.length) && (
              <Card>
                <Txt variant="body" tone="secondary">
                  Nothing due in the next two months.
                </Txt>
              </Card>
            )}
            {done.length > 0 && (
              <View style={{ gap: space.sm }}>
                <Pressable onPress={() => setShowDone((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: showDone }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44 }}>
                  <Txt variant="label" tone="secondary">
                    GIVEN ({done.length})
                  </Txt>
                  <Icon name={showDone ? 'chevronUp' : 'chevronDown'} size={18} color={c.inkSecondary} />
                </Pressable>
                {showDone && (
                  <Card style={{ paddingVertical: space.xs }}>
                    {done.map((v, i) => (
                      <Fragment key={v.id}>
                        {i > 0 && <Divider inset={44 + space.md} />}
                        <VaccineRow s={farm} v={v} />
                      </Fragment>
                    ))}
                  </Card>
                )}
              </View>
            )}
          </>
        )}
        <Txt variant="caption" tone="secondary">
          Schedules follow a common programme for each bird type. Confirm yours with your vet.
        </Txt>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Treatments" action="Add" onAction={() => router.push('/log/medication')} />
        <Card style={{ paddingVertical: space.sm }}>
          {treatments.length === 0 ? (
            <Txt variant="body" tone="secondary" style={{ paddingVertical: space.md }}>
              No treatments recorded.
            </Txt>
          ) : (
            treatments.map((tr, i) => {
              const f = farm.flocks.find((x) => x.id === tr.flockId);
              const active = t < tr.withdrawalUntil;
              return (
                <Fragment key={tr.id}>
                  {i > 0 && <Divider />}
                  <View style={{ paddingVertical: space.md, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                      <Txt variant="headline" style={{ flex: 1 }}>
                        {tr.drug}
                      </Txt>
                      <Badge tone={active ? 'barn' : 'sage'} icon={active ? 'lock' : 'checkCircle'} label={active ? `Until ${fmt.monthDay(tr.withdrawalUntil)}` : 'Cleared'} size="sm" />
                    </View>
                    <Txt variant="subhead" tone="secondary">
                      {f ? houseName(farm, f) : ''} · {tr.reason}
                    </Txt>
                    <Txt variant="caption" tone="secondary">
                      {fmt.dayShort(tr.start)} for {tr.days} days · withdrawal ends {fmt.dayShort(tr.withdrawalUntil)}
                    </Txt>
                  </View>
                </Fragment>
              );
            })
          )}
        </Card>
      </View>

      <View style={{ borderRadius: radius.lg, padding: space.lg, backgroundColor: c.surfaceAlt, gap: space.sm }}>
        <Txt variant="headline">Your vet</Txt>
        <Txt variant="subhead" tone="secondary">
          {farm.people.find((p) => p.role === 'vet')?.name ?? 'Invite your vet from the Farm tab'} sees this health history when invited.
        </Txt>
        <Button title="Share a health report" icon="share" variant="secondary" onPress={() => router.push('/health/symptoms')} />
      </View>
    </ScrollView>
  );
}
