/**
 * Sync Metadata Types
 * 
 * All entities include _sync metadata for conflict resolution
 */

export interface SyncMetadata {
  version: number; // Increments on each write
  lastModified: string; // ISO 8601 timestamp
  deviceId: string; // Device that made the change
  isDirty: boolean; // Has local changes not synced to Redis
  createdAt: string; // ISO 8601 timestamp
}

/**
 * Base entity with sync metadata
 */
export interface SyncableEntity {
  id: string;
  _sync: SyncMetadata;
}

/**
 * Sync operation types
 */
export type SyncOperationType = 'create' | 'update' | 'delete';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: string; // 'business', 'customer', 'reward', 'campaign'
  entityId: string;
  data?: any; // Entity data (for create/update)
  timestamp: number;
  retries?: number;
}

/**
 * Sync status
 */
export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  isSyncing: boolean;
  lastError: string | null;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  resolved: boolean;
  localWins: boolean; // true if local version was kept
  redisWins: boolean; // true if Redis version was kept
  merged: boolean; // true if versions were merged
}

















