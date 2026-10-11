import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/button';
import { Chip, ChipRow, Field, Segmented, Stepper } from '@/components/controls';
import { ITEM_LABEL, ReceiptCard, shareReceipt } from '@/components/receipt-card';
import { Banner } from '@/components/surface';
import { Txt } from '@/components/text';
import { fmt } from '@/data/format';
import { activeFlocks, houseName, isLaying, withdrawalFor } from '@/data/selectors';
import { addCustomer, logSale, useFarm } from '@/data/store';
import type { PaymentMethod, Sale, SaleItem } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { dismiss } from '@/lib/nav';
import { space, useTheme } from '@/theme';

const ITEMS: { key: SaleItem; label: string }[] = [
  { key: 'eggs', label: 'Eggs' },
  { key: 'live', label: 'Live birds' },
  { key: 'dressed', label: 'Dressed birds' },
  { key: 'spent', label: 'Spent hens' },
  { key: 'manure', label: 'Manure' },
];

const METHODS: { key: PaymentMethod; label: string; icon: 'cash' | 'bank' | 'phone' }[] = [
  { key: 'cash', label: 'Cash', icon: 'cash' },
  { key: 'mobile', label: 'Mobile money', icon: 'phone' },
  { key: 'bank', label: 'Bank', icon: 'bank' },
];

