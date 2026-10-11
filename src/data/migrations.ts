import { SCHEMA_VERSION } from './schema';

/**
 * Firestore has no schema, so ROOST versions its data instead. Every farm document carries
 * `schemaVersion`. When the app reads an older farm, it runs the missing steps in order on
 * the farm fields and every record, then writes the upgraded data back.
 *
 * To change the stored shape:
 *   1. Bump SCHEMA_VERSION in schema.ts.
 *   2. Add a step keyed by the version it upgrades *to*, e.g.
 *        2: { record: (name, r) => (name === 'sales' ? { ...r, method: r.method ?? 'cash' } : r) },
 *   3. Update firestore.rules if a collection or field is added.
 * Steps must be safe to run twice: two phones can upgrade the same farm at once.
 */

type Doc = Record<string, unknown>;
type Step = {
  /** Upgrade the farm-level fields. */
  farm?: (farm: Doc) => Doc;
  /** Upgrade one record. Return null to delete it. */
  record?: (collection: string, record: Doc) => Doc | null;
};

/** Version 1 is the first cloud schema: the on-device shape, uploaded as is. */
const steps: Record<number, Step> = {};

export function needsMigration(version: number | undefined) {
  return (version ?? 1) < SCHEMA_VERSION;
}

/** True when the farm was written by a newer app: this phone must not overwrite it. */
export function isFromNewerApp(version: number | undefined) {
  return (version ?? 1) > SCHEMA_VERSION;
}

export function migrateFarm(farm: Doc, from: number | undefined): Doc {
  let out = farm;
  for (let v = (from ?? 1) + 1; v <= SCHEMA_VERSION; v++) out = steps[v]?.farm?.(out) ?? out;
  return out;
}

export function migrateRecord(collection: string, record: Doc, from: number | undefined): Doc | null {
  let out: Doc | null = record;
  for (let v = (from ?? 1) + 1; v <= SCHEMA_VERSION && out; v++) {
    const step = steps[v]?.record;
    if (step) out = step(collection, out);
  }
  return out;
}
