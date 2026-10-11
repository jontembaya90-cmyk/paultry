import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { fonts, useTheme } from '@/theme';

type Options = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/** Shared header look for every tab's stack: calm, borderless, rounded display title. */
export function useStackOptions(): Options {
  const c = useTheme();
  return {
    headerStyle: { backgroundColor: c.bg },
    headerShadowVisible: false,
    headerTintColor: c.ink,
    headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: c.ink },
    headerLargeTitleEnabled: true,
    headerLargeTitleStyle: { fontFamily: fonts.display, color: c.ink },
    headerLargeTitleShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: c.bg },
  };
}
