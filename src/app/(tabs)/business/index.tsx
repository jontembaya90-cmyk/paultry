import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Chip, ChipRow, Field, Progress } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { MetricTile } from '@/components/metric-tile';
import { FAB_CLEARANCE } from '@/components/quick-log-fab';
import { ITEM_LABEL } from '@/components/receipt-card';
import { Badge, Card, Divider, SectionHeader } from '@/components/surface';
import { Txt } from '@/components/text';
import { EmptyState } from '@/components/today-parts';
import { fmt, parseDay, today } from '@/data/format';
import { activeFlocks, aliveOn, customerBalances, monthFinance, saleStatus, saleTotal } from '@/data/selectors';
import { addExpense, recordPayment, useFarm } from '@/data/store';
import type { ExpenseCategory } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { pickFlockPhoto } from '@/lib/photos';
import { space, useTheme } from '@/theme';

const CATEGORIES: { key: ExpenseCategory; label: string; icon: IconName }[] = [
  { key: 'feed', label: 'Feed', icon: 'feeder' },
  { key: 'chicks', label: 'Chicks', icon: 'chick' },
  { key: 'vaccines', label: 'Vaccines & drugs', icon: 'vaccine' },
  { key: 'labor', label: 'Labour', icon: 'people' },
  { key: 'utilities', label: 'Utilities', icon: 'light' },
  { key: 'equipment', label: 'Equipment', icon: 'drinker' },
];

