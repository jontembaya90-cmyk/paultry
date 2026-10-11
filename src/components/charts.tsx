import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';

import { Txt } from '@/components/text';
import { haptic } from '@/lib/haptics';
import { space, useTheme } from '@/theme';

export function Sparkline({ data, width = 96, height = 32, color }: { data: number[]; width?: number; height?: number; color: string }) {
  if (data.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * (width - 4) + 2},${height - 3 - ((v - min) / span) * (height - 6)}`);
  const last = pts[pts.length - 1].split(',').map(Number);
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={3.2} fill={color} />
    </Svg>
  );
}

type Pt = { x: number; y: number };

function smooth(points: Pt[], sx: (x: number) => number, sy: (y: number) => number) {
  if (!points.length) return '';
  let d = `M${sx(points[0].x)},${sy(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const mx = (sx(p0.x) + sx(p1.x)) / 2;
    d += ` C${mx},${sy(p0.y)} ${mx},${sy(p1.y)} ${sx(p1.x)},${sy(p1.y)}`;
  }
  return d;
}

/**
 * Actual vs breed standard, with a shaded ±5% target band and a "today" marker.
 * Drag across it to read any point; each new point gives a light haptic tick.
 */
export function TargetChart({
  actual,
  standard,
  now,
  unit,
  yFormat,
  color,
  height = 200,
}: {
  actual: Pt[];
  standard: Pt[];
  now: number;
  unit: string;
  yFormat: (v: number) => string;
  color: string;
  height?: number;
}) {
  const c = useTheme();
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState<number | null>(null);
  const pad = { l: 8, r: 8, t: 16, b: 24 };

  const { sx, sy, x0, x1 } = useMemo(() => {
    const xs = [...actual, ...standard].map((p) => p.x);
    const ys = [...actual, ...standard].map((p) => p.y);
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const ymin = Math.min(...ys) * 0.9;
    const ymax = Math.max(...ys) * 1.06;
    return {
      x0: lo,
      x1: hi,
      sx: (x: number) => pad.l + ((x - lo) / Math.max(1, hi - lo)) * (width - pad.l - pad.r),
      sy: (y: number) => pad.t + (1 - (y - ymin) / Math.max(1e-6, ymax - ymin)) * (height - pad.t - pad.b),
    };
  }, [actual, standard, width, height, pad.l, pad.r, pad.t, pad.b]);

  const band = useMemo(() => {
    if (!standard.length) return '';
    const upper = standard.map((p) => `${sx(p.x)},${sy(p.y * 1.05)}`);
    const lower = [...standard].reverse().map((p) => `${sx(p.x)},${sy(p.y * 0.95)}`);
    return `M${upper.join(' L')} L${lower.join(' L')} Z`;
  }, [standard, sx, sy]);

  const pick = (px: number) => {
    if (!actual.length) return;
    let best = 0;
    for (let i = 1; i < actual.length; i++) if (Math.abs(sx(actual[i].x) - px) < Math.abs(sx(actual[best].x) - px)) best = i;
    setActive((prev) => {
      if (prev !== best) haptic.scrub();
      return best;
    });
  };
  const release = () => setActive(null);

  const gesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onBegin((e) => scheduleOnRN(pick, e.x))
    .onUpdate((e) => scheduleOnRN(pick, e.x))
    .onFinalize(() => scheduleOnRN(release));

  const shown = active !== null ? actual[active] : actual[actual.length - 1];
  const std = shown ? standard.reduce((a, b) => (Math.abs(b.x - shown.x) < Math.abs(a.x - shown.x) ? b : a), standard[0]) : undefined;
  const diff = shown && std ? shown.y / std.y - 1 : 0;

  return (
    <View style={{ gap: space.md }}>
      {shown && (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md, flexWrap: 'wrap' }}>
          <Txt variant="number" selectable>
            {yFormat(shown.y)}
          </Txt>
          <Txt variant="subhead" tone="secondary">
            {unit === 'week' ? `Week ${Math.round(shown.x)}` : `Day ${Math.round(shown.x)}`} · standard {std ? yFormat(std.y) : '—'}
          </Txt>
          <Txt variant="label" color={diff >= -0.05 ? c.sageText : c.barnText}>
            {diff >= 0 ? '+' : '−'}
            {Math.abs(diff * 100).toFixed(1)}%
          </Txt>
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            shown && std
              ? `Chart of actual against breed standard. Latest ${yFormat(shown.y)}, standard ${yFormat(std.y)}, ${Math.abs(diff * 100).toFixed(1)} percent ${diff >= 0 ? 'above' : 'below'}.`
              : 'Chart with no records yet'
          }>
          <Svg width={width} height={height}>
            <Path d={band} fill={c.sage} opacity={0.14} />
            <Path d={smooth(standard, sx, sy)} stroke={c.sageText} strokeWidth={1.5} strokeDasharray="5 5" fill="none" opacity={0.8} />
            {now >= x0 && now <= x1 && (
              <>
                <Line x1={sx(now)} x2={sx(now)} y1={pad.t - 6} y2={height - pad.b} stroke={c.inkTertiary} strokeWidth={1} strokeDasharray="2 4" />
                <SvgText x={sx(now)} y={height - 6} fontSize={11} fill={c.inkSecondary} textAnchor="middle">
                  Today
                </SvgText>
              </>
            )}
            <Path d={smooth(actual, sx, sy)} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
            {actual.map((p, i) => (
              <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === active ? 7 : actual.length <= 12 ? 3.5 : 0} fill={i === active ? color : c.surface} stroke={color} strokeWidth={2} />
            ))}
            {active !== null && actual[active] && (
              <Line x1={sx(actual[active].x)} x2={sx(actual[active].x)} y1={pad.t} y2={height - pad.b} stroke={color} strokeWidth={1.5} opacity={0.6} />
            )}
            <SvgText x={pad.l} y={height - 6} fontSize={11} fill={c.inkSecondary}>
              {unit === 'week' ? `Wk ${Math.round(x0)}` : `Day ${Math.round(x0)}`}
            </SvgText>
            <SvgText x={width - pad.r} y={height - 6} fontSize={11} fill={c.inkSecondary} textAnchor="end">
              {unit === 'week' ? `Wk ${Math.round(x1)}` : `Day ${Math.round(x1)}`}
            </SvgText>
          </Svg>
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
        <LegendKey color={color} label="Your flock" />
        <LegendKey color={c.sageText} label="Breed standard" dashed />
        <LegendKey color={c.sage} label="Target band ±5%" band />
      </View>
    </View>
  );
}

function LegendKey({ color, label, dashed, band }: { color: string; label: string; dashed?: boolean; band?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Svg width={20} height={10}>
        {band ? (
          <Path d="M0 0 H20 V10 H0 Z" fill={color} opacity={0.2} />
        ) : (
          <Line x1={0} x2={20} y1={5} y2={5} stroke={color} strokeWidth={dashed ? 1.5 : 3} strokeDasharray={dashed ? '4 3' : undefined} />
        )}
      </Svg>
      <Txt variant="caption" tone="secondary">
        {label}
      </Txt>
    </View>
  );
}

/** Horizontal stacked bar for egg grades. Each segment is labelled below, never colour alone. */
export function StackedBar({ parts, height = 16 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((n, p) => n + p.value, 0) || 1;
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', gap: 2 }}>
      {parts.filter((p) => p.value > 0).map((p) => (
        <View key={p.label} style={{ flex: p.value / total, backgroundColor: p.color }} />
      ))}
    </View>
  );
}
