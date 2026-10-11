import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * Warm, flat illustrations with a soft ground shadow. Used only for onboarding and empty
 * states, never on data screens. Drawn on the same geometry as the custom icon set so the
 * illustrated hen and the hen icon are recognisably the same bird.
 */

const BROWN = '#B4693E';
const BROWN_DARK = '#8F4E2B';
const CREAM = '#F3E3C8';
const COMB = '#C9483A';
const BEAK = '#F5B700';
const LEG = '#D9A21A';
const INK = '#2A221C';

export type IllustrationName = 'hen' | 'chick' | 'nest' | 'hens' | 'sunrise';

export function Illustration({ name, size = 160 }: { name: IllustrationName; size?: number }) {
  const sun = `sun${useId().replace(/:/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={sun} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD66B" />
          <Stop offset="1" stopColor="#F5B700" />
        </LinearGradient>
      </Defs>
      {name === 'sunrise' && (
        <>
          <Circle cx={12} cy={13} r={9} fill={`url(#${sun})`} opacity={0.35} />
          <Circle cx={12} cy={13} r={6.4} fill={`url(#${sun})`} opacity={0.5} />
          <G transform="translate(1.2 0.6) scale(0.9)">
            <Hen />
          </G>
        </>
      )}
      {name === 'hen' && <Hen />}
      {name === 'chick' && (
        <G transform="translate(3 4) scale(0.75)">
          <Chick />
        </G>
      )}
      {name === 'hens' && (
        <>
          <G transform="translate(-1.5 4.5) scale(0.62)">
            <Hen />
          </G>
          <G transform="translate(9.5 2.5) scale(0.72) translate(24 0) scale(-1 1)">
            <Hen />
          </G>
          <G transform="translate(9 14) scale(0.36)">
            <Chick />
          </G>
        </>
      )}
      {name === 'nest' && (
        <>
          <Ellipse cx={12} cy={20.4} rx={8.6} ry={1} fill={INK} opacity={0.1} />
          <Ellipse cx={9} cy={14.6} rx={2.6} ry={3.3} fill={CREAM} />
          <Ellipse cx={14.6} cy={14.2} rx={2.6} ry={3.3} fill="#E8C9A0" />
          <Ellipse cx={12} cy={15.4} rx={2.6} ry={3.3} fill="#F7EEDD" />
          <Path d="M3.6 15.4c0 3 3.8 4.8 8.4 4.8s8.4-1.8 8.4-4.8c-2 1-4.9 1.6-8.4 1.6s-6.4-.6-8.4-1.6z" fill="#C79A4E" />
          <Path d="M5 17.2c2 .8 4.3 1.1 7 1.1s5-.3 7-1.1M6.4 18.8c1.6.5 3.5.7 5.6.7s4-.2 5.6-.7" stroke="#A47A35" strokeWidth={0.45} strokeLinecap="round" fill="none" />
        </>
      )}
    </Svg>
  );
}

function Hen() {
  return (
    <>
      <Ellipse cx={11.6} cy={21.2} rx={6.4} ry={0.85} fill={INK} opacity={0.12} />
      <Path d="M10.6 19.2v2M13.6 19.2v2" stroke={LEG} strokeWidth={0.8} strokeLinecap="round" />
      <Path d="M9.6 21.2h2M12.6 21.2h2" stroke={LEG} strokeWidth={0.7} strokeLinecap="round" />
      <Path d="M8.6 10.6L4.2 5.4c-1.5 3.2-1.5 6.6 0 9.6z" fill={BROWN_DARK} />
      <Path d="M17.2 8.6c-1.2 1.6-3.6 2.4-6.6 2-2.6-.3-6.4.4-6.4 4.2.8 2.8 3.9 4.9 7.6 4.9 3.9 0 6.9-2.9 6.9-6.6 0-1.8-.6-3.3-1.5-4.5z" fill={BROWN} />
      <Path d="M18.6 12.4c0 3.1-2 5.6-4.6 6.3 1.6-1.6 2.4-3.8 2.2-6.4z" fill={CREAM} opacity={0.35} />
      <Circle cx={16.4} cy={7.2} r={2.7} fill={BROWN} />
      <Path d="M14.4 5.2c.1-1.1 1-1.8 2-1.5.5-.9 1.8-.9 2.2.2.7 0 1 .7.6 1.3-.8.3-1.9.3-2.8.2-.8-.1-1.5 0-2 .1z" fill={COMB} />
      <Ellipse cx={18.3} cy={9.4} rx={0.6} ry={0.95} fill={COMB} />
      <Path d="M18.9 6.6l2.2 1-2.2 1z" fill={BEAK} />
      <Circle cx={17.1} cy={6.8} r={0.55} fill={INK} />
      <Path d="M8 14.4c1.8 1.7 4.6 1.8 6.4.3-.4-2.1-2.4-3.3-4.4-2.9-1.2.3-2 1.4-2 2.6z" fill={BROWN_DARK} />
    </>
  );
}

function Chick() {
  return (
    <>
      <Ellipse cx={11.4} cy={21.4} rx={5.4} ry={0.8} fill={INK} opacity={0.12} />
      <Path d="M9.6 19.6v1.8M12.6 19.6v1.8" stroke={LEG} strokeWidth={0.8} strokeLinecap="round" />
      <Circle cx={11} cy={14.6} r={5.8} fill="#FFD45C" />
      <Circle cx={15.2} cy={9.6} r={3.6} fill="#FFD45C" />
      <Path d="M18.4 9.2l2.2.9-2.2.9z" fill="#F08A24" />
      <Circle cx={16.1} cy={8.9} r={0.6} fill={INK} />
      <Path d="M7.2 14.2c1.4 1.7 3.8 1.8 5.4.4-.6-1.6-2-2.4-3.5-2.1-1 .2-1.7 .9-1.9 1.7z" fill="#F5B700" />
      <Path d="M14.2 6.3c.2-.8.8-1.2 1.4-1.1" stroke="#F5B700" strokeWidth={0.6} strokeLinecap="round" fill="none" />
    </>
  );
}
