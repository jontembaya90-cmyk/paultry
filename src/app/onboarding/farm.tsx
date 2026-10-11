import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { OnboardingFrame } from '@/components/onboarding-frame';
import { useDraft } from '@/components/onboarding-draft';
import { Txt } from '@/components/text';
import type { FarmType } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';

const TYPES: { key: FarmType; label: string; hint: string; icon: IconName }[] = [
  { key: 'layers', label: 'Layers', hint: 'Hens for eggs', icon: 'egg' },
  { key: 'broilers', label: 'Broilers', hint: 'Meat birds', icon: 'hen' },
  { key: 'indigenous', label: 'Indigenous', hint: 'Free-range, dual-purpose', icon: 'grass' },
  { key: 'ducks', label: 'Ducks', hint: 'Meat or eggs', icon: 'duck' },
  { key: 'turkeys', label: 'Turkeys', hint: 'Growers and breeders', icon: 'turkey' },
  { key: 'quail', label: 'Quail', hint: 'Small birds, many eggs', icon: 'quail' },
  { key: 'hatchery', label: 'Hatchery', hint: 'Incubating eggs', icon: 'incubator' },
];

export default function FarmStep() {
  const c = useTheme();
  const { draft, update } = useDraft();
  const toggle = (k: FarmType) => {
    const on = draft.farmTypes.includes(k);
    if (on) haptic.toggleOff();
    else haptic.toggleOn();
    update({ farmTypes: on ? draft.farmTypes.filter((x) => x !== k) : [...draft.farmTypes, k] });
  };

  return (
    <OnboardingFrame
      step={1}
      title="What do you keep?"
      subtitle="Pick everything that applies. You can add more later."
      footer={
        <Button
          title={draft.farmTypes.length ? 'Continue' : 'Pick at least one'}
          size="xl"
          full
          disabled={!draft.farmTypes.length}
          onPress={() => router.push('/onboarding/houses')}
        />
      }>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {TYPES.map((t) => {
          const on = draft.farmTypes.includes(t.key);
          return (
            <Pressable
              key={t.key}
              onPress={() => toggle(t.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${t.label}, ${t.hint}`}
              style={({ pressed }) => ({
                flexBasis: '47%',
                flexGrow: 1,
                minHeight: 128,
                padding: space.lg,
                gap: space.sm,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                backgroundColor: on ? c.yolkSoft : c.surface,
                borderWidth: 2,
                borderColor: on ? c.yolk : c.hairline,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Icon name={t.icon} size={34} color={on ? c.yolkText : c.ink} />
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: on ? 0 : 2,
                    borderColor: c.inkTertiary,
                    backgroundColor: on ? c.yolk : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {on && <Icon name="check" size={18} color={c.onYolk} />}
                </View>
              </View>
              <Txt variant="title3">{t.label}</Txt>
              <Txt variant="caption" tone="secondary">
                {t.hint}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: space.lg }}>
        <Field label="Farm name" placeholder="Sunrise Poultry Farm" value={draft.farmName} onChangeText={(farmName) => update({ farmName })} autoCapitalize="words" returnKeyType="next" />
        <Field label="Your first name" placeholder="Amina" value={draft.ownerName} onChangeText={(ownerName) => update({ ownerName })} autoCapitalize="words" autoComplete="given-name" />
      </View>
    </OnboardingFrame>
  );
}
