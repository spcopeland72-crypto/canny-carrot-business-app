/**
 * Sync Manager - Orchestrates offline-first sync with Redis
 * 
 * Handles:
 * - Pulling latest data from Redis
 * - Pushing local changes to Redis
 * - Conflict resolution
 * - Retry logic for failed operations
 */

import { redis, isOnline, isRedisAvailable } from './redis';
import { storage, syncQueue, syncStatus, getDeviceId } from './localStorage';
import type { SyncOperation, SyncStatus, ConflictResolution, SyncMetadata } from '../types/sync';

const SYNC_INTERVAL = 30000; // Sync every 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Add sync metadata to entity
 */
export const addSyncMetadata = <T extends { id: string }>(
  entity: T,
  isDirty: boolean = false
): T & { _sync: SyncMetadata } => {
  const now = new Date().toISOString();
  return {
    ...entity,
    _sync: {
      version: (entity as any)._sync?.version || 0,
      lastModified: now,
      deviceId: getDeviceId(),
      isDirty,
      createdAt: (entity as any)._sync?.createdAt || now,
    },
  };
};

/**
 * Increment version and mark as dirty
 */
export const markDirty = <T extends { _sync: SyncMetadata }>(entity: T): T => {
  return {
    ...entity,
    _sync: {
      ...entity._sync,
      version: entity._sync.version + 1,
      lastModified: new Date().toISOString(),
      isDirty: true,
    },
  };
};

/**
 * Mark entity as synced (not dirty)
 */
export const markSynced = <T extends { _sync: SyncMetadata }>(entity: T): T => {
  return {
    ...entity,
    _sync: {
      ...entity._sync,
      isDirty: false,
    },
  };
};

/**
 * Resolve conflict between local and Redis versions
 */
const resolveConflict = (
  local: any,
  redis: any
): ConflictResolution => {
  const localVersion = local._sync?.version || 0;
  const redisVersion = redis._sync?.version || 0;
  const localTime = new Date(local._sync?.lastModified || 0).getTime();
  const redisTime = new Date(redis._sync?.lastModified || 0).getTime();

  // If versions are equal, use most recent timestamp
  if (localVersion === redisVersion) {
    if (localTime >= redisTime) {
      return { resolved: true, localWins: true, redisWins: false, merged: false };
    } else {
      return { resolved: true, localWins: false, redisWins: true, merged: false };
    }
  }

  // Higher version wins
  if (localVersion > redisVersion) {
    return { resolved: true, localWins: true, redisWins: false, merged: false };
  } else {
    return { resolved: true, localWins: false, redisWins: true, merged: false };
  }
};

/**
 * Sync single entity to Redis
 */
const syncEntityToRedis = async (
  operation: SyncOperation
): Promise<boolean> => {
  try {
    const { entityType, entityId, type, data } = operation;

    if (type === 'delete') {
      // Delete from Redis
      const key = `${entityType}:${entityId}`;
      await redis.del(key);
      
      // Also remove from sets
      if (entityType === 'customer') {
        // Remove from business customers set (need businessId from data)
        // This would need businessId in the operation
      } else if (entityType === 'reward') {
        // Remove from business rewards set
      } else if (entityType === 'campaign') {
        // Remove from business campaigns set
      }
      
      return true;
    }

    // Create or update
    const entity = addSyncMetadata(data, false); // Mark as synced
    const key = `${entityType}:${entityId}`;
    const value = JSON.stringify(entity);
    
    await redis.set(key, value);

    // Add to sets based on entity type
    if (entityType === 'customer' && data.businessId) {
      await redis.sadd(`business:${data.businessId}:customers`, entityId);
    } else if (entityType === 'reward' && data.businessId) {
      await redis.sadd(`business:${data.businessId}:rewards`, entityId);
    } else if (entityType === 'campaign' && data.businessId) {
      await redis.sadd(`business:${data.businessId}:campaigns`, entityId);
    } else if (entityType === 'customerScans' && data.businessId) {
      // Customer scan tracking - update business's customer scan record
      // Key: business:{businessId}:customerScans:{customerId}
      const scanKey = `business:${data.businessId}:customerScans:${data.customerId}`;
      await redis.set(scanKey, JSON.stringify({
        customerId: data.customerId,
        rewardId: data.rewardId,
        campaignId: data.campaignId,
        pointsEarned: data.pointsEarned,
        rewardEarned: data.rewardEarned,
        rewardRedeemed: data.rewardRedeemed,
        lastScanAt: data.lastScanAt,
        action: data.action,
        updatedAt: new Date().toISOString(),
      }));
      // Add customer to business's customer set
      await redis.sadd(`business:${data.businessId}:customers`, data.customerId);
    } else if (entityType === 'businessRecord' && data.profile?.id) {
      // Complete business record
      await redis.sadd('businesses:all', data.profile.id);
    }

    return true;
  } catch (error) {
    console.error(`Failed to sync ${operation.entityType}:${operation.entityId} to Redis:`, error);
    return false;
  }
};

/**
 * Pull entity from Redis and merge with local
 */
