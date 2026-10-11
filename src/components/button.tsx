import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/text';
import { haptic } from '@/lib/haptics';
import { radius, space, toneColors, touch, useTheme, type Tone } from '@/theme';

type Variant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'xl';

const heights: Record<Size, number> = { md: touch.min, lg: touch.log, xl: touch.hero };

/**
 * Buttons. `primary` is Yolk and appears once per screen. Logging actions use `lg` (56dp)
 * or `xl` (72dp) so they work with gloves on.
 */
export function Button({
  title,
  icon,
  variant = 'primary',
  size = 'lg',
  tone = 'yolk',
  loading,
  disabled,
  full,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  children,
}: {
  title?: string;
  icon?: IconName;
  variant?: Variant;
  size?: Size;
  /** Tint for `tinted` buttons. */
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const c = useTheme();
  const t = toneColors(c, tone);
  const look = {
    primary: { bg: c.yolk, fg: c.onYolk, border: 'transparent' },
    secondary: { bg: c.surfaceAlt, fg: c.ink, border: 'transparent' },
    tinted: { bg: t.soft, fg: t.text, border: 'transparent' },
    ghost: { bg: 'transparent', fg: c.ink, border: c.hairline },
    danger: { bg: c.barn, fg: c.onBarn, border: 'transparent' },
  }[variant];
  const off = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        haptic.tick();
        onPress?.();
      }}
      android_ripple={{ color: c.track, borderless: false }}
      style={({ pressed }) => [
        {
          minHeight: heights[size],
          paddingHorizontal: size === 'md' ? space.lg : space.xl,
          borderRadius: size === 'xl' ? radius.lg : radius.md,
          borderCurve: 'continuous',
          backgroundColor: look.bg,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: look.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: disabled ? 0.45 : 1,
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        children ?? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            {icon && <Icon name={icon} size={size === 'xl' ? 28 : 22} color={look.fg} />}
            {title && (
              <Txt variant={size === 'xl' ? 'title3' : 'headline'} color={look.fg} numberOfLines={2} center>
                {title}
              </Txt>
            )}
          </View>
        )
      )}
    </Pressable>
  );
}

/** Round icon-only button. Always carries an accessibility label. */
export function IconButton({
  icon,
  label,
  onPress,
  size = touch.min,
  variant = 'secondary',
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  variant?: 'secondary' | 'ghost' | 'primary';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const bg = variant === 'primary' ? c.yolk : variant === 'secondary' ? c.surfaceAlt : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tick();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <Icon name={icon} size={Math.round(size * 0.46)} color={variant === 'primary' ? c.onYolk : c.ink} />
    </Pressable>
  );
}
