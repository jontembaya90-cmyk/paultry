import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/button';
import { Chip, ChipRow, Field, Stepper } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { Banner } from '@/components/surface';
import { Txt } from '@/components/text';
import { addDays, fmt, today } from '@/data/format';
import { activeFlocks, ageOf, expectedFeed, expectedWater, feedOn, houseName, standardWeight, waterOn } from '@/data/selectors';
import { logFeed, logLosses, logNote, logTreatment, logWater, logWeight, useFarm } from '@/data/store';
import type { LossCause } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { dismiss } from '@/lib/nav';
import { radius, space, useTheme } from '@/theme';

type Kind = 'feed' | 'water' | 'losses' | 'weight' | 'medication' | 'note';

const META: Record<Kind, { title: string; icon: IconName; lead?: string }> = {
  feed: { title: 'Log feed', icon: 'feeder' },
  water: { title: 'Log water', icon: 'drinker', lead: 'Read the meter or count the drinkers you filled.' },
  losses: { title: 'Record losses', icon: 'hen', lead: 'Every bird counts. Recording the cause helps spot problems early.' },
  weight: { title: 'Log weight', icon: 'weight', lead: 'Weigh a sample of birds from different parts of the house.' },
  medication: { title: 'Log medication', icon: 'medication', lead: 'ROOST will block sales from this house until the withdrawal ends.' },
  note: { title: 'Note', icon: 'note' },
};

const CAUSES: { key: LossCause; label: string; icon: IconName }[] = [
  { key: 'disease', label: 'Illness', icon: 'stethoscope' },
  { key: 'predator', label: 'Predator', icon: 'warning' },
  { key: 'heat', label: 'Heat', icon: 'heat' },
  { key: 'culled', label: 'Culled', icon: 'hen' },
  { key: 'unknown', label: 'Not sure', icon: 'info' },
];

