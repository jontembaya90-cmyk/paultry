import { View } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

import { HATCH_MILESTONES } from '@/data/selectors';
import { useTheme } from '@/theme';

/**
 * The 21-day hatch ring. Milestone dots sit on the track at candling (7, 14), lockdown (18)
 * and hatch (21). The ring turns Sky in lockdown, when humidity matters most.
 */
export function HatchRing({ day, size = 64, labels }: { day: number; size?: number; labels?: boolean }) {
  const c = useTheme();
  const stroke = size * (labels ? 0.07 : 0.12);
  const r = size / 2 - stroke / 2 - (labels ? size * 0.09 : 0);
  const circ = 2 * Math.PI * r;
  const p = Math.min(1, day / 21);
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Svg width={size} height={size}>
        <G transform={`translate(${size / 2} ${size / 2})`}>
          <G transform="rotate(-90)">
            <Circle r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
            <Circle r={r} stroke={day >= 18 ? c.sky : c.yolk} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ * p} ${circ}`} />
            {HATCH_MILESTONES.map((m) => {
              const a = (m.day / 21) * 2 * Math.PI;
              return <Circle key={m.day} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={stroke * 0.3} fill={m.day <= day ? c.surface : c.inkTertiary} />;
            })}
          </G>
          {labels &&
            HATCH_MILESTONES.map((m) => {
              const a = (m.day / 21) * 2 * Math.PI - Math.PI / 2;
              const lr = r + stroke + size * 0.05;
              return (
                <SvgText key={m.day} x={Math.cos(a) * lr} y={Math.sin(a) * lr + 4} fontSize={11} fontWeight="600" fill={c.inkSecondary} textAnchor="middle">
                  {`D${m.day}`}
                </SvgText>
              );
            })}
        </G>
      </Svg>
    </View>
  );
}
