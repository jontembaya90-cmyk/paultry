import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Txt } from '@/components/text';
import { radius, space, useTheme } from '@/theme';

/**
 * KPI tile. The value is the hero; the status icon + words say whether it is good,
 * so colour is never the only signal.
 */
export function MetricTile({
  label,
  value,
  sub,
  status,
  big,
}: {
  label: string;
  value: string;
  sub?: string;
  status?: 'good' | 'watch' | 'bad';
  big?: boolean;
}) {
  const c = useTheme();
  const tint = status === 'good' ? c.sageText : status === 'bad' ? c.barnText : status === 'watch' ? c.yolkText : c.inkSecondary;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}${status === 'bad' ? ', needs attention' : status === 'good' ? ', on track' : ''}`}
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        padding: space.lg,
        gap: space.xs,
        boxShadow: c.shadowCard,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
        <Txt variant="label" tone="secondary" style={{ flexShrink: 1 }}>
          {label.toUpperCase()}
        </Txt>
        {status && <Icon name={status === 'good' ? 'checkCircle' : 'warning'} size={16} color={tint} />}
      </View>
      <Txt variant={big ? 'largeTitle' : 'number'} style={{ fontVariant: ['tabular-nums'] }} selectable>
        {value}
      </Txt>
      {sub && (
        <Txt variant="caption" color={status ? tint : c.inkSecondary}>
          {sub}
        </Txt>
      )}
    </View>
  );
}
