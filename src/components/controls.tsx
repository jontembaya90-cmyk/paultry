import { Pressable, ScrollView, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/text';
import { haptic } from '@/lib/haptics';
import { fonts, radius, space, touch, useTheme } from '@/theme';

/** Selectable chip. 48dp tall so it is easy to hit; selected state uses fill + check, not colour alone. */
export function Chip({
  label,
  icon,
  selected,
  onPress,
  disabled,
  size = 'md',
}: {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptic.tick();
        onPress?.();
      }}
      style={({ pressed }) => ({
        minHeight: size === 'lg' ? touch.log : touch.min,
        paddingHorizontal: space.lg,
        borderRadius: radius.full,
        backgroundColor: selected ? c.ink : c.surface,
        borderWidth: 1,
        borderColor: selected ? c.ink : c.hairline,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}>
      {selected ? <Icon name="check" size={18} color={c.bg} /> : icon ? <Icon name={icon} size={18} color={c.inkSecondary} /> : null}
      <Txt variant="headline" color={selected ? c.bg : c.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ChipRow({ children, scroll, style }: { children: React.ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.gutter }} style={[{ marginHorizontal: -space.gutter, flexGrow: 0 }, style]}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }, style]}>{children}</View>;
}

/** Segmented control with equal-width options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, borderCurve: 'continuous', padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (!on) haptic.tick();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: touch.min,
              borderRadius: radius.sm,
              borderCurve: 'continuous',
              backgroundColor: on ? c.surface : 'transparent',
              boxShadow: on ? c.shadowCard : undefined,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: space.xs,
              paddingHorizontal: space.xs,
            }}>
            {o.icon && <Icon name={o.icon} size={18} color={on ? c.ink : c.inkSecondary} />}
            <Txt variant="headline" color={on ? c.ink : c.inkSecondary} numberOfLines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Big − value + stepper for counts. Buttons are 56dp; long values never truncate. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 1_000_000,
  label,
  unit,
  format = (n: number) => n.toLocaleString(),
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  format?: (n: number) => string;
}) {
  const c = useTheme();
  const btn = (icon: IconName, delta: number, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => {
        const next = Math.min(max, Math.max(min, Math.round((value + delta) * 100) / 100));
        if (next !== value) haptic.tick();
        onChange(next);
      }}
      style={({ pressed }) => ({
        width: touch.log,
        height: touch.log,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: pressed ? c.straw : c.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      })}>
      <Icon name={icon} size={26} color={c.ink} />
    </Pressable>
  );
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${format(value)}${unit ? ` ${unit}` : ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {btn('remove', -step, `Decrease ${label}`)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Txt variant="number">{format(value)}</Txt>
        {unit && (
          <Txt variant="caption" tone="secondary">
            {unit}
          </Txt>
        )}
      </View>
      {btn('add', step, `Increase ${label}`)}
    </View>
  );
}

/** A large numeric or text field. */
export function Field({
  label,
  big,
  style,
  ...props
}: TextInputProps & { label: string; big?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Txt variant="label" tone="secondary">
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.inkTertiary}
        selectionColor={c.yolk}
        cursorColor={c.ink}
        style={[
          {
            minHeight: big ? touch.hero : touch.log,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.hairline,
            paddingHorizontal: space.lg,
            color: c.ink,
            fontSize: big ? 28 : 17,
            fontFamily: big ? fonts.display : undefined,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const HUES = ['#B5412E', '#6E8B5E', '#4A90C2', '#B98A4A', '#8A6BA8', '#C2724A'];

export function Avatar({ name, id, size = 32 }: { name: string; id: string; size?: number }) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const initials = (name || 'You').replace('Dr. ', '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: HUES[h % HUES.length], alignItems: 'center', justifyContent: 'center' }}>
      <Txt variant="label" color="#FFFFFF" maxFontSizeMultiplier={1} style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}>
        {initials}
      </Txt>
    </View>
  );
}

/** Horizontal progress bar with a target tick. */
export function Progress({ value, color, target, height = 10 }: { value: number; color: string; target?: number; height?: number }) {
  const c = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
      {target !== undefined && (
        <View style={{ position: 'absolute', start: `${Math.min(1, target) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: c.ink, opacity: 0.5 }} />
      )}
    </View>
  );
}