export default function BusinessScreen() {
  const c = useTheme();
  const farm = useFarm();
  const cur = farm.settings.currency;
  const fin = monthFinance(farm);
  const owed = customerBalances(farm).filter((x) => x.owed > 0);
  const month = parseDay(today()).toLocaleDateString(undefined, { month: 'long' });
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState<ExpenseCategory>('feed');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<string>();
  const maxCat = Math.max(1, ...Object.values(fin.byCategory));

  const summary = () =>
    [
      `${farm.farmName}: ${month} summary`,
      `Revenue: ${fmt.money(fin.revenue, cur)}`,
      `Expenses: ${fmt.money(fin.spent, cur)}`,
      `Profit: ${fmt.money(fin.profit, cur)}`,
      fin.costPerEgg !== undefined ? `Cost per egg: ${fmt.money(fin.costPerEgg, cur)}` : '',
      `Profit per bird: ${fmt.money(fin.profitPerBird, cur)}`,
      `Eggs produced: ${fmt.int(fin.monthEggs)}`,
      `Owed by customers: ${fmt.money(fin.owed, cur)}`,
      '',
      'Prepared with ROOST from daily farm records.',
    ]
      .filter((l, i) => l || i === 8)
      .join('\n');

  const csv = () => {
    const rows = [['date', 'type', 'description', 'quantity', 'unit_price', 'amount', 'paid']];
    for (const s of fin.sales) {
      const cust = farm.customers.find((x) => x.id === s.customerId)?.name ?? '';
      rows.push([s.day, 'sale', `${ITEM_LABEL[s.item].line} to ${cust}`, String(s.qty), String(s.unitPrice), saleTotal(s).toFixed(2), s.paid.toFixed(2)]);
    }
    for (const e of fin.expenses) rows.push([e.day, 'expense', `${e.category}: ${e.note}`, '', '', (-e.amount).toFixed(2), '']);
    return rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\n');
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: FAB_CLEARANCE + space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View accessible accessibilityLabel={`Profit in ${month}: ${fmt.money(fin.profit, cur)}. Revenue ${fmt.money(fin.revenue, cur)}, expenses ${fmt.money(fin.spent, cur)}.`} style={{ gap: space.xs }}>
        <Txt variant="label" tone="secondary">
          PROFIT IN {month.toUpperCase()}
        </Txt>
        <Txt variant="hero" color={fin.profit >= 0 ? c.ink : c.barnText}>
          {fmt.money(fin.profit, cur)}
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Icon name="trendingUp" size={18} color={c.sageText} />
            <Txt variant="headline">{fmt.money(fin.revenue, cur)}</Txt>
            <Txt variant="subhead" tone="secondary">
              in
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Icon name="trendingDown" size={18} color={c.barnText} />
            <Txt variant="headline">{fmt.money(fin.spent, cur)}</Txt>
            <Txt variant="subhead" tone="secondary">
              out
            </Txt>
          </View>
        </View>
        <Progress value={fin.revenue ? fin.spent / fin.revenue : 0} color={c.barn} height={10} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <MetricTile big label="Cost per egg" value={fin.costPerEgg !== undefined ? fmt.money(fin.costPerEgg, cur) : '—'} sub="Layer costs ÷ eggs this month" />
        <MetricTile big label="Profit per bird" value={fmt.money(fin.profitPerBird, cur)} sub="This month, all flocks" status={fin.profitPerBird >= 0 ? 'good' : 'bad'} />
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Button title="Log a sale" icon="sale" size="xl" onPress={() => router.push('/sale')} style={{ flex: 3 }} />
        <Button title="Expense" icon="add" variant="secondary" size="xl" onPress={() => setAdding((a) => !a)} style={{ flex: 2 }} />
      </View>

      {adding && (
        <Animated.View entering={FadeIn}>
          <Card style={{ gap: space.lg }}>
            <Txt variant="title3">New expense</Txt>
            <ChipRow>
              {CATEGORIES.map((x) => (
                <Chip key={x.key} label={x.label} icon={x.icon} selected={cat === x.key} onPress={() => setCat(x.key)} />
              ))}
            </ChipRow>
            <Field label={`Amount (${cur})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" big placeholder="0.00" />
            <Field label="What for" value={note} onChangeText={setNote} placeholder="e.g. Layer mash, 500 kg" />
            {receipt ? (
              <Badge tone="sage" icon="checkCircle" label="Receipt photo attached" />
            ) : (
              <Button
                title="Photograph receipt"
                icon="scan"
                variant="ghost"
                onPress={async () => {
                  const uri = await pickFlockPhoto('camera');
                  if (uri) setReceipt(uri);
                }}
              />
            )}
            <Button
              title="Save expense"
              disabled={!(Number(amount.replace(',', '.')) > 0)}
              onPress={() => {
                addExpense({ category: cat, amount: Number(amount.replace(',', '.')), note: note.trim() || CATEGORIES.find((x) => x.key === cat)!.label, receiptUri: receipt });
                haptic.success();
                setAdding(false);
                setAmount('');
                setNote('');
                setReceipt(undefined);
              }}
            />
          </Card>
        </Animated.View>
      )}

      {owed.length > 0 && (
        <Card onPress={() => router.push('/business/customers')} accessibilityLabel={`${fmt.money(fin.owed, cur)} owed by ${owed.length} customers`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="hourglass" size={26} color={c.yolkText} />
            <View style={{ flex: 1 }}>
              <Txt variant="headline">{fmt.money(fin.owed, cur)} owed to you</Txt>
              <Txt variant="subhead" tone="secondary">
                {owed.map((o) => o.name).join(', ')}
              </Txt>
            </View>
            <Icon name="chevronRight" size={22} color={c.inkTertiary} />
          </View>
        </Card>
      )}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Sales this month" action="Customers" onAction={() => router.push('/business/customers')} />
        <Card style={{ paddingVertical: space.xs }}>
          {fin.sales.length === 0 ? (
            <EmptyState art="nest" title="No sales yet this month" body="Log a sale and ROOST makes a receipt you can share." />
          ) : (
            fin.sales.map((s, i) => {
              const cust = farm.customers.find((x) => x.id === s.customerId);
              const st = saleStatus(s);
              const due = saleTotal(s) - s.paid;
              return (
                <Fragment key={s.id}>
                  {i > 0 && <Divider />}
                  <Pressable
                    disabled={st === 'paid'}
                    onPress={() =>
                      Alert.alert(`${cust?.name ?? 'Customer'} paid?`, `${fmt.money(due, cur)} is still owed for this sale.`, [
                        { text: 'Not yet', style: 'cancel' },
                        { text: 'Paid in full', onPress: () => { recordPayment(s.id, due); haptic.success(); } },
                      ])
                    }
                    accessibilityRole={st === 'paid' ? undefined : 'button'}
                    accessibilityLabel={`${cust?.name}, ${fmt.int(s.qty)} ${ITEM_LABEL[s.item].many}, ${fmt.money(saleTotal(s), cur)}, ${st === 'paid' ? 'paid' : `${fmt.money(due, cur)} owed`}`}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingVertical: space.sm, opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="headline">{cust?.name ?? 'Customer'}</Txt>
                      <Txt variant="subhead" tone="secondary">
                        {ITEM_LABEL[s.item].line} · {fmt.int(s.qty)} {s.qty === 1 ? ITEM_LABEL[s.item].one : ITEM_LABEL[s.item].many} · {fmt.dayShort(s.day)}
                      </Txt>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                        {fmt.money(saleTotal(s), cur)}
                      </Txt>
                      <Badge
                        tone={st === 'paid' ? 'sage' : st === 'partial' ? 'yolk' : 'barn'}
                        icon={st === 'paid' ? 'checkCircle' : 'hourglass'}
                        label={st === 'paid' ? 'Paid' : st === 'partial' ? 'Part paid' : 'Owed'}
                        size="sm"
                        style={{ alignSelf: 'flex-end' }}
                      />
                    </View>
                  </Pressable>
                </Fragment>
              );
            })
          )}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Where the money went" />
        <Card style={{ gap: space.md }}>
          {CATEGORIES.filter((x) => fin.byCategory[x.key]).map((x) => (
            <View key={x.key} style={{ gap: space.xs }} accessible accessibilityLabel={`${x.label}: ${fmt.money(fin.byCategory[x.key], cur)}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name={x.icon} size={20} color={c.wheatText} />
                <Txt variant="headline" style={{ flex: 1 }}>
                  {x.label}
                </Txt>
                <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                  {fmt.money(fin.byCategory[x.key], cur)}
                </Txt>
              </View>
              <Progress value={fin.byCategory[x.key] / maxCat} color={c.wheat} height={8} />
            </View>
          ))}
          {fin.expenses.length === 0 && (
            <Txt variant="body" tone="secondary">
              No expenses logged this month.
            </Txt>
          )}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="Reports" />
        <Card style={{ gap: space.sm }}>
          <Button title={`Share ${month} summary`} icon="share" variant="secondary" full onPress={() => Share.share({ message: summary() }).catch(() => {})} />
          <Button title="Export CSV for a spreadsheet" icon="table" variant="ghost" full onPress={() => Share.share({ message: csv(), title: `${farm.farmName} ${month}.csv` }).catch(() => {})} />
          <Button
            title="Summary for bank or investor"
            icon="bank"
            variant="ghost"
            full
            onPress={() =>
              Share.share({
                message: `${summary()}\n\nFlocks: ${activeFlocks(farm).length} active · Birds: ${fmt.int(activeFlocks(farm).reduce((n, f) => n + aliveOn(farm, f), 0))}\nRecords are kept daily on ROOST.`,
              }).catch(() => {})
            }
          />
        </Card>
      </View>
    </ScrollView>
  );
}
