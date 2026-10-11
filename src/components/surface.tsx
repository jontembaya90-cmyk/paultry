import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/text';
import { radius, space, toneColors, useTheme, type Tone } from '@/theme';

/** A calm, solid content surface. Glass is for chrome only; content always sits on this. */
export function Card({
  children,
  style,
  padded = true,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const c = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: padded ? space.lg : 0,
    boxShadow: c.shadowCard,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: c.track }}
      style={({ pressed }) => [base, { overflow: 'hidden', transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}>
      {children}
    </Pressable>
  );
}

/** Section heading with an optional trailing action. */
export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingTop: space.sm }, style]}>
      <Txt variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Txt>
      {action && onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={12}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs }}>
          <Txt variant="headline" color={c.yolkText}>
            {action}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

/** Status badge: colour + icon + words. Never colour alone. */
export function Badge({ tone, icon, label, size = 'md', style }: { tone: Tone; icon?: IconName; label: string; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  const t = toneColors(c, tone);
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: space.xs,
          backgroundColor: t.soft,
          borderRadius: radius.full,
          paddingHorizontal: size === 'sm' ? space.sm : space.md,
          paddingVertical: size === 'sm' ? 2 : space.xs,
        },
        style,
      ]}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} color={t.text} />}
      <Txt variant="label" color={t.text}>
        {label}
      </Txt>
    </View>
  );
}

/** A full-width tinted banner: withdrawal, quarantine, urgent states. */
export function Banner({
  tone,
  icon,
  title,
  body,
  children,
  strong,
}: {
  tone: Tone;
  icon: IconName;
  title: string;
  body?: string;
  children?: ReactNode;
  strong?: boolean;
}) {
  const c = useTheme();
  const t = toneColors(c, tone);
  const bg = strong ? t.fill : t.soft;
  const fg = strong ? t.on : t.text;
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: bg, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
        <Icon name={icon} size={24} color={fg} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Txt variant="headline" color={fg}>
            {title}
          </Txt>
          {body && (
            <Txt variant="subhead" color={strong ? fg : c.ink}>
              {body}
            </Txt>
          )}
        </View>
      </View>
      {children}
    </View>
  );
}

/** A tappable list row with a 56dp minimum height. */
export function Row({
  icon,
  iconTone = 'neutral',
  title,
  subtitle,
  trailing,
  onPress,
  chevron = !!onPress,
  accessibilityLabel,
}: {
  icon?: IconName;
  iconTone?: Tone;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const t = toneColors(c, iconTone);
  const content = (
    <>
      {icon && (
        <View style={{ width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous', backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} color={t.text} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{title}</Txt>
        {subtitle && (
          <Txt variant="subhead" tone="secondary">
            {subtitle}
          </Txt>
        )}
      </View>
      {trailing}
      {chevron && <Icon name="chevronRight" size={20} color={c.inkTertiary} />}
    </>
  );
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm };
  if (!onPress) return <View style={style} accessible accessibilityLabel={accessibilityLabel}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const c = useTheme();
  return <View style={{ height: 1, backgroundColor: c.hairline, marginStart: inset }} />;
}
