/**
 * ROOST colour tokens: one deep-blue theme for every phone.
 *
 * Brand hues (Yolk, Barn, Sage, Sky, Wheat) sit on a deep navy ground. Each hue has four
 * roles so text always meets WCAG AA (4.5:1 or better on bg, surface and surfaceAlt):
 *   - `x`      the fill colour (rings, bars, buttons)
 *   - `onX`    text/icons drawn on top of the fill
 *   - `xText`  the hue lightened enough to be used as text on `bg`/`surface`
 *   - `xSoft`  a quiet tint for banners and badges (warm hues use dark amber, not a
 *              blend: yellow over blue turns olive)
 *
 * These are plain hex strings so they can be passed into Reanimated and SVG.
 */

const navy = {
  scheme: 'dark' as 'light' | 'dark',
  bg: '#0B1E3F', // Deep blue
  surface: '#132A52',
  surfaceAlt: '#1C3664',
  straw: '#2A4675',
  ink: '#EEF3FB',
  inkSecondary: '#B7C5DC',
  inkTertiary: '#94A6C4',
  hairline: 'rgba(238, 243, 251, 0.12)',
  track: 'rgba(238, 243, 251, 0.10)',
  scrim: 'rgba(3, 9, 22, 0.6)',

  yolk: '#F5B700',
  onYolk: '#1A1507',
  yolkText: '#FFCB45',
  yolkSoft: '#3D3216',

  barn: '#B5412E',
  onBarn: '#FFFFFF',
  barnText: '#FF9F8A',
  barnSoft: '#332F4B',

  sage: '#7FA56B',
  onSage: '#0E1A0A',
  sageText: '#A9D193',
  sageSoft: '#294357',

  sky: '#4FB3E8',
  onSky: '#06182A',
  skyText: '#8FD2F7',
  skySoft: '#1F4570',

  wheat: '#D0A060',
  onWheat: '#1B1408',
  wheatText: '#EBC88F',
  wheatSoft: '#3A3020',

  shadowCard: '0 0 0 1px rgba(238, 243, 251, 0.06), 0 6px 20px rgba(2, 8, 20, 0.35)',
  shadowRaised: '0 8px 28px rgba(2, 8, 20, 0.55)',
};

export type Palette = typeof navy;

export const palette: Palette = navy;

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
