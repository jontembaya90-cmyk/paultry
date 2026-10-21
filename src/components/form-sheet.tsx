import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/text';
import { useT } from '@/lib/i18n';
import { space, useTheme } from '@/theme';

/** Modal form scaffold: close + title, scrolling fields, one pinned action. Same look as the log sheets. */
export function FormSheet({ icon, title, lead, footer, children }: { icon: IconName; title: string; lead?: string; footer: ReactNode; children: ReactNode }) {
  const c = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton icon="close" label={tr('Close without saving')} onPress={() => router.back()} />
        <Icon name={icon} size={24} color={c.inkSecondary} />
        <Txt variant="title2" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Txt>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.xxl, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {lead && (
          <Txt variant="body" tone="secondary">
            {lead}
          </Txt>
        )}
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: insets.bottom + space.lg, borderTopWidth: 1, borderTopColor: c.hairline }}>
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}
