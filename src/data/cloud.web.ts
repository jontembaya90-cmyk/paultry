/** Web previews keep the farm in the browser only: there is no cloud sync on web. */

export async function startCloudSync(_user: { uid: string; name: string | null; email: string | null }) {}

export function stopCloudSync() {}

export function unsyncedChanges() {
  return 0;
}

export function leaveCloud() {}
