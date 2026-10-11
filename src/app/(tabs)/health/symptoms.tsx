import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Chip, ChipRow, Progress } from '@/components/controls';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Banner, Card, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { breedById } from '@/data/breeds';
import { addDays, fmt, today } from '@/data/format';
import { activeFlocks, ageOf, aliveOn, expectedFeed, expectedWater, feedOn, houseName, lossesFor, waterOn } from '@/data/selectors';
import { rankCauses, SYMPTOMS } from '@/data/symptoms';
import { useFarm } from '@/data/store';
import { pickFlockPhoto } from '@/lib/photos';
import { radius, space, useTheme } from '@/theme';

const GROUPS = ['Breathing', 'Droppings', 'Behaviour', 'Eggs', 'Body'] as const;

export default function SymptomCheck() {
  const c = useTheme();
  const farm = useFarm();
  const flocks = activeFlocks(farm);
  const [flockId, setFlockId] = useState(flocks[0]?.id ?? '');
  const [picked, setPicked] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string>();
  const flock = flocks.find((f) => f.id === flockId);
  const causes = rankCauses(picked);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const share = () => {
    if (!flock) return;
    const t = today();
    const breed = breedById(flock.breedId);
    const week = Array.from({ length: 7 }, (_, i) => addDays(t, -i));
    const recentLosses = farm.losses.filter((l) => l.flockId === flock.id && week.includes(l.day));
    const given = farm.vaccinations.filter((v) => v.flockId === flock.id && v.doneOn).slice(-4);
    const tr = farm.treatments.filter((x) => x.flockId === flock.id).slice(-2);
    const lines = [
      `Health report: ${farm.farmName}`,
      `${fmt.dayLong(t)}`,
      '',
      `${houseName(farm, flock)}: ${fmt.int(aliveOn(farm, flock))} ${breed.name}, ${ageOf(flock).label.toLowerCase()}`,
      `Losses: ${recentLosses.reduce((n, l) => n + l.count, 0)} in the last 7 days (${lossesFor(farm, flock.id)} since placement)`,
      `Feed today: ${fmt.int(feedOn(farm, flock.id, t))} of ~${fmt.int(expectedFeed(farm, flock, t))} kg expected`,
      `Water today: ${fmt.int(waterOn(farm, flock.id, t))} of ~${fmt.int(expectedWater(farm, flock, t))} L expected`,
      '',
      `Signs seen: ${picked.map((p) => SYMPTOMS.find((s) => s.id === p)?.label.toLowerCase()).join(', ') || 'none selected'}`,
      causes.length ? `Possible causes to rule out: ${causes.map((x) => x.name).join(', ')}` : '',
      given.length ? `Recent vaccines: ${given.map((v) => `${v.name} (${fmt.monthDay(v.doneOn!)})`).join(', ')}` : '',
      tr.length ? `Treatments: ${tr.map((x) => `${x.drug} from ${fmt.monthDay(x.start)}`).join(', ')}` : '',
      photo ? 'Photo taken; sending separately.' : '',
      '',
      'Sent from ROOST. This is not a diagnosis.',
    ];
    Share.share({ message: lines.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n') }).catch(() => {});
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Banner tone="yolk" icon="info" title="Not a diagnosis. Contact your vet." body="This helps you describe what you see and spot what to rule out. Only a vet can diagnose." />

      {flocks.length > 1 && (
        <View style={{ gap: space.sm }}>
          <Txt variant="label" tone="secondary">
            WHICH HOUSE?
          </Txt>
          <ChipRow>
            {flocks.map((f) => (
              <Chip key={f.id} label={houseName(farm, f)} selected={flockId === f.id} onPress={() => setFlockId(f.id)} />
            ))}
          </ChipRow>
        </View>
      )}

      {GROUPS.map((g) => (
        <View key={g} style={{ gap: space.sm }}>
          <Txt variant="label" tone="secondary">
            {g.toUpperCase()}
          </Txt>
          <ChipRow>
            {SYMPTOMS.filter((s) => s.group === g).map((s) => (
              <Chip key={s.id} label={s.label} selected={picked.includes(s.id)} onPress={() => toggle(s.id)} />
            ))}
          </ChipRow>
        </View>
      ))}

      <View style={{ gap: space.sm }}>
        <Txt variant="label" tone="secondary">
          PHOTO OF DROPPINGS OR A BIRD (OPTIONAL)
        </Txt>
        {photo ? (
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Image source={{ uri: photo }} style={{ width: 96, height: 72, borderRadius: radius.sm }} contentFit="cover" accessibilityLabel="Attached photo" />
            <Button title="Remove" variant="ghost" size="md" onPress={() => setPhoto(undefined)} />
          </View>
        ) : (
          <Button
            title="Take a photo"
            icon="camera"
            variant="secondary"
            onPress={async () => {
              const uri = await pickFlockPhoto('camera');
              if (uri) setPhoto(uri);
            }}
          />
        )}
      </View>

      <Animated.View layout={LinearTransition.springify().damping(18)} style={{ gap: space.md }}>
        <SectionHeader title="Possible causes" />
        {causes.length === 0 ? (
          <Card>
            <Txt variant="body" tone="secondary">
              Pick the signs you see. The more you pick, the clearer the list.
            </Txt>
          </Card>
        ) : (
          causes.map((cause, i) => (
            <Animated.View key={cause.name} entering={FadeIn.delay(i * 60)}>
              <Card style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                  <Txt variant="title3" style={{ flex: 1 }}>
                    {cause.name}
                  </Txt>
                  <Badge
                    tone={cause.score > 0.6 ? 'barn' : cause.score > 0.35 ? 'yolk' : 'neutral'}
                    label={cause.score > 0.6 ? 'Strong match' : cause.score > 0.35 ? 'Possible' : 'Less likely'}
                    size="sm"
                  />
                </View>
                <Progress value={cause.score} color={cause.score > 0.6 ? c.barn : cause.score > 0.35 ? c.yolk : c.inkTertiary} height={6} />
                <Txt variant="subhead" tone="secondary">
                  Matches: {cause.matched.join(', ').toLowerCase()}
                </Txt>
                <Txt variant="callout">{cause.now}</Txt>
                {cause.urgent && <Badge tone="barn" icon="warning" label="Call your vet today" size="sm" />}
              </Card>
            </Animated.View>
          ))
        )}
      </Animated.View>

      <Button title="Share with vet" icon="share" size="xl" full disabled={!flock} onPress={share} accessibilityHint="Creates a health report with recent losses, feed, water, vaccines and the signs you picked" />
    </ScrollView>
  );
}
