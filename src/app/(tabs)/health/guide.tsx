import { useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, ChipRow } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { breedById } from '@/data/breeds';
import { CARE_GROUPS, FEEDING_TIPS, feedPlan, groupOf, phaseGrams, say, VACCINE_TIPS, vaccineGuide, type CareGroup } from '@/data/care';
import { activeFlocks } from '@/data/selectors';
import { useFarm } from '@/data/store';
import { useAgeLabel, useLang, useT } from '@/lib/i18n';
import { radius, space, useTheme } from '@/theme';


function Tips({ icon, title, tips }: { icon: IconName; title: string; tips: string[] }) {
  const c = useTheme();
  return (
    <Card style={{ gap: space.sm, backgroundColor: c.skySoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name={icon} size={20} color={c.skyText} />
        <Txt variant="headline">{title}</Txt>
      </View>
      {tips.map((tip) => (
        <View key={tip} style={{ flexDirection: 'row', gap: space.sm }}>
          <Icon name="check" size={18} color={c.skyText} />
          <Txt variant="callout" style={{ flex: 1 }}>
            {tip}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

/**
 * Feeding and vaccination from day-old, for each kind of bird. Opens on the farm's own
 * birds, and uses the farm's own breed for the grams-per-bird figures when it has one.
 */
export default function CareGuide() {
  const c = useTheme();
  const tr = useT();
  const lang = useLang();
  const ageLabel = useAgeLabel();
  const farm = useFarm();
  const params = useLocalSearchParams<{ group?: CareGroup }>();
  const flocks = activeFlocks(farm);
  const [group, setGroup] = useState<CareGroup>(
    () => CARE_GROUPS.find((g) => g.key === params.group)?.key ?? (flocks[0] ? groupOf(breedById(flocks[0].breedId).species).key : 'layers'),
  );
  const meta = CARE_GROUPS.find((g) => g.key === group)!;
  const own = flocks.find((f) => breedById(f.breedId).species === meta.species);
  const breed = breedById(own?.breedId ?? meta.sample);
  const plan = feedPlan(breed.id);
  const vaccines = vaccineGuide(meta.species, lang);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: space.md }}>
        <ChipRow scroll>
          {CARE_GROUPS.map((g) => (
            <Chip key={g.key} label={say(g.label, lang)} selected={g.key === group} onPress={() => setGroup(g.key)} />
          ))}
        </ChipRow>
        <Txt variant="body" tone="secondary">
          {tr('From day-old onwards. Amounts are for {breed}; ages are a common guide, so also follow the feed bag and your vet.', { breed: breed.name })}
        </Txt>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title={tr('Feeding programme')} />
        {plan.map((p, i) => {
          const [g0, g1] = phaseGrams(breed.id, p);
          const until = p.to ?? breed.marketDay;
          return (
            <Card key={p.id} style={{ gap: space.sm, borderStartWidth: 6, borderStartColor: c.wheat }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Txt variant="label" tone="secondary" style={{ flex: 1 }}>
                  {tr('STEP {n}', { n: i + 1 })} ·{' '}
                  {until !== undefined
                    ? tr('{from} to {to}', { from: ageLabel(p.from), to: ageLabel(until) }).toUpperCase()
                    : tr('From {age}', { age: ageLabel(p.from) }).toUpperCase()}
                </Txt>
                <Badge tone="neutral" label={tr('{pct} protein', { pct: p.protein })} size="sm" />
              </View>
              <Txt variant="title3">{say(p.name, lang)}</Txt>
              <Txt variant="subhead" color={c.wheatText}>
                {tr('About {a}–{b} g per bird a day', { a: g0, b: g1 })}
              </Txt>
              <Txt variant="callout" tone="secondary">
                {say(p.note, lang)}
              </Txt>
            </Card>
          );
        })}
        <Tips icon="feed" title={tr('Feeding tips')} tips={FEEDING_TIPS.map((t) => say(t, lang))} />
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title={tr('Vaccination schedule')} />
        <Card style={{ paddingVertical: space.xs }}>
          {vaccines.map((v, i) => (
            <Fragment key={`${v.ageDay}-${v.name}`}>
              {i > 0 && <Divider inset={72 + space.md} />}
              <View
                style={{ flexDirection: 'row', gap: space.md, paddingVertical: space.md }}
                accessible
                accessibilityLabel={`${ageLabel(v.ageDay)}. ${v.name}. ${v.disease}. ${say(v.route, lang)}, ${v.dose}.${v.everyWeeks ? ` ${tr('Then every {n} weeks', { n: v.everyWeeks })}.` : ''}${v.note ? ` ${v.note}` : ''}`}>
                <View style={{ width: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.skySoft, paddingVertical: space.sm, alignSelf: 'flex-start' }}>
                  <Txt variant="headline" color={c.skyText} center>
                    {ageLabel(v.ageDay)}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="headline">{v.name}</Txt>
                  <Txt variant="subhead" tone="secondary">
                    {tr('Protects against: {disease}', { disease: v.disease })}
                  </Txt>
                  <Txt variant="subhead" tone="secondary">
                    {say(v.route, lang)} · {v.dose}
                  </Txt>
                  {v.everyWeeks && (
                    <Txt variant="subhead" color={c.skyText}>
                      {tr('Then every {n} weeks', { n: v.everyWeeks })}
                    </Txt>
                  )}
                  {v.note && (
                    <Txt variant="caption" tone="secondary">
                      {v.note}
                    </Txt>
                  )}
                </View>
              </View>
            </Fragment>
          ))}
        </Card>
        <Tips icon="vaccine" title={tr('Vaccination tips')} tips={VACCINE_TIPS.map((t) => say(t, lang))} />
      </View>

      <Txt variant="caption" tone="secondary" center>
        {tr('A common starting point, not a prescription. Your vet knows which diseases are around your area.')}
      </Txt>
    </ScrollView>
  );
}