export default function LogForm() {
  const c = useTheme();
  const farm = useFarm();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind: Kind; flock?: string }>();
  const kind: Kind = (params.kind in META ? params.kind : 'note') as Kind;
  const meta = META[kind];
  const flocks = activeFlocks(farm);
  const [flockId, setFlockId] = useState(params.flock ?? flocks[0]?.id ?? '');
  const flock = flocks.find((f) => f.id === flockId);
  const t = today();

  // Feed and water start at what is still expected today, rounded to 5, so a normal day is one tap.
  const suggested = (id: string) => {
    const f = flocks.find((x) => x.id === id);
    if (!f) return 1;
    if (kind === 'feed') return Math.max(0, Math.round((expectedFeed(farm, f, t) - feedOn(farm, f.id, t)) / 5) * 5);
    if (kind === 'water') return Math.max(0, Math.round((expectedWater(farm, f, t) - waterOn(farm, f.id, t)) / 5) * 5);
    return 1;
  };
  const [amount, setAmount] = useState(() => suggested(flockId));
  const pickFlock = (id: string) => {
    setFlockId(id);
    if (kind === 'feed' || kind === 'water') setAmount(suggested(id));
  };
  const [cause, setCause] = useState<LossCause | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [avg, setAvg] = useState('');
  const [sample, setSample] = useState(50);
  const [days, setDays] = useState(5);
  const [withdrawal, setWithdrawal] = useState(7);

  const avgKg = Number(avg.replace(',', '.'));
  const valid =
    kind === 'note' ? text.trim().length > 0 : !flock ? false
      : kind === 'losses' ? amount > 0 && !!cause
        : kind === 'weight' ? avgKg > 0 && avgKg < 30
          : kind === 'medication' ? text.trim().length > 1
            : amount > 0;

  const save = () => {
    if (!valid) return;
    switch (kind) {
      case 'feed': logFeed(flockId, amount); break;
      case 'water': logWater(flockId, amount); break;
      case 'losses': logLosses(flockId, amount, cause!, text.trim() || undefined); break;
      case 'weight': logWeight(flockId, avgKg, sample); break;
      case 'medication': logTreatment(flockId, text.trim(), reason.trim() || 'Not given', days, withdrawal); break;
      case 'note': logNote(text.trim(), flockId || undefined); break;
    }
    haptic.success();
    dismiss();
  };

  const saveLabel =
    kind === 'losses' ? `Record ${amount} ${amount === 1 ? 'loss' : 'losses'}` : kind === 'feed' ? `Save ${fmt.int(amount)} kg` : kind === 'water' ? `Save ${fmt.int(amount)} L` : 'Save';

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton icon="close" label="Close without saving" onPress={() => dismiss()} />
        <Icon name={meta.icon} size={24} color={c.inkSecondary} />
        <Txt variant="title2" accessibilityRole="header" style={{ flex: 1 }}>
          {meta.title}
        </Txt>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.xxl }}>
        {meta.lead && (
          <Txt variant="body" tone="secondary">
            {meta.lead}
          </Txt>
        )}

        {flocks.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              {kind === 'note' ? 'ABOUT (OPTIONAL)' : 'HOUSE'}
            </Txt>
            <ChipRow>
              {flocks.map((f) => (
                <Chip key={f.id} label={houseName(farm, f)} selected={flockId === f.id} onPress={() => pickFlock(kind === 'note' && flockId === f.id ? '' : f.id)} />
              ))}
            </ChipRow>
          </View>
        )}

        {(kind === 'feed' || kind === 'water') && flock && (
          <View style={{ gap: space.md }}>
            <Stepper label={kind === 'feed' ? 'Feed given' : 'Water used'} value={amount} step={5} min={0} max={100000} onChange={setAmount} unit={kind === 'feed' ? 'kilograms' : 'litres'} />
            <Txt variant="subhead" tone="secondary" center>
              Expected today: about {fmt.int(kind === 'feed' ? expectedFeed(farm, flock, t) : expectedWater(farm, flock, t))} {kind === 'feed' ? 'kg' : 'L'} for {houseName(farm, flock)}
            </Txt>
          </View>
        )}

        {kind === 'losses' && (
          <>
            <Stepper label="Birds lost" value={amount} min={1} max={10000} onChange={setAmount} unit={amount === 1 ? 'bird' : 'birds'} />
            <View style={{ gap: space.sm }}>
              <Txt variant="label" tone="secondary">
                MOST LIKELY CAUSE
              </Txt>
              <ChipRow>
                {CAUSES.map((x) => (
                  <Chip key={x.key} label={x.label} icon={x.icon} size="lg" selected={cause === x.key} onPress={() => setCause(x.key)} />
                ))}
              </ChipRow>
            </View>
            <Field label="Anything you noticed? (optional)" value={text} onChangeText={setText} placeholder="Where they were found, signs before…" multiline style={{ minHeight: 88, paddingTop: space.md, textAlignVertical: 'top' }} />
          </>
        )}

        {kind === 'weight' && flock && (
          <>
            <Field label="Average weight (kg)" big value={avg} onChangeText={setAvg} keyboardType="decimal-pad" placeholder={standardWeight(flock).toFixed(2)} />
            <Txt variant="subhead" tone="secondary">
              Breed standard at {ageOf(flock).label.toLowerCase()}: {standardWeight(flock).toFixed(2)} kg
              {avgKg > 0 && ` · you are ${avgKg >= standardWeight(flock) ? 'above' : 'below'} by ${Math.abs((avgKg / standardWeight(flock) - 1) * 100).toFixed(1)}%`}
            </Txt>
            <Stepper label="Birds weighed" value={sample} step={5} min={1} max={500} onChange={setSample} unit="birds in sample" />
          </>
        )}

        {kind === 'medication' && flock && (
          <>
            <Field label="Medicine" value={text} onChangeText={setText} placeholder="e.g. Oxytetracycline 20%" autoCapitalize="sentences" />
            <Field label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Sneezing in 12 birds" autoCapitalize="sentences" />
            <Stepper label="Treatment days" value={days} min={1} max={60} onChange={setDays} unit={days === 1 ? 'day of treatment' : 'days of treatment'} />
            <Stepper label="Withdrawal days" value={withdrawal} min={0} max={60} onChange={setWithdrawal} unit="withdrawal days (see the label)" />
            <Banner
              tone="barn"
              icon="medication"
              title={`No sales from ${houseName(farm, flock)} until ${fmt.monthDay(addDays(t, days + withdrawal))}`}
              body="Sales from this house will be blocked until then, so nobody sells by mistake."
            />
          </>
        )}

        {kind === 'note' && (
          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: c.skySoft, padding: space.md, borderRadius: radius.md }}>
              <Icon name="note" size={20} color={c.skyText} />
              <Txt variant="subhead" style={{ flex: 1 }}>
                Tap the microphone on your keyboard to speak your note.
              </Txt>
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              placeholder="What happened?"
              placeholderTextColor={c.inkTertiary}
              accessibilityLabel="Note"
              style={{ minHeight: 160, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline, padding: space.lg, fontSize: 18, color: c.ink, textAlignVertical: 'top' }}
            />
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: insets.bottom + space.lg, borderTopWidth: 1, borderTopColor: c.hairline }}>
        <Button title={saveLabel} size="xl" full disabled={!valid} variant={kind === 'losses' ? 'danger' : 'primary'} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}
