/**
 * ROOST colour tokens.
 *
 * Brand hues are fixed by the brief (Yolk, Barn, Sage, Straw, Feather, Coop Night, Ink, Sky).
 * Each hue has four roles so text always meets WCAG AA:
 *   - `x`      the fill colour (rings, bars, buttons)
 *   - `onX`    text/icons drawn on top of the fill (onSage/onSky/onWheat: icons only, 3:1+)
 *   - `xText`  the hue darkened/lightened enough to be used as text on `bg`/`surface`
 *   - `xSoft`  a quiet tint for banners and badges
 *
 * "Dawn Mode" is the dark palette: warm, low-glare, never pure white text.
 * These are plain hex strings so they can be passed into Reanimated and SVG.
 */

const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#FBF8F2', // Feather
  surface: '#FFFDF8',
  surfaceAlt: '#F4EDDF',
  straw: '#E9DCC0',
  ink: '#1C1C1E',
  inkSecondary: '#5C574E',
  inkTertiary: '#716A5E',
  hairline: 'rgba(60, 45, 20, 0.12)',
  track: 'rgba(60, 45, 20, 0.08)',
  scrim: 'rgba(20, 22, 26, 0.45)',

  yolk: '#F5B700',
  onYolk: '#1C1C1E',
  yolkText: '#8A6100',
  yolkSoft: '#FDF0C7',

  barn: '#B5412E',
  onBarn: '#FFFFFF',
  barnText: '#A33A28',
  barnSoft: '#F8E1DB',

  sage: '#6E8B5E',
  onSage: '#FFFFFF',
  sageText: '#4A6A3C',
  sageSoft: '#E4ECDD',

  sky: '#4A90C2',
  onSky: '#FFFFFF',
  skyText: '#2B6A98',
  skySoft: '#DDEBF5',

  wheat: '#B98A4A',
  onWheat: '#FFFFFF',
  wheatText: '#7C5824',
  wheatSoft: '#F2E6D1',

  shadowCard: '0 1px 2px rgba(80, 55, 20, 0.06), 0 6px 20px rgba(80, 55, 20, 0.06)',
  shadowRaised: '0 4px 10px rgba(80, 55, 20, 0.10), 0 12px 32px rgba(80, 55, 20, 0.10)',
};

export type Palette = typeof light;

const dawn: Palette = {
  scheme: 'dark',
  bg: '#14161A', // Coop Night
  surface: '#1E1F21',
  surfaceAlt: '#29272A',
  straw: '#3A3328',
  ink: '#F3ECDF',
  inkSecondary: '#BDB3A2',
  inkTertiary: '#9D9483',
  hairline: 'rgba(243, 236, 223, 0.10)',
  track: 'rgba(243, 236, 223, 0.08)',
  scrim: 'rgba(0, 0, 0, 0.6)',

  yolk: '#E9AE0B',
  onYolk: '#1A1507',
  yolkText: '#F2C443',
  yolkSoft: '#382D10',

  barn: '#B5412E',
  onBarn: '#FFFFFF',
  barnText: '#F0907A',
  barnSoft: '#3A1D18',

  sage: '#809F6E',
  onSage: '#10170C',
  sageText: '#A9C896',
  sageSoft: '#212C1D',

  sky: '#5AA0D2',
  onSky: '#0B1822',
  skyText: '#92C3E8',
  skySoft: '#16283A',

  wheat: '#C99B58',
  onWheat: '#1B1408',
  wheatText: '#E2BC83',
  wheatSoft: '#2F2619',

  shadowCard: '0 0 0 1px rgba(243, 236, 223, 0.05)',
  shadowRaised: '0 8px 28px rgba(0, 0, 0, 0.45)',
};

export const palettes = { light, dark: dawn } as const;

/** The semantic tone used by badges, banners and alerts. Never shown without an icon + label. */
export type Tone = 'yolk' | 'barn' | 'sage' | 'sky' | 'wheat' | 'neutral';

export function toneColors(c: Palette, tone: Tone) {
  switch (tone) {
    case 'yolk':
      return { fill: c.yolk, on: c.onYolk, text: c.yolkText, soft: c.yolkSoft };
    case 'barn':
      return { fill: c.barn, on: c.onBarn, text: c.barnText, soft: c.barnSoft };
    case 'sage':
      return { fill: c.sage, on: c.onSage, text: c.sageText, soft: c.sageSoft };
    case 'sky':
      return { fill: c.sky, on: c.onSky, text: c.skyText, soft: c.skySoft };
    case 'wheat':
      return { fill: c.wheat, on: c.onWheat, text: c.wheatText, soft: c.wheatSoft };
    default:
      return { fill: c.inkSecondary, on: c.surface, text: c.inkSecondary, soft: c.surfaceAlt };
  }
}
