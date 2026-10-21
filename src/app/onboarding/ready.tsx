import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { useDraft } from '@/components/onboarding-draft';
import { Card } from '@/components/surface';
import { Txt } from '@/components/text';
import { breedById, interpolate, SPECIES_LABEL, vaccineSchedule } from '@/data/breeds';
import { feedingNow, say } from '@/data/care';
import { addDays, fmt, today } from '@/data/format';
import { createFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { useLang, useT } from '@/lib/i18n';
import { space, useTheme } from '@/theme';

export default function Ready() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const tr = useT();
  const lang = useLang();
  const { draft } = useDraft();
  const flocks = draft.flocks.map((f) => ({ ...f, breed: breedById(f.breedId), born: addDays(today(), -f.ageDays) }));
  const first = flocks[0];
  const breed = first.breed;
  const upcoming = flocks
    .flatMap((f) => vaccineSchedule(f.breed.species).filter((v) => v.ageDay >= f.ageDays).map((v) => ({ ...v, on: addDays(f.born, v.ageDay) })))
    .sort((a, b) => (a.on < b.on ? -1 : 1));
  const next = upcoming[0];
  const birds = flocks.reduce((n, f) => n + f.count, 0);
  const feedKg = flocks.reduce((n, f) => n + f.count * interpolate(f.breed.feed, f.ageDays), 0);
  const unit = SPECIES_LABEL[breed.species].many;

  const target = flocks.length > 1
    ? tr('A growth curve for each of your {n} flocks', { n: flocks.length })
    : breed.marketDay
      ? tr('Reach {kg} kg by market day {day}', { kg: interpolate(breed.weight, breed.marketDay).toFixed(1), day: breed.marketDay })
      : breed.lay
        ? tr('Point of lay around week {week}, peaking near {pct}', { week: Math.ceil(breed.lay.find(([, r]) => r > 0.04)?.[0] ?? 20), pct: fmt.pct(Math.max(...breed.lay.map(([, r]) => r))) })
        : tr('Growth curve for {breed}', { breed: breed.name });

  const where = flocks.length > 1
    ? tr('{birds} birds in {n} houses.', { birds: fmt.int(birds), n: flocks.length })
    : `${fmt.int(first.count)} ${breed.name} ${unit} · ${draft.houses[first.houseIndex]?.name ?? ''} · ${first.ageDays === 0 ? tr('Day-old') : first.ageDays < 28 ? tr('day {n}', { n: first.ageDays }) : tr('week {n}', { n: Math.floor(first.ageDays / 7) })}.`;
  const empty = draft.houses.filter((_, i) => !draft.flocks.some((f) => f.houseIndex === i));

  // The first flock's feed now and its next change, the same plan its flock page shows.
  const feeding = feedingNow({ id: 'draft', houseId: '', breedId: first.breedId, hatchedOn: first.born, placedCount: first.count, status: 'active' });
  const items: { icon: IconName; tone: string; title: string; body: string }[] = [
    {
      icon: 'vaccine',
      tone: c.skyText,
      title: tr('{n} {n|vaccination|vaccinations} scheduled', { n: upcoming.length }),
      body: next ? tr('First: {name} on {date}', { name: next.name, date: fmt.dayShort(next.on) }) : tr('All core vaccines already given'),
    },
    { icon: 'chart', tone: c.sageText, title: tr('Growth targets set'), body: target },
    {
      icon: 'feed',
      tone: c.wheatText,
      title: tr('Feed now: {feed}', { feed: say(feeding.current.name, lang) }),
      body: feeding.next ? tr('Then {feed} from {date}. The Health tab has the full feeding and vaccine guide.', { feed: say(feeding.next.phase.name, lang), date: fmt.dayShort(feeding.next.on) }) : tr('The Health tab has the full feeding and vaccine guide.'),
    },
    { icon: 'feeder', tone: c.wheatText, title: tr('About {kg} kg of feed a day', { kg: fmt.int(feedKg) }), body: tr('For {birds} birds at their age today. Rises as they grow.', { birds: fmt.int(birds) }) },
    { icon: 'checkCircle', tone: c.yolkText, title: tr('Daily tasks ready'), body: tr('Feeding, water checks and egg collection, in the order you do them.') },
  ];

  useEffect(() => {
    const id = setTimeout(() => haptic.success(), reduced ? 0 : 350);
    return () => clearTimeout(id);
  }, [reduced]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xxl, paddingHorizontal: space.gutter, paddingBottom: space.xl, gap: space.xl, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <Animated.View
            entering={reduced ? FadeIn : ZoomIn.delay(150).springify().damping(10)}
            style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.sage, alignItems: 'center', justifyContent: 'center', boxShadow: c.shadowRaised }}>
            <Icon name="check" size={56} color="#FFFFFF" />
          </Animated.View>
          <Animated.View entering={reduced ? FadeIn : FadeInDown.delay(300).springify()} style={{ alignItems: 'center', gap: space.xs }}>
            <Txt variant="largeTitle" center accessibilityRole="header">
              {tr('Your plan is ready')}
            </Txt>
            <Txt variant="body" tone="secondary" center>
              {where}
            </Txt>
          </Animated.View>
        </View>
        <View style={{ gap: space.md }}>
          {items.map((it, i) => (
            <Animated.View key={it.title} entering={reduced ? FadeIn.delay(100 * i) : FadeInDown.delay(550 + i * 140).springify().damping(16)}>
              <Card style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
                <Icon name={it.icon} size={30} color={it.tone} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="headline">{it.title}</Txt>
                  <Txt variant="subhead" tone="secondary">
                    {it.body}
                  </Txt>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
        {empty.length > 0 && (
          <Txt variant="callout" tone="secondary" center>
            {tr('{names}: empty for now. Add birds from the Farm tab when you place them.', { names: empty.map((h) => h.name).join(', ') })}
          </Txt>
        )}
        <Txt variant="caption" tone="secondary" center>
          {tr('Vaccination plans are a common starting point. Confirm yours with your vet; you can edit it any time.')}
        </Txt>
      </ScrollView>
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + space.lg, paddingTop: space.md, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Button
          title={tr('Go to Today')}
          size="xl"
          full
          onPress={() => {
            createFarm(draft);
            router.replace('/');
          }}
        />
      </View>
    </View>
  );
}
