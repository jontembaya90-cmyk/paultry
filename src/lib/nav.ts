import { router } from 'expo-router';

/** Close a modal or go back; if it was opened directly (deep link, restored state), go home. */
export function dismiss() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
