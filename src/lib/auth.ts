import { useSyncExternalStore } from 'react';

import googleServices from '../../google-services.json';

/**
 * Sign-in with Google, backed by Firebase Auth. The Google account picker (Credential
 * Manager on Android) hands back an ID token, which Firebase exchanges for a session that
 * persists on the device, so farmers stay signed in offline.
 */

export type AuthUser = { uid: string; name: string | null; email: string | null; photo: string | null };
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: AuthUser }
  /** This binary was built before the auth native modules were added. */
  | { status: 'unavailable' };

type FirebaseAuth = typeof import('@react-native-firebase/auth');
type GoogleSignIn = typeof import('@react-native-google-signin/google-signin');

type ServicesFile = { client: { oauth_client: { client_id: string; client_type: number }[] }[] };

/** The Web client ID Firebase creates when Google sign-in is enabled (client_type 3). */
const webClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  (googleServices as ServicesFile).client.flatMap((c) => c.oauth_client).find((o) => o.client_type === 3)?.client_id;

let state: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();
function set(next: AuthState) {
  state = next;
  for (const l of listeners) l();
}

let fb: FirebaseAuth | undefined;
let google: GoogleSignIn | undefined;
try {
  // Lazy: both packages throw at import when the native module isn't in the binary.
  /* eslint-disable @typescript-eslint/no-require-imports */
  fb = require('@react-native-firebase/auth') as FirebaseAuth;
  google = require('@react-native-google-signin/google-signin') as GoogleSignIn;
  /* eslint-enable @typescript-eslint/no-require-imports */
  if (webClientId) google.GoogleSignin.configure({ webClientId });
  fb.onAuthStateChanged(fb.getAuth(), (u) =>
    set(u ? { status: 'signedIn', user: { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL } } : { status: 'signedOut' }),
  );
} catch {
  fb = google = undefined;
  console.warn('Google sign-in native modules missing: skipping sign-in. Rebuild the dev client to enable it.');
  set({ status: 'unavailable' });
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

/** A sign-in failure with a message written for the farmer, not the developer. */
export class AuthError extends Error {}

/** Opens the Google account picker. Resolves `false` if the farmer backs out. */
export async function signInWithGoogle(): Promise<boolean> {
  if (!fb || !google) throw new AuthError('Sign-in isn’t available in this build of ROOST.');
  if (!webClientId) {
    throw new AuthError('Google sign-in isn’t set up yet. Enable Google in Firebase Authentication and download a fresh google-services.json.');
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = google;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return false;
    if (!res.data.idToken) throw new AuthError('Google didn’t return a sign-in token. Please try again.');
    await fb.signInWithCredential(fb.getAuth(), fb.GoogleAuthProvider.credential(res.data.idToken));
    return true;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    const code = isErrorWithCode(e) ? String(e.code) : (e as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) return false;
    if (code === statusCodes.IN_PROGRESS) throw new AuthError('Sign-in is already open.');
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new AuthError('Google Play services needs an update on this phone.');
    if (code === 'auth/network-request-failed') throw new AuthError('No connection. Signing in needs signal once; after that ROOST works offline.');
    // Android DEVELOPER_ERROR: this build's SHA-1 isn't registered in Firebase.
    if (code === '10' || code === 'DEVELOPER_ERROR') throw new AuthError('This build isn’t registered with Google yet. Add its SHA-1 fingerprint in Firebase.');
    console.error('Google sign-in failed', e);
    throw new AuthError('Couldn’t sign in with Google. Please try again.');
  }
}

export async function signOut() {
  if (!fb || !google) return;
  // Clear the Google session too, so the next sign-in offers the account picker again.
  await google.GoogleSignin.signOut().catch(() => {});
  await fb.signOut(fb.getAuth());
}
