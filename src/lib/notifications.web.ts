/** Web previews have no push: everything here is a no-op. */

export type PushStatus = 'unavailable' | 'undetermined' | 'denied' | 'granted';

export const CHANNELS = {
  reminders: { name: 'Reminders', description: 'Vaccines due, daily tasks and feed running low' },
  alerts: { name: 'Urgent alerts', description: 'Sudden losses, heat stress and sick birds' },
} as const;

export function usePushStatus(): PushStatus {
  return 'unavailable';
}

export async function registerForPush(_uid: string, _opts?: { ask?: boolean }): Promise<PushStatus> {
  return 'unavailable';
}

export async function unregisterFromPush(_uid: string) {}

export async function enablePush(_uid: string) {}

export function usePushNotifications(_uid: string | undefined, _ready: boolean) {}
