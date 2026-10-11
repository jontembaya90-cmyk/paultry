import type { FarmState, Settings } from './types';

/**
 * How a farm is laid out in Firestore. Keep `firestore.rules` in step with this file.
 *
 *   users/{uid}                      { farmId, name, email, updatedAt }
 *   farms/{farmId}                   farm-level fields below + ownerId, memberIds, schemaVersion
 *   farms/{farmId}/{collection}/{id} one document per record, `id` matches the document id
 *
 * A farm's id is its owner's uid, so the owner never needs an extra lookup.
 */

/** Bump when the stored shape changes, and add a step to `migrations.ts`. */
export const SCHEMA_VERSION = 1;

/** Every record list in FarmState, each stored as a subcollection of the farm. */
export const COLLECTIONS = [
  'people',
  'houses',
  'flocks',
  'eggs',
  'losses',
  'feed',
  'water',
  'weights',
  'vaccinations',
  'treatments',
  'stocks',
  'suppliers',
  'tasks',
  'customers',
  'sales',
  'expenses',
  'incubators',
  'notes',
  'photos',
  'visitors',
] as const satisfies readonly (keyof FarmState)[];
export type CollectionName = (typeof COLLECTIONS)[number];

/** Farm-wide values kept on the farm document itself. */
export const FARM_FIELDS = ['farmName', 'farmTypes', 'onboarded', 'biosecurity', 'dismissedAlerts', 'coopClosed'] as const satisfies readonly (keyof FarmState)[];

/** Settings every phone on the farm shares. The rest (theme, worker mode, language) stay per device. */
export const SHARED_SETTINGS = ['currency', 'weightUnit', 'tempUnit'] as const satisfies readonly (keyof Settings)[];
