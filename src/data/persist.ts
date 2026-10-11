import { requireOptionalNativeModule } from 'expo';

type KV = { getItemSync(key: string): string | null; setItemSync(key: string, value: string): void };

/**
 * On-device storage: SQLite key-value store, synchronous and safe offline.
 * Falls back to memory when the binary lacks ExpoSQLite (e.g. an older dev build),
 * so the app still runs; data then resets on reload until the binary is rebuilt.
 */
const hasSQLite = requireOptionalNativeModule('ExpoSQLite') != null;
const memory = new Map<string, string>();
const Storage: KV = hasSQLite
  ? // Lazy require: importing kv-store eagerly throws when the native module is absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-sqlite/kv-store').default
  : {
      getItemSync: (key) => memory.get(key) ?? null,
      setItemSync: (key, value) => void memory.set(key, value),
    };

if (!hasSQLite) {
  console.warn('ExpoSQLite native module missing: using in-memory storage. Rebuild the dev client to persist data.');
}

export const persist = {
  get: (key: string) => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
};
