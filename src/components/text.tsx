import { Text, type TextProps } from 'react-native';

import { type, useTheme, type TypeVariant } from '@/theme';

type InkTone = 'primary' | 'secondary' | 'tertiary';

/**
 * The only text component screens use. Hero numerals cap their scaling (they are already
 * 56–72pt); every other style scales with the system font size, all the way up.
 */
export function Txt({
  variant = 'body',
  tone = 'primary',
  color,
  center,
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: InkTone; color?: string; center?: boolean }) {
  const c = useTheme();
  const ink = color ?? (tone === 'secondary' ? c.inkSecondary : tone === 'tertiary' ? c.inkTertiary : c.ink);
  const big = variant === 'hero' || variant === 'kpi';
  return (
    <Text
      maxFontSizeMultiplier={big ? 1.25 : variant === 'largeTitle' || variant === 'title' ? 1.6 : undefined}
      style={[type[variant], { color: ink }, center && { textAlign: 'center' }, style]}
      {...props}
    />
  );
}
