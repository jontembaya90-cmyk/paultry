import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/button';
import { Txt } from '@/components/text';
import { useT } from '@/lib/i18n';
import { space, useTheme } from '@/theme';

/** Shared scaffold for onboarding steps: progress dots, title, scrolling body, pinned action. */
export function OnboardingFrame({
  step,
  title,
  subtitle,
  children,
  footer,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const tr = useT();
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton icon="back" label={tr('Back')} variant="ghost" onPress={() => router.back()} />
        <View
          style={{ flex: 1, flexDirection: 'row', gap: space.xs }}
          accessible
          accessibilityLabel={tr('Step {n} of 3', { n: step })}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? c.yolk : c.track }} />
          ))}
        </View>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.xxxl, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <View style={{ gap: space.sm }}>
          <Txt variant="largeTitle" accessibilityRole="header">
            {title}
          </Txt>
          {subtitle && (
            <Txt variant="body" tone="secondary">
              {subtitle}
            </Txt>
          )}
        </View>
        {children}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: space.gutter,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.lg,
          borderTopWidth: 1,
          borderTopColor: c.hairline,
          backgroundColor: c.bg,
        }}>
        <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>{footer}</View>
      </View>
    </KeyboardAvoidingView>
  );
}
