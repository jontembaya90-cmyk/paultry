import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';

import { Segmented } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { MetricTile } from '@/components/metric-tile';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { Badge, Banner, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { breedById } from '@/data/breeds';
import { fmt } from '@/data/format';
import { activeFlocks, ageOf } from '@/data/selectors';
import { useFarm } from '@/data/store';
import type { House } from '@/data/types';
import { radius, space, useTheme, type Palette } from '@/theme';

/**
 * Sensor readings are simulated until a sensor kit is connected. They are deterministic per
 * house and follow the day's forecast, so the screen behaves like it would with real data.
 */
function readings(house: House, index: number, outside: number) {
  const offset = house.type === 'cage' ? 1.5 : house.type === 'deep-litter' ? 3 : -0.5;
  const base = outside + offset;
  const sensors = [
    [0.12, 0.25], [0.5, 0.2], [0.88, 0.28], [0.15, 0.75], [0.52, 0.8], [0.86, 0.72],
  ].map(([x, y], k) => ({ x, y, t: base + Math.sin(index * 3 + k * 1.7) * 1.6 + (y > 0.5 ? 0.8 : 0) }));
  return {
    sensors,
    temp: sensors.reduce((n, s) => n + s.t, 0) / sensors.length,
    humidity: house.type === 'deep-litter' ? 71 : house.type === 'cage' ? 62 : 58,
    ammonia: house.type === 'deep-litter' ? 18 : house.type === 'cage' ? 9 : 4,
  };
}

function heatColor(c: Palette, t: number) {
  if (t >= 30) return c.barn;
  if (t >= 27) return c.yolk;
  if (t >= 18) return c.sage;
  return c.sky;
}

function HeatMap({ sensors, unit }: { sensors: { x: number; y: number; t: number }[]; unit: 'C' | 'F' }) {
  const c = useTheme();
  const [w, setW] = useState(320);
  const h = 180;
  const cols = 16;
  const rows = 8;
  const cw = (w - 16) / cols;
  const ch = (h - 16) / rows;
  // Inverse-distance weighting between sensors gives a smooth floor estimate.
  const at = (x: number, y: number) => {
    let num = 0;
    let den = 0;
    for (const s of sensors) {
      const d = Math.max(0.02, Math.hypot(s.x - x, (s.y - y) * 0.6));
      num += s.t / (d * d);
      den += 1 / (d * d);
    }
    return num / den;
  };
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={`Floor heat map. Readings from ${fmt.temp(Math.min(...sensors.map((s) => s.t)), unit)} to ${fmt.temp(Math.max(...sensors.map((s) => s.t)), unit)}.`}>
      <Svg width={w} height={h}>
        <Rect x={0} y={0} width={w} height={h} rx={16} fill={c.surfaceAlt} />
        <G>
          {Array.from({ length: cols * rows }).map((_, i) => {
            const cx = i % cols;
            const cy = Math.floor(i / cols);
            const t = at((cx + 0.5) / cols, (cy + 0.5) / rows);
            return <Rect key={i} x={8 + cx * cw} y={8 + cy * ch} width={cw + 0.5} height={ch + 0.5} fill={heatColor(c, t)} opacity={0.18 + Math.min(0.5, Math.abs(t - 22) / 20)} />;
          })}
        </G>
        <Rect x={8} y={8} width={w - 16} height={h - 16} rx={10} fill="none" stroke={c.wheat} strokeWidth={2} />
        <Rect x={w / 2 - 18} y={h - 12} width={36} height={8} rx={2} fill={c.wheat} />
        {sensors.map((s, i) => (
          <G key={i}>
            <Circle cx={8 + s.x * (w - 16)} cy={8 + s.y * (h - 16)} r={14} fill={c.surface} stroke={heatColor(c, s.t)} strokeWidth={3} />
            <SvgText x={8 + s.x * (w - 16)} y={8 + s.y * (h - 16) + 4} fontSize={10} fontWeight="700" fill={c.ink} textAnchor="middle">
              {Math.round(unit === 'C' ? s.t : s.t * 1.8 + 32)}°
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

export default function Environment() {
  const c = useTheme();
  const farm = useFarm();
  const unit = farm.settings.tempUnit;
  const [houseId, setHouseId] = useState(farm.houses[0]?.id ?? '');
  const index = Math.max(0, farm.houses.findIndex((h) => h.id === houseId));
  const house = farm.houses[index];
  const flock = activeFlocks(farm).find((f) => f.houseId === houseId);
  const nowHour = new Date().getHours();
  const outside = farm.weather?.hours.find((h) => h.hour === nowHour)?.tempC ?? 24;
  if (!house) return null;
  const r = readings(house, index, outside);
  const breed = flock ? breedById(flock.breedId) : undefined;
  const isLayer = !!breed?.lay && !!flock && ageOf(flock).weeks >= 16;
  const lightHours = breed?.marketDay ? 23 : isLayer ? 16 : 12;
  const lightsOn = breed?.marketDay ? 0 : isLayer ? 4.5 : 6;

  const thresholds: { icon: IconName; label: string; value: string; limit: string; ok: boolean }[] = [
    { icon: 'thermometer', label: 'Temperature', value: fmt.temp1(r.temp, unit), limit: `Alert above ${fmt.temp(30, unit)}`, ok: r.temp < 30 },
    { icon: 'humidity', label: 'Humidity', value: `${r.humidity}%`, limit: 'Alert above 75%', ok: r.humidity <= 75 },
    { icon: 'air', label: 'Ammonia', value: `${r.ammonia} ppm`, limit: 'Alert above 20 ppm (watch from 15)', ok: r.ammonia < 15 },
    { icon: 'light', label: 'Light', value: `${lightHours} h`, limit: isLayer ? 'Layers: 16 h steady' : breed?.marketDay ? 'Broilers: 23 h, 1 h dark' : 'Natural daylight', ok: true },
  ];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Banner tone="sky" icon="sensors" title="Sample readings" body="Connect temperature, humidity and ammonia sensors to see live values. Until then, this shows how ROOST will present them." />
      {farm.houses.length > 1 && <Segmented options={farm.houses.map((h) => ({ value: h.id, label: h.name.replace('House ', '') }))} value={houseId} onChange={setHouseId} />}

      <View style={{ gap: space.md }}>
        <SectionHeader title={`${house.name} floor`} />
        <HeatMap sensors={r.sensors} unit={unit} />
        <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
          {[
            { color: c.sky, label: `Cool < ${fmt.temp(18, unit)}` },
            { color: c.sage, label: 'Comfortable' },
            { color: c.yolk, label: `Warm ${fmt.temp(27, unit)}+` },
            { color: c.barn, label: `Hot ${fmt.temp(30, unit)}+` },
          ].map((k) => (
            <View key={k.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: k.color }} />
              <Txt variant="caption" tone="secondary">
                {k.label}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <MetricTile label="Temperature" value={fmt.temp1(r.temp, unit)} sub={`Outside ${fmt.temp(outside, unit)}`} status={r.temp < 27 ? 'good' : r.temp < 30 ? 'watch' : 'bad'} />
        <MetricTile label="Humidity" value={`${r.humidity}%`} sub="Target 50–70%" status={r.humidity <= 70 ? 'good' : 'watch'} />
        <MetricTile label="Ammonia" value={`${r.ammonia} ppm`} sub="Keep under 20" status={r.ammonia < 15 ? 'good' : r.ammonia < 20 ? 'watch' : 'bad'} />
        <MetricTile label="Light today" value={`${lightHours} h`} sub={isLayer ? 'Layer programme' : breed?.marketDay ? 'Broiler programme' : 'Natural'} />
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Thresholds" />
        <Card style={{ paddingVertical: space.xs }}>
          {thresholds.map((t, i) => (
            <View key={t.label}>
              {i > 0 && <Divider inset={36} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 }}>
                <Icon name={t.icon} size={24} color={c.inkSecondary} />
                <View style={{ flex: 1 }}>
                  <Txt variant="headline">{t.label}</Txt>
                  <Txt variant="caption" tone="secondary">
                    {t.limit}
                  </Txt>
                </View>
                <Badge tone={t.ok ? 'sage' : 'yolk'} icon={t.ok ? 'checkCircle' : 'warning'} label={t.value} size="sm" />
              </View>
            </View>
          ))}
        </Card>
        {r.ammonia >= 15 && <Txt variant="subhead" color={c.yolkText}>Ammonia is creeping up in {house.name}. Turn wet litter and open side vents for an hour.</Txt>}
      </View>

      {(isLayer || breed?.marketDay) && (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Light programme" />
          <Card style={{ gap: space.md }}>
            <View style={{ height: 36, flexDirection: 'row', borderRadius: radius.sm, overflow: 'hidden', backgroundColor: c.ink }} accessible accessibilityLabel={`Lights on ${lightHours} hours a day${lightsOn ? `, from ${fmt.hour(Math.floor(lightsOn))}` : ''}.`}>
              <View style={{ flex: lightsOn }} />
              <View style={{ flex: lightHours, backgroundColor: c.yolk }} />
              <View style={{ flex: Math.max(0, 24 - lightsOn - lightHours) }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {['12 a.m.', '6 a.m.', '12 p.m.', '6 p.m.', '12 a.m.'].map((l, i) => (
                <Txt key={i} variant="caption" tone="secondary">
                  {l}
                </Txt>
              ))}
            </View>
            <Txt variant="subhead" tone="secondary">
              {isLayer
                ? 'Lights on 4:30 a.m. to 8:30 p.m. Never shorten day length for laying hens. It drops production.'
                : 'One hour of darkness each night lets broilers rest and reduces leg problems.'}
            </Txt>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
