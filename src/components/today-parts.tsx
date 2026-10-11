import { useId } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/button';
import { Avatar, Progress } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { Illustration, type IllustrationName } from '@/components/illustration';
import { Badge, Card } from '@/components/surface';
import { Txt } from '@/components/text';
import { EGGS_PER_TRAY, fmt } from '@/data/format';
import type { HeatBand } from '@/data/selectors';
import type { Task } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { radius, space, touch, useTheme } from '@/theme';

/* ───────────────────────────── Egg hero ───────────────────────────── */

export function EggHero({ eggs, target, onPress, compact }: { eggs: number; target: number; onPress?: () => void; compact?: boolean }) {
  const c = useTheme();
  const trays = Math.floor(eggs / EGGS_PER_TRAY);
  const loose = eggs % EGGS_PER_TRAY;
  const pct = target > 0 ? eggs / target : 0;
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Eggs today: ${fmt.int(eggs)} of ${fmt.int(target)} target. That is ${trays} trays and ${loose} eggs.`}
      accessibilityHint="Opens egg logging">
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Icon name="egg" size={18} color={c.yolkText} />
            <Txt variant="label" tone="secondary">
              EGGS TODAY
            </Txt>
          </View>
          {onPress && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Txt variant="label" color={c.yolkText}>
                Log eggs
              </Txt>
              <Icon name="chevronRight" size={18} color={c.yolkText} />
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: space.sm }}>
          <Txt variant={compact ? 'kpi' : 'hero'} selectable>
            {fmt.int(eggs)}
          </Txt>
          {target > 0 && (
            <Txt variant="title2" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
              / {fmt.int(target)}
            </Txt>
          )}
        </View>
        {target > 0 && <Progress value={pct} color={c.yolk} height={12} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
          <TrayGlyph />
          <Txt variant="headline">
            {trays} {trays === 1 ? 'tray' : 'trays'}
            {loose > 0 && (
              <Txt variant="headline" tone="secondary">
                {' '}+ {loose} {loose === 1 ? 'egg' : 'eggs'}
              </Txt>
            )}
          </Txt>
          {target > 0 && (
            <Txt variant="subhead" tone="secondary" style={{ marginStart: 'auto' }}>
              {fmt.pct(pct)} of target
            </Txt>
          )}
        </View>
      </View>
    </Card>
  );
}

/** A 30-cup egg tray, drawn as a 6×5 grid. */
export function TrayGlyph({ size = 22, filled = 30 }: { size?: number; filled?: number }) {
  const c = useTheme();
  const cell = size / 6;
  return (
    <View style={{ width: size, height: cell * 5, flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <View key={i} style={{ width: cell, height: cell, padding: cell * 0.12 }}>
          <View style={{ flex: 1, borderRadius: cell, backgroundColor: i < filled ? c.yolk : c.track }} />
        </View>
      ))}
    </View>
  );
}

/* ───────────────────────────── Tasks ───────────────────────────── */

const TASK_ICON: Record<Task['kind'], IconName> = {
  vaccine: 'vaccine', feed: 'feeder', water: 'drinker', eggs: 'egg', clean: 'grass', check: 'coop', biosecurity: 'shield', hatchery: 'incubator',
};

export function TaskRow({ task, who, onToggle, big }: { task: Task; who?: { id: string; name: string }; onToggle: () => void; big?: boolean }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const done = !!task.doneAt;
  const box = big ? 40 : 30;
  return (
    <Pressable
      onPress={() => {
        if (done) haptic.toggleOff();
        else haptic.toggleOn();
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${task.title}${task.detail ? `, ${task.detail}` : ''}${who ? `, assigned to ${who.name}` : ''}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: big ? touch.hero : touch.log + 8,
        paddingVertical: space.sm,
        opacity: pressed ? 0.6 : 1,
      })}>
      <View
        style={{
          width: box,
          height: box,
          borderRadius: box / 2,
          borderWidth: done ? 0 : 2,
          borderColor: c.inkTertiary,
          backgroundColor: done ? c.sage : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {done && (
          <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(12)}>
            <Icon name="check" size={box * 0.62} color="#FFFFFF" />
          </Animated.View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          <Txt variant={big ? 'title3' : 'headline'} tone={done ? 'secondary' : 'primary'}>
            {task.title}
          </Txt>
          {task.kind === 'vaccine' && !done && <Badge tone="sky" icon="vaccine" label="Vaccine" size="sm" />}
        </View>
        {task.detail && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Icon name={TASK_ICON[task.kind]} size={15} color={c.inkTertiary} />
            <Txt variant="subhead" tone="secondary" style={{ flexShrink: 1 }}>
              {task.detail}
            </Txt>
          </View>
        )}
      </View>
      {who && <Avatar name={who.name} id={who.id} size={big ? 40 : 32} />}
    </Pressable>
  );
}

/* ───────────────────────────── Heat strip ───────────────────────────── */

export function heatTone(band: HeatBand) {
  return band === 'danger' ? 'barn' : band === 'high' ? 'barn' : band === 'warm' ? 'yolk' : 'sage';
}

export const HEAT_LABEL: Record<HeatBand, string> = { comfortable: 'Comfortable', warm: 'Warm', high: 'High', danger: 'Danger' };

export function HeatStrip({
  hours,
  peak,
  guidance,
  tempUnit,
}: {
  hours: { hour: number; tempC: number; humidity: number; band: HeatBand; value: number }[];
  peak: { tempC: number; humidity: number; band: HeatBand; value: number };
  guidance: string;
  tempUnit: 'C' | 'F';
}) {
  const c = useTheme();
  const now = new Date().getHours();
  const max = Math.max(...hours.map((h) => h.tempC));
  const min = Math.min(...hours.map((h) => h.tempC));
  const color = (b: HeatBand) => (b === 'danger' || b === 'high' ? c.barn : b === 'warm' ? c.yolk : c.sage);
  return (
    <Card>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ gap: 2, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Icon name="heat" size={18} color={c.inkSecondary} />
              <Txt variant="label" tone="secondary">
                HEAT STRESS TODAY
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
              <Txt variant="number">{fmt.temp(peak.tempC, tempUnit)}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Icon name="humidity" size={16} color={c.skyText} />
                <Txt variant="headline" color={c.skyText}>
                  {peak.humidity}%
                </Txt>
              </View>
            </View>
          </View>
          <Badge tone={heatTone(peak.band)} icon={peak.band === 'comfortable' ? 'checkCircle' : 'warning'} label={`${HEAT_LABEL[peak.band]} · ${peak.value}`} />
        </View>
        <View
          accessible
          accessibilityLabel={`Hourly heat forecast. Peak ${fmt.temp(peak.tempC, tempUnit)} and ${peak.humidity} percent humidity, ${HEAT_LABEL[peak.band]}.`}
          style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 64 }}>
          {hours.map((h) => {
            const tall = 16 + ((h.tempC - min) / Math.max(1, max - min)) * 44;
            const isNow = h.hour === now;
            return (
              <View key={h.hour} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{ width: '100%', height: tall, borderRadius: 5, backgroundColor: color(h.band), opacity: isNow ? 1 : 0.55, borderWidth: isNow ? 2 : 0, borderColor: c.ink }} />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[hours[0], hours[Math.floor(hours.length / 2)], hours[hours.length - 1]].map((h) => (
            <Txt key={h.hour} variant="caption" tone="secondary">
              {fmt.hour(h.hour)}
            </Txt>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: peak.band === 'comfortable' ? c.sageSoft : c.barnSoft, padding: space.md, borderRadius: radius.md, borderCurve: 'continuous' }}>
          <Icon name={peak.band === 'comfortable' ? 'checkCircle' : 'drinker'} size={20} color={peak.band === 'comfortable' ? c.sageText : c.barnText} />
          <Txt variant="callout" style={{ flex: 1 }}>
            {guidance}
          </Txt>
        </View>
      </View>
    </Card>
  );
}

/* ───────────────────────────── Feed silo ───────────────────────────── */

export function Silo({ fill, low, width = 52, height = 84 }: { fill: number; low?: boolean; width?: number; height?: number }) {
  const c = useTheme();
  const f = Math.max(0.03, Math.min(1, fill));
  const roof = width * 0.32;
  const body = height - roof;
  const level = body * f;
  const fillColor = low ? c.barn : c.wheat;
  const gid = `silo${useId().replace(/:/g, '')}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={fillColor} stopOpacity={0.85} />
          <Stop offset="1" stopColor={fillColor} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x={2} y={roof} width={width - 4} height={body - 2} rx={8} fill={c.track} />
      <Rect x={2} y={roof + (body - 2 - level)} width={width - 4} height={level} rx={8} fill={`url(#${gid})`} />
      <Rect x={width * 0.18} y={2} width={width * 0.64} height={roof} rx={roof / 2} fill={c.straw} />
    </Svg>
  );
}