const syncEntityFromRedis = async (
  entityType: string,
  entityId: string,
  businessId?: string
): Promise<boolean> => {
  try {
    const key = `${entityType}:${entityId}`;
    const redisValue = await redis.get(key);
    
    if (!redisValue) {
      return false; // Entity doesn't exist in Redis
    }

    const redisEntity = JSON.parse(redisValue);
    
    // Get local version
    const localKey = `${entityType}:${entityId}`;
    const localEntity = await storage.get(localKey);

    if (!localEntity) {
      // No local version, use Redis version
      await storage.set(localKey, redisEntity);
      return true;
    }

    // Resolve conflict
    const resolution = resolveConflict(localEntity, redisEntity);
    
    if (resolution.redisWins) {
      // Use Redis version
      await storage.set(localKey, redisEntity);
    } else if (resolution.localWins && localEntity._sync?.isDirty) {
      // Local has changes, push to Redis
      await syncEntityToRedis({
        id: `${entityType}:${entityId}:${Date.now()}`,
        type: 'update',
        entityType,
        entityId,
        data: localEntity,
        timestamp: Date.now(),
      });
    }

    return true;
  } catch (error) {
    console.error(`Failed to sync ${entityType}:${entityId} from Redis:`, error);
    return false;
  }
};

/**
 * Process sync queue (push local changes to Redis)
 */
const processSyncQueue = async (): Promise<number> => {
  const queue = await syncQueue.getAll();
  if (queue.length === 0) return 0;

  let synced = 0;
  const failed: SyncOperation[] = [];

  for (const operation of queue) {
    const success = await syncEntityToRedis(operation);
    
    if (success) {
      await syncQueue.remove(operation.id);
      synced++;
    } else {
      // Increment retry count
      operation.retries = (operation.retries || 0) + 1;
      
      if (operation.retries < MAX_RETRIES) {
        failed.push(operation);
      } else {
        // Max retries reached, remove from queue (or mark as failed)
        console.error(`Max retries reached for ${operation.entityType}:${operation.entityId}`);
        await syncQueue.remove(operation.id);
      }
    }
  }

  // Update failed operations
  for (const operation of failed) {
    await syncQueue.add(operation);
  }

  return synced;
};

/**
 * Pull latest data from Redis for a business
 */
const pullFromRedis = async (businessId: string): Promise<number> => {
  let pulled = 0;

  try {
    // Pull business profile
    await syncEntityFromRedis('business', businessId);
    pulled++;

    // Pull customers
    const customerIds = await redis.smembers(`business:${businessId}:customers`);
    for (const customerId of customerIds) {
      await syncEntityFromRedis('customer', customerId, businessId);
      pulled++;
    }

    // Pull rewards
    const rewardIds = await redis.smembers(`business:${businessId}:rewards`);
    for (const rewardId of rewardIds) {
      await syncEntityFromRedis('reward', rewardId, businessId);
      pulled++;
    }

    // Pull campaigns
    const campaignIds = await redis.smembers(`business:${businessId}:campaigns`);
    for (const campaignId of campaignIds) {
      await syncEntityFromRedis('campaign', campaignId, businessId);
      pulled++;
    }
  } catch (error) {
    console.error('Failed to pull from Redis:', error);
  }

  return pulled;
};

/**
 * Perform full sync (push queue + pull latest)
 */
export const performSync = async (businessId?: string): Promise<{
  pushed: number;
  pulled: number;
  errors: string[];
}> => {
  if (isSyncing) {
    return { pushed: 0, pulled: 0, errors: ['Sync already in progress'] };
  }

  const redisAvailable = await isRedisAvailable();
  if (!isOnline() || !redisAvailable) {
    await syncStatus.update({ isOnline: false });
    return { pushed: 0, pulled: 0, errors: ['Offline or Redis unavailable'] };
  }

  isSyncing = true;
  await syncStatus.update({ isOnline: true });

  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    // Push local changes to Redis
    pushed = await processSyncQueue();

    // Pull latest from Redis (if businessId provided)
    if (businessId) {
      pulled = await pullFromRedis(businessId);
    }

    await syncStatus.update({ lastSyncTime: Date.now() });
  } catch (error: any) {
    errors.push(error.message || 'Unknown sync error');
    console.error('Sync error:', error);
  } finally {
    isSyncing = false;
  }

  return { pushed, pulled, errors };
};

/**
 * Start automatic sync (runs every SYNC_INTERVAL)
 */
export const startAutoSync = (businessId?: string): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Perform initial sync
  performSync(businessId);

  // Set up interval
  syncInterval = setInterval(() => {
    performSync(businessId);
  }, SYNC_INTERVAL);
};

/**
 * Stop automatic sync
 */
export const stopAutoSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};

/**
 * Get current sync status
 */
export const getSyncStatus = async (): Promise<SyncStatus> => {
  const status = await syncStatus.get();
  return {
    ...status,
    isSyncing,
    lastError: null, // Could be enhanced to track last error
  };
};

/**
 * Queue an operation for sync
 */
export const queueOperation = async (
  type: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  data?: any
): Promise<void> => {
  await syncQueue.add({
    type,
    entityType,
    entityId,
    data,
    timestamp: Date.now(),
  });

  // Try immediate sync if online (fire and forget)
  if (isOnline()) {
    isRedisAvailable().then(redisAvailable => {
      if (redisAvailable) {
        performSync();
      }
    }).catch(() => {
      // Ignore errors, sync will retry later
    });
  }
};