export default function SaleEntry() {
  const c = useTheme();
  const farm = useFarm();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ customer?: string }>();
  const cur = farm.settings.currency;

  const [item, setItem] = useState<SaleItem>('eggs');
  const sources = activeFlocks(farm).filter((f) => (item === 'eggs' ? isLaying(f) : item === 'manure' ? false : true));
  const [flockId, setFlockId] = useState<string | undefined>(sources.find((f) => !withdrawalFor(farm, f.id))?.id);
  const [customerId, setCustomerId] = useState(params.customer ?? farm.customers[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(farm.customers.length === 0);
  const [qty, setQty] = useState(10);
  const lastPrice = [...farm.sales].reverse().find((s) => s.item === item)?.unitPrice;
  const [price, setPrice] = useState(lastPrice ? String(lastPrice) : '');
  const [status, setStatus] = useState<'paid' | 'partial' | 'owed'>('paid');
  const [paidText, setPaidText] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [done, setDone] = useState<Sale | null>(null);

  const needsSource = item !== 'manure';
  const blocked = flockId ? withdrawalFor(farm, flockId) : undefined;
  const unitPrice = Number(price.replace(',', '.')) || 0;
  const total = qty * unitPrice;
  const paid = status === 'paid' ? total : status === 'owed' ? 0 : Math.min(total, Number(paidText.replace(',', '.')) || 0);
  const unit = ITEM_LABEL[item];
  const valid = qty > 0 && unitPrice > 0 && (!needsSource || (!!flockId && !blocked)) && (adding ? newName.trim().length > 1 : !!customerId);

  const pickItem = (k: SaleItem) => {
    setItem(k);
    const next = activeFlocks(farm).filter((f) => (k === 'eggs' ? isLaying(f) : k !== 'manure'));
    setFlockId(next.find((f) => !withdrawalFor(farm, f.id))?.id ?? next[0]?.id);
    const lp = [...farm.sales].reverse().find((s) => s.item === k)?.unitPrice;
    setPrice(lp ? String(lp) : '');
  };

  const save = () => {
    if (!valid) return;
    const cust = adding ? addCustomer(newName.trim()) : undefined;
    const sale = logSale({ customerId: cust?.id ?? customerId, item, flockId: needsSource ? flockId : undefined, qty, unitPrice, paid, method });
    haptic.success();
    setDone(sale);
  };

  if (done) {
    const customer = farm.customers.find((x) => x.id === done.customerId);
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.gutter, gap: space.xl }}>
        <Txt variant="largeTitle" accessibilityRole="header">
          Sale saved
        </Txt>
        <Animated.View entering={reduced ? undefined : FadeInDown.springify().damping(16)} style={{ flex: 1 }}>
          <ReceiptCard farmName={farm.farmName} sale={done} customer={customer} currency={cur} />
        </Animated.View>
        <View style={{ gap: space.md }}>
          <Button title="Share receipt" icon="share" size="xl" full onPress={() => shareReceipt(farm.farmName, done, customer, cur)} />
          <Button title="Done" variant="ghost" full onPress={() => dismiss()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton icon="close" label="Close without saving" onPress={() => dismiss()} />
        <Txt variant="title2" accessibilityRole="header">
          New sale
        </Txt>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.xxl }}>
        <View style={{ gap: space.sm }}>
          <Txt variant="label" tone="secondary">
            WHAT
          </Txt>
          <ChipRow scroll>
            {ITEMS.map((x) => (
              <Chip key={x.key} label={x.label} selected={item === x.key} onPress={() => pickItem(x.key)} />
            ))}
          </ChipRow>
        </View>

        {needsSource && (
          <View style={{ gap: space.sm }}>
            <Txt variant="label" tone="secondary">
              FROM
            </Txt>
            <ChipRow>
              {sources.map((f) => {
                const w = withdrawalFor(farm, f.id);
                return <Chip key={f.id} label={`${houseName(farm, f)}${w ? ' · blocked' : ''}`} icon={w ? 'lock' : undefined} selected={flockId === f.id} onPress={() => setFlockId(f.id)} />;
              })}
            </ChipRow>
            {sources.length === 0 && (
              <Txt variant="subhead" tone="secondary">
                No flock can supply this right now.
              </Txt>
            )}
            {blocked && (
              <Banner
                tone="barn"
                icon="lock"
                title={`Do not sell from ${houseName(farm, activeFlocks(farm).find((f) => f.id === flockId)!)} until ${fmt.monthDay(blocked.withdrawalUntil)}`}
                body={`${blocked.drug} withdrawal. Medicine residues can still be in the ${item === 'eggs' ? 'eggs' : 'meat'}. Sales open again automatically.`}
              />
            )}
          </View>
        )}

        <View style={{ gap: space.sm }}>
          <Txt variant="label" tone="secondary">
            CUSTOMER
          </Txt>
          {!adding ? (
            <ChipRow>
              {farm.customers.map((x) => (
                <Chip key={x.id} label={x.name} selected={customerId === x.id} onPress={() => setCustomerId(x.id)} />
              ))}
              <Chip label="New customer" icon="personAdd" onPress={() => setAdding(true)} />
            </ChipRow>
          ) : (
            <View style={{ gap: space.sm }}>
              <Field label="Customer name" value={newName} onChangeText={setNewName} autoFocus autoCapitalize="words" placeholder="e.g. Mama Njeri's Shop" />
              {farm.customers.length > 0 && <Button title="Pick an existing customer" variant="ghost" size="md" onPress={() => setAdding(false)} />}
            </View>
          )}
        </View>

        <Txt variant="label" tone="secondary" style={{ marginBottom: -space.md }}>
          HOW MANY {unit.many.toUpperCase()}
        </Txt>
        <Stepper label={`Quantity in ${unit.many}`} value={qty} min={1} max={100000} onChange={setQty} unit={qty === 1 ? unit.one : unit.many} />
        <Field label={`Price per ${unit.one} (${cur})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" big />

        <View style={{ alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`Total ${fmt.money(total, cur)}`}>
          <Txt variant="caption" tone="secondary">
            Total
          </Txt>
          <Txt variant="kpi">{fmt.money(total, cur)}</Txt>
          {item === 'eggs' && (
            <Txt variant="subhead" tone="secondary">
              {fmt.int(qty * 30)} eggs
            </Txt>
          )}
        </View>

        <View style={{ gap: space.sm }}>
          <Txt variant="label" tone="secondary">
            PAYMENT
          </Txt>
          <Segmented
            options={[
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Part paid' },
              { value: 'owed', label: 'Owed' },
            ]}
            value={status}
            onChange={setStatus}
          />
          {status === 'partial' && <Field label={`Amount paid now (${cur})`} value={paidText} onChangeText={setPaidText} keyboardType="decimal-pad" />}
          {status !== 'owed' && (
            <ChipRow>
              {METHODS.map((m) => (
                <Chip key={m.key} label={m.label} icon={m.icon} selected={method === m.key} onPress={() => setMethod(m.key)} />
              ))}
            </ChipRow>
          )}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: insets.bottom + space.lg, borderTopWidth: 1, borderTopColor: c.hairline }}>
        <Button title={blocked ? 'Sales blocked for this house' : total > 0 ? `Save sale · ${fmt.money(total, cur)}` : 'Save sale'} size="xl" full disabled={!valid} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}
