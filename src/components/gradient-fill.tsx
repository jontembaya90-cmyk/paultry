import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * A full-bleed vertical gradient drawn with SVG, so the sunrise (onboarding) and dusk
 * (Close the Coop) skies look the same on Android, iOS and web.
 */
export function GradientFill({ stops }: { stops: [offset: number, color: string][] }) {
  const id = `g${useId().replace(/:/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, col]) => (
            <Stop key={o} offset={o} stopColor={col} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