export function FeedRunwayRow({
  name,
  days,
  fill,
  untilMarket,
  dailyKg,
  onReorder,
}: {
  name: string;
  days: number;
  fill: number;
  untilMarket: boolean;
  dailyKg: number;
  onReorder: () => void;
}) {
  const c = useTheme();
  const low = !untilMarket && days <= 7;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
      <Silo fill={fill} low={low} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="subhead" tone="secondary">
          {name}
        </Txt>
        <Txt variant="title2" color={low ? c.barnText : c.ink}>
          {days} {days === 1 ? 'day' : 'days'} left
        </Txt>
        <Txt variant="caption" tone="secondary">
          {untilMarket ? 'Enough to reach market day' : `About ${fmt.int(dailyKg)} kg a day`}
        </Txt>
      </View>
      <Button title="Reorder" variant={low ? 'primary' : 'secondary'} size="md" onPress={onReorder} />
    </View>
  );
}

/* ───────────────────────────── Sync status ───────────────────────────── */

export function SyncPill({ pending, syncing, offline, onPress }: { pending: number; syncing: boolean; offline: boolean; onPress?: () => void }) {
  const c = useTheme();
  const state = syncing ? 'syncing' : pending > 0 ? 'waiting' : 'synced';
  const label =
    state === 'syncing' ? 'Syncing…' : state === 'waiting' ? `${pending} ${pending === 1 ? 'entry' : 'entries'} waiting${offline ? ' · offline' : ''}` : 'All saved';
  const icon: IconName = state === 'syncing' ? 'sync' : state === 'waiting' ? (offline ? 'cloudOff' : 'hourglass') : 'cloudDone';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={state === 'waiting' ? `${pending} entries saved on this phone, waiting to sync` : label}
      hitSlop={8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        paddingHorizontal: space.md,
        minHeight: 36,
        alignSelf: 'flex-start',
        borderRadius: radius.full,
        backgroundColor: state === 'synced' ? c.surfaceAlt : c.skySoft,
      }}>
      <Icon name={icon} size={16} color={state === 'synced' ? c.inkSecondary : c.skyText} />
      <Txt variant="label" color={state === 'synced' ? c.inkSecondary : c.skyText}>
        {label}
      </Txt>
    </Pressable>
  );
}

/* ───────────────────────────── Empty state ───────────────────────────── */

export function EmptyState({
  art,
  title,
  body,
  action,
  onAction,
}: {
  art: IllustrationName;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl, paddingHorizontal: space.lg }}>
      <Illustration name={art} size={132} />
      <Txt variant="title2" center>
        {title}
      </Txt>
      <Txt variant="body" tone="secondary" center style={{ maxWidth: 320 }}>
        {body}
      </Txt>
      {action && onAction && <Button title={action} onPress={onAction} style={{ marginTop: space.sm }} />}
    </View>
  );
}
