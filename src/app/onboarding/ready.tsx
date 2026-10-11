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
import { addDays, fmt, today } from '@/data/format';
import { createFarm } from '@/data/store';
import { haptic } from '@/lib/haptics';
import { space, useTheme } from '@/theme';

export default function Ready() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { draft } = useDraft();
  const f = draft.flock;
  const breed = breedById(f.breedId);
  const born = addDays(today(), -f.ageDays);
  const upcoming = vaccineSchedule(breed.species).filter((v) => v.ageDay >= f.ageDays);
  const next = upcoming[0];
  const house = draft.houses[f.houseIndex] ?? draft.houses[0];
  const feedKg = f.count * interpolate(breed.feed, f.ageDays);
  const unit = SPECIES_LABEL[breed.species].many;

  const target = breed.marketDay
    ? `Reach ${interpolate(breed.weight, breed.marketDay).toFixed(1)} kg by market day ${breed.marketDay}`
    : breed.lay
      ? `Point of lay around week ${Math.ceil(breed.lay.find(([, r]) => r > 0.04)?.[0] ?? 20)}, peaking near ${fmt.pct(Math.max(...breed.lay.map(([, r]) => r)))}`
      : `Growth curve for ${breed.name}`;

  const items: { icon: IconName; tone: string; title: string; body: string }[] = [
    {
      icon: 'vaccine',
      tone: c.skyText,
      title: `${upcoming.length} vaccinations scheduled`,
      body: next ? `First: ${next.name} on ${fmt.dayShort(addDays(born, next.ageDay))}` : 'All core vaccines already given',
    },
    { icon: 'chart', tone: c.sageText, title: 'Growth targets set', body: target },
    { icon: 'feeder', tone: c.wheatText, title: `About ${fmt.int(feedKg)} kg of feed a day`, body: `For ${fmt.int(f.count)} ${unit} at this age. Rises as they grow.` },
    { icon: 'checkCircle', tone: c.yolkText, title: 'Daily tasks ready', body: 'Feeding, water checks and egg collection, in the order you do them.' },
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
              Your plan is ready
            </Txt>
            <Txt variant="body" tone="secondary" center>
              {fmt.int(f.count)} {breed.name} {unit} in {house?.name ?? 'your house'}, {f.ageDays === 0 ? 'day-old' : f.ageDays < 28 ? `day ${f.ageDays}` : `week ${Math.floor(f.ageDays / 7)}`}.
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
        <Txt variant="caption" tone="secondary" center>
          Vaccination plans are a common starting point. Confirm yours with your vet; you can edit it any time.
        </Txt>
      </ScrollView>
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + space.lg, paddingTop: space.md, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Button
          title="Go to Today"
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
