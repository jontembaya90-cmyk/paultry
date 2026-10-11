import { useSyncExternalStore } from 'react';

import type { AuthState } from './auth';

export type { AuthState, AuthUser } from './auth';

/**
 * Web previews have no Google Play services: the sign-in screen still renders, and the
 * button signs in a local preview user so the rest of the app can be reviewed.
 */

let state: AuthState = { status: 'signedOut' };
const listeners = new Set<() => void>();
function set(next: AuthState) {
  state = next;
  for (const l of listeners) l();
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export class AuthError extends Error {}

export async function signInWithGoogle(): Promise<boolean> {
  set({ status: 'signedIn', user: { uid: 'web-preview', name: 'Preview user', email: null, photo: null } });
  return true;
}

export async function signOut() {
  set({ status: 'signedOut' });
}
