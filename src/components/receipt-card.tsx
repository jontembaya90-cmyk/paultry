import { Share, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { Badge } from '@/components/surface';
import { Txt } from '@/components/text';
import { fmt } from '@/data/format';
import { saleStatus, saleTotal } from '@/data/selectors';
import type { Customer, Sale } from '@/data/types';
import { radius, space, useTheme } from '@/theme';

export const ITEM_LABEL: Record<Sale['item'], { one: string; many: string; line: string }> = {
  eggs: { one: 'tray', many: 'trays', line: 'Eggs' },
  live: { one: 'bird', many: 'birds', line: 'Live birds' },
  dressed: { one: 'bird', many: 'birds', line: 'Dressed birds' },
  manure: { one: 'bag', many: 'bags', line: 'Manure' },
  spent: { one: 'hen', many: 'hens', line: 'Spent hens' },
};

const METHOD_LABEL = { cash: 'Cash', bank: 'Bank transfer', mobile: 'Mobile money' } as const;

export function receiptNumber(sale: Sale) {
  return sale.id.slice(-6).toUpperCase();
}

export function receiptText(farmName: string, sale: Sale, customer: Customer | undefined, currency: string) {
  const it = ITEM_LABEL[sale.item];
  const total = saleTotal(sale);
  return [
    `${farmName}: receipt #${receiptNumber(sale)}`,
    fmt.dayLong(sale.day),
    customer ? `For: ${customer.name}` : '',
    '',
    `${it.line}: ${fmt.int(sale.qty)} ${sale.qty === 1 ? it.one : it.many} × ${fmt.money(sale.unitPrice, currency)}`,
    `Total: ${fmt.money(total, currency)}`,
    `Paid: ${fmt.money(sale.paid, currency)} (${METHOD_LABEL[sale.method]})`,
    total - sale.paid > 0.005 ? `Balance: ${fmt.money(total - sale.paid, currency)}` : 'Paid in full. Thank you!',
  ]
    .filter((l, i) => l || i === 3)
    .join('\n');
}

export function shareReceipt(farmName: string, sale: Sale, customer: Customer | undefined, currency: string) {
  Share.share({ message: receiptText(farmName, sale, customer, currency) }).catch(() => {});
}

/** A paper-like receipt with farm branding, ready to screenshot or share. */
export function ReceiptCard({ farmName, sale, customer, currency }: { farmName: string; sale: Sale; customer?: Customer; currency: string }) {
  const c = useTheme();
  const it = ITEM_LABEL[sale.item];
  const total = saleTotal(sale);
  const status = saleStatus(sale);
  const balance = total - sale.paid;
  const row = (label: string, value: string, strong?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Txt variant={strong ? 'headline' : 'subhead'} tone={strong ? 'primary' : 'secondary'}>
        {label}
      </Txt>
      <Txt variant={strong ? 'headline' : 'subhead'} style={{ fontVariant: ['tabular-nums'] }} selectable>
        {value}
      </Txt>
    </View>
  );
  return (
    <View
      accessible
      accessibilityLabel={`Receipt from ${farmName} for ${customer?.name ?? 'customer'}. ${sale.qty} ${it.many}, total ${fmt.money(total, currency)}, ${status === 'paid' ? 'paid in full' : `${fmt.money(balance, currency)} still owed`}.`}
      style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: c.shadowRaised, overflow: 'hidden' }}>
      <View style={{ backgroundColor: c.yolk, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="hen" size={28} color={c.onYolk} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="title3" color={c.onYolk}>
            {farmName}
          </Txt>
          <Txt variant="caption" color={c.onYolk}>
            Receipt #{receiptNumber(sale)} · {fmt.dayShort(sale.day)}
          </Txt>
        </View>
      </View>
      <View style={{ padding: space.lg, gap: space.md }}>
        {customer && (
          <Txt variant="headline" selectable>
            {customer.name}
          </Txt>
        )}
        {row(`${it.line} · ${fmt.int(sale.qty)} ${sale.qty === 1 ? it.one : it.many}`, `× ${fmt.money(sale.unitPrice, currency)}`)}
        <Svg height={2} width="100%">
          <Line x1={0} y1={1} x2="100%" y2={1} stroke={c.hairline} strokeWidth={2} strokeDasharray="6 6" />
        </Svg>
        <View style={{ alignItems: 'flex-start', gap: 2 }}>
          <Txt variant="caption" tone="secondary">
            Total
          </Txt>
          <Txt variant="kpi" selectable>
            {fmt.money(total, currency)}
          </Txt>
        </View>
        {row(`Paid · ${METHOD_LABEL[sale.method]}`, fmt.money(sale.paid, currency))}
        {balance > 0.005 && row('Balance owed', fmt.money(balance, currency), true)}
        <Badge
          tone={status === 'paid' ? 'sage' : status === 'partial' ? 'yolk' : 'barn'}
          icon={status === 'paid' ? 'checkCircle' : 'hourglass'}
          label={status === 'paid' ? 'Paid in full' : status === 'partial' ? 'Part paid' : 'Owed'}
        />
      </View>
    </View>
  );
}
