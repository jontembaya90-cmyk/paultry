import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Linking } from 'react-native';

import { uid as makeId } from '@/data/format';
import { persist } from '@/data/persist';

/**
 * Push notifications over Firebase Cloud Messaging.
 *
 * Each signed-in phone stores its FCM token at users/{uid}/devices/{deviceId}. A server
 * (Cloud Functions or the Admin SDK) reaches everyone on a farm through
 * farms/{farmId}.memberIds → users/{uid}/devices, and sends with FCM's HTTP v1 API.
 *
 * Payload contract for senders:
 *   android.notification.channel_id  'reminders' | 'alerts'  (see CHANNELS)
 *   data.url                         a ROOST route, e.g. '/health'. Tapping opens it.
 */

type NotificationsModule = typeof import('expo-notifications');
type Firestore = typeof import('@react-native-firebase/firestore');

export type PushStatus = 'unavailable' | 'undetermined' | 'denied' | 'granted';

let N: NotificationsModule | undefined;
let fs: Firestore | undefined;
// Lazy: an older dev build without these native modules must still run.
if (process.env.EXPO_OS === 'android' || process.env.EXPO_OS === 'ios') {
  if (requireOptionalNativeModule('ExpoPushTokenManager')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    N = require('expo-notifications') as NotificationsModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fs = require('@react-native-firebase/firestore') as Firestore;
  } catch {
    fs = undefined;
  }
}

/** Android channels. Farmers can mute reminders without missing urgent alerts. */
export const CHANNELS = {
  reminders: { name: 'Reminders', description: 'Vaccines due, daily tasks and feed running low' },
  alerts: { name: 'Urgent alerts', description: 'Sudden losses, heat stress and sick birds' },
} as const;

// Show notifications that arrive while ROOST is open, too.
N?.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let status: PushStatus = N ? 'undetermined' : 'unavailable';
const listeners = new Set<() => void>();
function setStatus(next: PushStatus) {
  if (next === status) return;
  status = next;
  for (const l of listeners) l();
}

export function usePushStatus(): PushStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

async function ensureChannels(n: NotificationsModule) {
  if (process.env.EXPO_OS !== 'android') return;
  // Android 13+ only shows the permission prompt once a channel exists.
  await n.setNotificationChannelAsync('reminders', { ...CHANNELS.reminders, importance: n.AndroidImportance.DEFAULT });
  await n.setNotificationChannelAsync('alerts', {
    ...CHANNELS.alerts,
    importance: n.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#C2410C',
  });
}

/** A stable id for this install, so each phone keeps one token document. */
function deviceId() {
  let id = persist.get('roost.device.id');
  if (!id) {
    id = makeId('device');
    persist.set('roost.device.id', id);
  }
  return id;
}

let registeredUid: string | undefined;
/** Pushes already acted on, so one tap never opens its screen twice. */
const opened = new Set<string>();
let tokenSub: { remove(): void } | undefined;

function saveToken(uid: string, token: string) {
  if (!fs) return;
  const db = fs.getFirestore();
  // Queued by Firestore when offline, like every other write.
  fs.setDoc(fs.doc(db, 'users', uid, 'devices', deviceId()), {
    token,
    platform: process.env.EXPO_OS,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    updatedAt: fs.serverTimestamp(),
  }).catch((e: unknown) => console.error('Saving push token failed', e));
}

/**
 * Register this phone for pushes for a signed-in account. Asks for permission only when
 * `ask` is set and the farmer hasn't answered yet. Safe to call repeatedly.
 */
export async function registerForPush(uid: string, { ask = false } = {}): Promise<PushStatus> {
  if (!N) return 'unavailable';
  await ensureChannels(N);
  let perm = await N.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain && ask) perm = await N.requestPermissionsAsync();
  const next: PushStatus = perm.granted ? 'granted' : perm.canAskAgain ? 'undetermined' : 'denied';
  setStatus(next);
  if (next !== 'granted') return next;

  try {
    const { data } = await N.getDevicePushTokenAsync();
    if (typeof data === 'string') saveToken(uid, data);
    if (__DEV__) console.log('FCM token:', data);
  } catch (e) {
    // No Play services, or no signal on first launch: the token listener catches up later.
    console.warn('Could not get a push token yet', e);
  }
  if (registeredUid !== uid) {
    tokenSub?.remove();
    // FCM rotates tokens now and then; keep the stored one current.
    tokenSub = N.addPushTokenListener(({ data }) => typeof data === 'string' && saveToken(uid, data));
    registeredUid = uid;
  }
  return next;
}

/** Before sign-out: forget this phone's token so the account's pushes stop arriving here. */
export async function unregisterFromPush(uid: string) {
  tokenSub?.remove();
  tokenSub = undefined;
  registeredUid = undefined;
  const db = fs?.getFirestore();
  // Both need signal to finish. Never hold up sign-out for more than a few seconds.
  await Promise.race([
    Promise.allSettled([
      db && fs!.deleteDoc(fs!.doc(db, 'users', uid, 'devices', deviceId())),
      // Invalidates the FCM token itself, in case the delete above is still queued offline.
      N?.unregisterForNotificationsAsync(),
    ]),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

/** Ask again, or send the farmer to system settings if Android won't show the prompt any more. */
export async function enablePush(uid: string) {
  const result = await registerForPush(uid, { ask: true });
  if (result === 'denied') void Linking.openSettings();
}

/**
 * Keeps pushes registered while signed in: asks once the farm is set up, and re-checks
 * when ROOST comes back from system settings. Also opens the screen a tapped push points to.
 */
export function usePushNotifications(uid: string | undefined, ready: boolean) {
  useEffect(() => {
    if (!uid || !ready || !N) return;
    void registerForPush(uid, { ask: true });
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void registerForPush(uid));
    return () => sub.remove();
  }, [uid, ready]);

  useEffect(() => {
    if (!N || !ready) return;
    const open = (r: import('expo-notifications').NotificationResponse | null) => {
      if (!r || opened.has(r.notification.request.identifier)) return;
      opened.add(r.notification.request.identifier);
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    };
    // The push that launched ROOST from closed.
    open(N.getLastNotificationResponse());
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}
