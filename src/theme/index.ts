import type { TextStyle } from 'react-native';

import { palette, type Palette } from './colors';

export { palette, toneColors, type Palette, type Tone } from './colors';

/** 4-point grid. `gutter` is the screen edge padding used everywhere. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Continuous-corner radii. Always pair with `borderCurve: 'continuous'`. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

/** Touch targets: logging actions are sized for gloved hands. */
export const touch = {
  min: 48,
  log: 56,
  hero: 72,
} as const;

/** Display face: Nunito (rounded, warm). Body: the platform system face. */
export const fonts = {
  display: 'Nunito_800ExtraBold',
  displayBold: 'Nunito_700Bold',
  displaySemi: 'Nunito_600SemiBold',
} as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Type ramp. Screens use `<Txt variant="…">`, never raw font sizes.
 * Hero numerals cap their scaling (they are already 72pt); everything else scales freely.
 */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 72, lineHeight: 78, letterSpacing: -2, fontVariant: tabular },
  kpi: { fontFamily: fonts.display, fontSize: 56, lineHeight: 62, letterSpacing: -1.5, fontVariant: tabular },
  largeTitle: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title2: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  title3: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24 },
  number: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, fontVariant: tabular },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24 },
  callout: { fontSize: 16, lineHeight: 22 },
  subhead: { fontSize: 15, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.3 },
  caption: { fontSize: 13, lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Spring tuned to the brief: ~0.35s response, ~0.8 damping. Nothing linear. */
export const motion = {
  spring: { duration: 350, dampingRatio: 0.8 },
  gentle: { duration: 600, dampingRatio: 0.9 },
  snappy: { duration: 250, dampingRatio: 0.75 },
  fade: 220,
  stagger: 90,
} as const;

/** The app palette. ROOST has one deep-blue theme; this stays a hook so a theme can return later. */
export function useTheme(): Palette {
  return palette;
}
