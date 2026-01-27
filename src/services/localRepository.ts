/**
 * Local Repository - Offline-First Data Store
 * 
 * This is the SINGLE SOURCE OF TRUTH for all app data.
 * All forms save to this repository.
 * All data reads come from this repository.
 * Data syncs to Redis once daily.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BusinessProfile, Reward, Campaign, Customer, BusinessRecord } from '../types';

const REPOSITORY_KEYS = {
  BUSINESS_PROFILE: 'local_repo:business_profile',
  REWARDS: 'local_repo:rewards',
  CAMPAIGNS: 'local_repo:campaigns',
  CUSTOMERS: 'local_repo:customers',
  SYNC_METADATA: 'local_repo:sync_metadata',
  LAST_SYNC: 'local_repo:last_sync',
  CURRENT_BUSINESS_ID: 'local_repo:current_business_id', // Track which business the primary repo belongs to
  REWARDS_TRASH: 'local_repo:rewards_trash', // Trash folder for deleted rewards
} as const;

// Archived repository key pattern: archived_repo:{businessId}:{key}
const getArchivedKey = (businessId: string, key: string): string => {
  return `archived_repo:${businessId}:${key}`;
};

/**
 * Sync metadata for tracking changes
 */
interface SyncMetadata {
  lastSyncedAt: string | null;
  lastDownloadedAt: string | null;
  hasUnsyncedChanges: boolean;
  version: number;
  lastModified: string | null; // Top-level timestamp: last time ANY part of repository was updated
}

/**
 * Get sync metadata
 * Timestamp (lastModified) is ONLY set on create/edit in the app or admin server-side — never fabricated here.
 * If missing, it stays null. Sync logic must not treat null as "newer" (e.g. never upload based on null).
 */
export const getSyncMetadata = async (): Promise<SyncMetadata> => {
  try {
    const data = await AsyncStorage.getItem(REPOSITORY_KEYS.SYNC_METADATA);
    if (data) {
      const metadata = JSON.parse(data);
      return metadata;
    }
  } catch (error) {
    console.error('Error getting sync metadata:', error);
  }
  const initialMetadata: SyncMetadata = {
    lastSyncedAt: null,
    lastDownloadedAt: null,
    hasUnsyncedChanges: false,
    version: 0,
    lastModified: null,
  };
  try {
    await AsyncStorage.setItem(REPOSITORY_KEYS.SYNC_METADATA, JSON.stringify(initialMetadata));
  } catch (e) {
    console.error('Error initializing sync metadata:', e);
  }
  return initialMetadata;
};

/**
 * Update sync metadata
 * lastModified is only altered on create/edit (or when storing received Redis timestamp after download). Never fabricated.
 */
export const updateSyncMetadata = async (updates: Partial<SyncMetadata>): Promise<void> => {
  try {
    const current = await getSyncMetadata();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(REPOSITORY_KEYS.SYNC_METADATA, JSON.stringify(updated));
    console.log(`✅ [REPOSITORY] Sync metadata updated - lastModified: ${updated.lastModified ?? 'null'}`);
  } catch (error) {
    console.error('Error updating sync metadata:', error);
    throw error;
  }
};

/**
 * Mark repository as having unsynced changes and update lastModified timestamp.
 * Only place we set lastModified to "now": create/edit in the business app (or admin server-side). Nowhere else.
 */
const markDirty = async (): Promise<void> => {
  const now = new Date().toISOString();
  console.log(`[REPOSITORY] Marking dirty with timestamp: ${now}`);
  await updateSyncMetadata({
    hasUnsyncedChanges: true,
    lastModified: now,
  });
};

/**
 * BUSINESS PROFILE OPERATIONS
 */
export const businessRepository = {
  /**
   * Save business profile to local repository
   * IMMEDIATELY writes to Redis after saving locally
   */
  save: async (profile: BusinessProfile, skipMarkDirty: boolean = false): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.BUSINESS_PROFILE, JSON.stringify(profile));
      // ONLY update timestamp if this is a user action (create/edit/submit), NOT during downloads
      if (!skipMarkDirty) {
        await markDirty();
      }
      console.log('✅ Business profile saved to local repository');
      
      // NO immediate Redis write - Redis writes ONLY happen on:
      // 1. Manual sync
      // 2. Logout
      // 3. Login update check
      // This ensures business profile, rewards, and campaigns all sync together
    } catch (error) {
      console.error('Error saving business profile:', error);
      throw error;
    }
  },

  /**
   * Get business profile from local repository
   */
  get: async (): Promise<BusinessProfile | null> => {
    try {
      const data = await AsyncStorage.getItem(REPOSITORY_KEYS.BUSINESS_PROFILE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error getting business profile:', error);
    }
    return null;
  },

  /**
   * Update business profile (partial update)
   */
  update: async (updates: Partial<BusinessProfile>): Promise<void> => {
    const current = await businessRepository.get();
    if (!current) {
      throw new Error('Business profile not found in repository');
    }
    const now = new Date().toISOString();
    const updated = { ...current, ...updates, updatedAt: now };
    await businessRepository.save(updated);
    // Top-level timestamp is updated by markDirty() in save()
  },
};

/**
 * REWARDS OPERATIONS
 */
export const rewardsRepository = {
  /**
   * Save all rewards to local repository
   */
  saveAll: async (rewards: Reward[], skipMarkDirty: boolean = false): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.REWARDS, JSON.stringify(rewards));
      if (!skipMarkDirty) {
        await markDirty(); // Updates top-level lastModified timestamp
      }
      console.log(`✅ ${rewards.length} rewards saved to local repository`);
    } catch (error) {
      console.error('Error saving rewards:', error);
      throw error;
    }
  },

  /**
   * Get all rewards from local repository
   * Validates that items are actually rewards (not campaigns)
   */
  getAll: async (): Promise<Reward[]> => {
    try {
      const data = await AsyncStorage.getItem(REPOSITORY_KEYS.REWARDS);
      if (data) {
        const parsed = JSON.parse(data);
        // Return all rewards as-is - no validation/filtering needed
        // Rewards and campaigns are discrete entities stored separately
        return parsed || [];
      }
    } catch (error) {
      console.error('Error getting rewards:', error);
    }
    return [];
  },

  /**
   * Get single reward by ID
   */
  getById: async (rewardId: string): Promise<Reward | null> => {
    const rewards = await rewardsRepository.getAll();
    return rewards.find(r => r.id === rewardId) || null;
  },

  /**
   * Add or update a reward
   * IMMEDIATELY writes to Redis after saving locally
   */
  save: async (reward: Reward): Promise<void> => {
    const rewards = await rewardsRepository.getAll();
    const index = rewards.findIndex(r => r.id === reward.id);
    const now = new Date().toISOString();
    
    if (index >= 0) {
      rewards[index] = { ...reward, updatedAt: now };
    } else {
      rewards.push({ ...reward, createdAt: now, updatedAt: now });
    }
    
    // saveAll() will call markDirty() which updates top-level lastModified timestamp
    await rewardsRepository.saveAll(rewards);
    
    // NO IMMEDIATE REDIS WRITE - Redis writes only happen on sync, logout, or login check
    // This ensures the local timestamp is newer than Redis, triggering a sync
  },

  /**
   * Delete a reward - moves to trash and marks as inactive
   * NO REDIS activity - only local repository changes
   */
  delete: async (rewardId: string): Promise<void> => {
    console.log(`🗑️ [REPOSITORY] Deleting reward: ${rewardId}`);
    const rewards = await rewardsRepository.getAll();
    const rewardToDelete = rewards.find(r => r.id === rewardId);
    
    if (!rewardToDelete) {
      console.warn(`⚠️ [REPOSITORY] Reward ${rewardId} not found for deletion`);
      return;
    }
    
    // Mark reward as inactive instead of removing it
    const now = new Date().toISOString();
    rewardToDelete.isActive = false;
    rewardToDelete.updatedAt = now;
    
    // Move to trash folder - inline logic to avoid circular reference
    let trashRewards: Reward[] = [];
    try {
      const trashData = await AsyncStorage.getItem(REPOSITORY_KEYS.REWARDS_TRASH);
      if (trashData) {
        trashRewards = JSON.parse(trashData);
      }
    } catch (error) {
      console.error('[REPOSITORY] Error reading trash:', error);
    }
    
    const existingTrashIndex = trashRewards.findIndex(r => r.id === rewardId);
    if (existingTrashIndex >= 0) {
      trashRewards[existingTrashIndex] = rewardToDelete;
    } else {
      trashRewards.push(rewardToDelete);
    }
    
    // Save trash folder
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.REWARDS_TRASH, JSON.stringify(trashRewards));
      console.log(`✅ [REPOSITORY] Reward "${rewardToDelete.name}" moved to trash`);
    } catch (error) {
      console.error('[REPOSITORY] Error saving to trash:', error);
    }
    
    // Update the reward in main rewards list (mark as inactive)
    const updatedRewards = rewards.map(r => r.id === rewardId ? rewardToDelete : r);
    await rewardsRepository.saveAll(updatedRewards);
    
    // Mark repository as dirty
    await markDirty();
    
    console.log(`✅ [REPOSITORY] Reward "${rewardToDelete.name}" marked as inactive and moved to trash`);
  },

  /**
   * Get all active rewards (isActive: true)
   */
  getActive: async (): Promise<Reward[]> => {
    const rewards = await rewardsRepository.getAll();
    return rewards.filter(r => r.isActive !== false); // Include rewards where isActive is undefined or true
  },

  /**
   * Get all rewards from trash
   */
  getTrash: async (): Promise<Reward[]> => {
    try {
      const data = await AsyncStorage.getItem(REPOSITORY_KEYS.REWARDS_TRASH);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[REPOSITORY] Error getting trash:', error);
    }
    return [];
  },
};

/**
 * CAMPAIGNS OPERATIONS
 */
export const campaignsRepository = {
  /**
   * Save all campaigns to local repository
   */
  saveAll: async (campaigns: Campaign[], skipMarkDirty: boolean = false): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
      if (!skipMarkDirty) {
        await markDirty(); // Updates top-level lastModified timestamp
      }
      // Only log if not skipping dirty (to avoid duplicate logs)
      if (!skipMarkDirty) {
        console.log(`✅ [REPOSITORY] ${campaigns.length} campaigns saved to local repository`);
      }
    } catch (error) {
      console.error('Error saving campaigns:', error);
      throw error;
    }
  },

  /**
   * Get all campaigns from local repository
   * Validates that items are actually campaigns (not rewards)
   */
  getAll: async (): Promise<Campaign[]> => {
    try {
      const data = await AsyncStorage.getItem(REPOSITORY_KEYS.CAMPAIGNS);
      if (data) {
        const parsed = JSON.parse(data);
        // Return all campaigns as-is - no validation/filtering needed
        // Campaigns and rewards are discrete entities stored separately
        return parsed || [];
      }
    } catch (error) {
      console.error('Error getting campaigns:', error);
    }
    return [];
  },

  /**
   * Get single campaign by ID
   */
  getById: async (campaignId: string): Promise<Campaign | null> => {
    const campaigns = await campaignsRepository.getAll();
    return campaigns.find(c => c.id === campaignId) || null;
  },

  /**
   * Add or update a campaign
   * Saves locally only - Redis writes happen ONLY on sync, logout, or login update check
   */
  save: async (campaign: Campaign): Promise<void> => {
    const campaigns = await campaignsRepository.getAll();
    const index = campaigns.findIndex(c => c.id === campaign.id);
    const now = new Date().toISOString();
    const isEdit = index >= 0;
    
    if (isEdit) {
      campaigns[index] = { ...campaign, updatedAt: now };
      console.log(`✅ [REPOSITORY] Updating campaign "${campaign.name}" (${campaign.id}) in local repository`);
    } else {
      campaigns.push({ ...campaign, createdAt: now, updatedAt: now });
      console.log(`✅ [REPOSITORY] Adding new campaign "${campaign.name}" (${campaign.id}) to local repository`);
    }
    
    // saveAll() will call markDirty() which updates top-level lastModified timestamp
    await campaignsRepository.saveAll(campaigns);
    console.log(`✅ [REPOSITORY] Saved ${campaigns.length} campaigns total (${isEdit ? 'updated' : 'created'} 1 campaign)`);
    
    // NO immediate Redis write - Redis writes ONLY happen on:
    // 1. Manual sync
    // 2. Logout
    // 3. Login update check
    // This applies to both creates and edits
  },

  /**
   * Delete a campaign
   */
  delete: async (campaignId: string): Promise<void> => {
    const campaigns = await campaignsRepository.getAll();
    const filtered = campaigns.filter(c => c.id !== campaignId);
    await campaignsRepository.saveAll(filtered);
  },
};

/**
 * CUSTOMERS OPERATIONS
 */
export const customersRepository = {
  /**
   * Save all customers to local repository
   */
  saveAll: async (customers: Customer[], skipMarkDirty: boolean = false): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CUSTOMERS, JSON.stringify(customers));
      if (!skipMarkDirty) {
        await markDirty(); // Updates top-level lastModified timestamp
      }
      console.log(`✅ ${customers.length} customers saved to local repository`);
    } catch (error) {
      console.error('Error saving customers:', error);
      throw error;
    }
  },

  /**
   * Get all customers from local repository
   */
  getAll: async (): Promise<Customer[]> => {
    try {
      const data = await AsyncStorage.getItem(REPOSITORY_KEYS.CUSTOMERS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error getting customers:', error);
    }
    return [];
  },

  /**
   * Get single customer by ID
   */
  getById: async (customerId: string): Promise<Customer | null> => {
    const customers = await customersRepository.getAll();
    return customers.find(c => c.id === customerId) || null;
  },

  /**
   * Add or update a customer
   */
  save: async (customer: Customer): Promise<void> => {
    const customers = await customersRepository.getAll();
    const index = customers.findIndex(c => c.id === customer.id);
    
    if (index >= 0) {
      customers[index] = customer;
    } else {
      customers.push(customer);
    }
    
    await customersRepository.saveAll(customers);
  },

  /**
   * Delete a customer
   */
  delete: async (customerId: string): Promise<void> => {
    const customers = await customersRepository.getAll();
    const filtered = customers.filter(c => c.id !== customerId);
    await customersRepository.saveAll(filtered);
  },
};

/**
 * Check if local repository exists (has business profile)
 */
export const repositoryExists = async (): Promise<boolean> => {
  try {
    const profile = await businessRepository.get();
    return profile !== null;
  } catch (error) {
    console.error('Error checking repository existence:', error);
    return false;
  }
};

/**
 * Check if local repository matches the given businessId
 */
export const repositoryMatchesBusiness = async (businessId: string): Promise<boolean> => {
  try {
    const profile = await businessRepository.get();
    if (!profile) {
      return false;
    }
    return profile.id === businessId;
  } catch (error) {
    console.error('Error checking repository business match:', error);
    return false;
  }
};

/**
 * Get the businessId that the current primary repository belongs to
 */
export const getCurrentRepositoryBusinessId = async (): Promise<string | null> => {
  try {
    const businessId = await AsyncStorage.getItem(REPOSITORY_KEYS.CURRENT_BUSINESS_ID);
    return businessId;
  } catch (error) {
    console.error('Error getting current repository business ID:', error);
    return null;
  }
};

/**
 * Set the businessId for the current primary repository
 */
const setCurrentRepositoryBusinessId = async (businessId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REPOSITORY_KEYS.CURRENT_BUSINESS_ID, businessId);
  } catch (error) {
    console.error('Error setting current repository business ID:', error);
  }
};

/**
 * Archive the current primary repository for a specific businessId
 * Archives the primary repository and clears it to make room for new primary
 */
export const archiveRepository = async (businessId: string): Promise<void> => {
  try {
    console.log(`📦 [ARCHIVE] Archiving repository for business: ${businessId}`);
    
    // Get all current repository data
    const profile = await businessRepository.get();
    const rewards = await rewardsRepository.getAll();
    const campaigns = await campaignsRepository.getAll();
    const customers = await customersRepository.getAll();
    const syncMetadata = await getSyncMetadata();
    
    if (!profile) {
      console.log('⚠️ [ARCHIVE] No repository to archive');
      return;
    }
    
    // Store each piece in archived location
    await AsyncStorage.setItem(getArchivedKey(businessId, 'business_profile'), JSON.stringify(profile));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'rewards'), JSON.stringify(rewards));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'campaigns'), JSON.stringify(campaigns));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'customers'), JSON.stringify(customers));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'sync_metadata'), JSON.stringify(syncMetadata));
    
    // Clear primary repository after archiving (to make room for new primary)
    await AsyncStorage.multiRemove([
      REPOSITORY_KEYS.BUSINESS_PROFILE,
      REPOSITORY_KEYS.REWARDS,
      REPOSITORY_KEYS.CAMPAIGNS,
      REPOSITORY_KEYS.CUSTOMERS,
      REPOSITORY_KEYS.SYNC_METADATA,
      REPOSITORY_KEYS.LAST_SYNC,
      REPOSITORY_KEYS.CURRENT_BUSINESS_ID,
    ]);
    
    console.log(`✅ [ARCHIVE] Repository archived for business: ${businessId} and primary repository cleared`);
  } catch (error) {
    console.error('❌ [ARCHIVE] Error archiving repository:', error);
    throw error;
  }
};

/**
 * Check if archived repository exists for a specific businessId
 */
export const archivedRepositoryExists = async (businessId: string): Promise<boolean> => {
  try {
    const archivedProfile = await AsyncStorage.getItem(getArchivedKey(businessId, 'business_profile'));
    return archivedProfile !== null;
  } catch (error) {
    console.error('Error checking archived repository existence:', error);
    return false;
  }
};

/**
 * Restore archived repository for a specific businessId to primary repository
 */
export const restoreArchivedRepository = async (businessId: string): Promise<void> => {
  try {
    console.log(`📥 [RESTORE] Restoring archived repository for business: ${businessId}`);
    
    // Check if archived repository exists
    const hasArchived = await archivedRepositoryExists(businessId);
    if (!hasArchived) {
      throw new Error(`No archived repository found for business: ${businessId}`);
    }
    
    // Get archived data
    const archivedProfile = await AsyncStorage.getItem(getArchivedKey(businessId, 'business_profile'));
    const archivedRewards = await AsyncStorage.getItem(getArchivedKey(businessId, 'rewards'));
    const archivedCampaigns = await AsyncStorage.getItem(getArchivedKey(businessId, 'campaigns'));
    const archivedCustomers = await AsyncStorage.getItem(getArchivedKey(businessId, 'customers'));
    const archivedSyncMetadata = await AsyncStorage.getItem(getArchivedKey(businessId, 'sync_metadata'));
    
    // Restore to primary repository
    if (archivedProfile) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.BUSINESS_PROFILE, archivedProfile);
    }
    if (archivedRewards) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.REWARDS, archivedRewards);
    }
    if (archivedCampaigns) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CAMPAIGNS, archivedCampaigns);
    }
    if (archivedCustomers) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CUSTOMERS, archivedCustomers);
    }
    if (archivedSyncMetadata) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.SYNC_METADATA, archivedSyncMetadata);
    }
    
    // Set current business ID
    await setCurrentRepositoryBusinessId(businessId);
    
    console.log(`✅ [RESTORE] Repository restored for business: ${businessId}`);
  } catch (error) {
    console.error('❌ [RESTORE] Error restoring archived repository:', error);
    throw error;
  }
};

/**
 * Get local repository last update timestamp
 * Returns the top-level lastModified timestamp from sync metadata
 * This timestamp indicates when ANY part of the repository was last updated
 */
/**
 * Get local repository timestamp
 * CRITICAL: Returns the lastModified timestamp from sync metadata
 * This is the timestamp that markDirty() updates when any entity is saved
 * NOT the business profile's updatedAt (which is only updated when profile changes)
 */
export const getLocalRepositoryTimestamp = async (): Promise<string | null> => {
  try {
    const metadata = await getSyncMetadata();
    return metadata.lastModified || null;
  } catch (error) {
    console.error('Error getting local repository timestamp:', error);
    return null;
  }
};

/**
 * Get database repository timestamp from API
 * Returns the business.updatedAt timestamp which represents the last time ANY part 
 * of the repository was updated in Redis (this is the top-level repository timestamp)
 */
export const getDatabaseRecordTimestamp = async (businessId: string, apiBaseUrl: string = 'https://api.cannycarrot.com'): Promise<string | null> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const businessData = result.data;
        // Business.updatedAt is the top-level repository timestamp in Redis
        // It should be updated whenever any entity (rewards, campaigns, customers) is modified
        return businessData.updatedAt || businessData.profile?.updatedAt || null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting database repository timestamp:', error);
    return null;
  }
};

/**
 * Compare timestamps - returns true if local is older than database
 */
export const isLocalOlderThanDatabase = (localTimestamp: string | null, dbTimestamp: string | null): boolean => {
  if (!localTimestamp || !dbTimestamp) {
    // If either is missing, consider local as older to trigger refresh
    return true;
  }
  
  try {
    const localDate = new Date(localTimestamp);
    const dbDate = new Date(dbTimestamp);
    return localDate < dbDate;
  } catch (error) {
    console.error('Error comparing timestamps:', error);
    // On error, assume local is older to trigger refresh
    return true;
  }
};

/**
 * DOWNLOAD ALL DATA FROM REDIS (First Login or Refresh)
 */
export const downloadAllData = async (businessId: string, apiBaseUrl: string = 'https://api.cannycarrot.com'): Promise<void> => {
  console.log('📥 [REPOSITORY] Starting data download from Redis for business:', businessId);
  
  try {
    // 1. Download business profile and capture repository timestamp
    let dbRepositoryTimestamp: string | null = null;
    const businessResponse = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}`);
    if (businessResponse.ok) {
      const businessResult = await businessResponse.json();
      if (businessResult.success && businessResult.data) {
        const businessData = businessResult.data;
        // Capture business.updatedAt as the top-level repository timestamp
        // This represents when ANY part of the repository was last updated in Redis
        dbRepositoryTimestamp = businessData.updatedAt || businessData.profile?.updatedAt || null;
        
        const profile: BusinessProfile = {
          id: businessData.id || businessId,
          name: businessData.name || businessData.profile?.name || '',
          email: businessData.email || businessData.profile?.email || '',
          phone: businessData.phone || businessData.profile?.phone || '',
          addressLine1: businessData.address?.line1 || businessData.profile?.addressLine1 || '',
          addressLine2: businessData.address?.line2 || businessData.profile?.addressLine2 || '',
          city: businessData.address?.city || businessData.profile?.city || '',
          postcode: businessData.address?.postcode || businessData.profile?.postcode || '',
          country: businessData.profile?.country || 'UK',
          logo: businessData.logo || businessData.profile?.logo,
          website: businessData.profile?.website,
          socialMedia: businessData.profile?.socialMedia,
          category: businessData.category || businessData.profile?.category,
          description: businessData.description || businessData.profile?.description,
          companyNumber: businessData.profile?.companyNumber,
          createdAt: businessData.createdAt || businessData.profile?.createdAt,
          updatedAt: businessData.updatedAt || businessData.profile?.updatedAt,
          // IMPORTANT: Include products and actions from Redis
          products: businessData.products || businessData.profile?.products || [],
          actions: businessData.actions || businessData.profile?.actions || [],
        };
        // Save profile without marking as dirty (we're downloading, not modifying)
        await AsyncStorage.setItem(REPOSITORY_KEYS.BUSINESS_PROFILE, JSON.stringify(profile));
        console.log('✅ Business profile downloaded');
      }
    }

    // 2. Download rewards
    // Merge with local state to preserve local deletions (rewards in trash)
    console.log(`📥 [REPOSITORY] Fetching rewards from API...`);
    const rewardsResponse = await fetch(`${apiBaseUrl}/api/v1/rewards?businessId=${businessId}`);
    
    if (rewardsResponse.ok) {
      const rewardsResult = await rewardsResponse.json();
      
      if (rewardsResult.success && Array.isArray(rewardsResult.data)) {
        console.log(`📊 [REPOSITORY] API returned ${rewardsResult.data.length} rewards (DB format)`);
        
        // Get local trash to preserve deletions - don't restore deleted rewards from Redis
        const localTrash = await rewardsRepository.getTrash();
        const deletedRewardIds = new Set(localTrash.map(r => r.id));
        
        // Merge downloaded rewards with local state
        // CRITICAL: Don't restore rewards that are locally deleted (in trash)
        // - If a reward is in local trash, keep it deleted (marked inactive)
        // - Only merge rewards from API that aren't locally deleted
        // - Deduplicate by ID to prevent duplicates
        const mergedRewardsMap = new Map<string, Reward>();
        
        // Add downloaded rewards, but skip ones that are locally deleted
        for (const downloadedReward of rewardsResult.data) {
          if (!deletedRewardIds.has(downloadedReward.id)) {
            // Not locally deleted - add/update from Redis (deduplicate by ID)
            mergedRewardsMap.set(downloadedReward.id, downloadedReward);
          } else {
            // Locally deleted - keep deletion, don't restore from Redis
            console.log(`  🔒 [REPOSITORY] Preserving local deletion, skipping Redis restore: ${downloadedReward.name} (${downloadedReward.id})`);
          }
        }
        
        // Add local deleted rewards back (marked inactive) to preserve deletion state
        for (const deletedReward of localTrash) {
          mergedRewardsMap.set(deletedReward.id, deletedReward);
        }
        
        // Convert map to array (deduplicated by ID)
        const mergedRewards = Array.from(mergedRewardsMap.values());
        
        // Store merged rewards without marking as dirty (we're downloading, not modifying)
        await rewardsRepository.saveAll(mergedRewards, true);
        console.log(`✅ [REPOSITORY] ${mergedRewards.length} rewards merged (${rewardsResult.data.length - localTrash.length} from Redis, ${localTrash.length} preserved deletions)`);
      } else {
        console.log('⚠️ [REPOSITORY] API response invalid - NOT overwriting local rewards');
        // CRITICAL: Don't overwrite local rewards with empty array if API response is invalid
        // This could wipe out local changes that haven't synced yet
        // Only log warning, keep existing local rewards
      }
    } else {
      console.error(`❌ [REPOSITORY] API error ${rewardsResponse.status} - NOT overwriting local rewards`);
      // Don't clear existing rewards on API error - preserve local data
    }

    // 3. Download campaigns
    console.log(`📥 [REPOSITORY] Fetching campaigns from API...`);
    const campaignsResponse = await fetch(`${apiBaseUrl}/api/v1/campaigns?businessId=${businessId}`);
    if (campaignsResponse.ok) {
      const campaignsResult = await campaignsResponse.json();
      console.log(`📊 [REPOSITORY] Campaigns API response:`, {success: campaignsResult.success, dataLength: campaignsResult.data?.length || 0, isArray: Array.isArray(campaignsResult.data)});
      if (campaignsResult.success && Array.isArray(campaignsResult.data)) {
        // Same pattern as rewards - use data as-is, no normalization
        const campaigns = campaignsResult.data.map((campaign: any) => ({
          ...campaign,
          businessId: campaign.businessId || businessId,
        }));
        
        // Save without marking as dirty (we're downloading, not modifying)
        await campaignsRepository.saveAll(campaigns, true);
        console.log(`✅ [REPOSITORY] ${campaigns.length} campaigns downloaded and saved`);
      } else {
        console.warn(`⚠️ [REPOSITORY] Campaigns API response invalid: success=${campaignsResult.success}, isArray=${Array.isArray(campaignsResult.data)}`);
      }
    } else {
      const errorText = await campaignsResponse.text();
      console.error(`❌ [REPOSITORY] Campaigns API error ${campaignsResponse.status}: ${errorText.substring(0, 200)}`);
    }

    // 4. Download customers (members)
    const customersResponse = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}/members`);
    if (customersResponse.ok) {
      const customersResult = await customersResponse.json();
      if (customersResult.success && Array.isArray(customersResult.data)) {
        // Save without marking as dirty (we're downloading, not modifying)
        await customersRepository.saveAll(customersResult.data, true);
        console.log(`✅ ${customersResult.data.length} customers downloaded`);
      }
    } else {
      console.error(`❌ [REPOSITORY] API error ${customersResponse.status} - customers download failed`);
    }

    // DO NOT update timestamp on download - timestamp ONLY changes on user create/edit/submit
    // Just record that we downloaded, but preserve existing timestamp
    await updateSyncMetadata({
      lastDownloadedAt: new Date().toISOString(),
      hasUnsyncedChanges: false,
      // DO NOT update lastModified - it only changes when user creates/edits/submits
    });

    // Set current business ID for this repository
    await setCurrentRepositoryBusinessId(businessId);

    console.log('✅ [REPOSITORY] All data downloaded successfully');
  } catch (error) {
    console.error('❌ [REPOSITORY] Error downloading data:', error);
    throw error;
  }
};

/**
 * GET SYNC STATUS
 */
export const getSyncStatus = async (): Promise<SyncMetadata> => {
  return await getSyncMetadata();
};

/**
 * CLEAR ALL DATA (for testing/logout)
 * Clears primary repository but keeps archived repositories
 */
export const clearRepository = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      REPOSITORY_KEYS.BUSINESS_PROFILE,
      REPOSITORY_KEYS.REWARDS,
      REPOSITORY_KEYS.CAMPAIGNS,
      REPOSITORY_KEYS.CUSTOMERS,
      REPOSITORY_KEYS.SYNC_METADATA,
      REPOSITORY_KEYS.LAST_SYNC,
      REPOSITORY_KEYS.CURRENT_BUSINESS_ID,
    ]);
    console.log('✅ Repository cleared');
  } catch (error) {
    console.error('Error clearing repository:', error);
    throw error;
  }
};

/**
 * DELETE ARCHIVED REPOSITORY (optional cleanup)
 */
export const deleteArchivedRepository = async (businessId: string): Promise<void> => {
  try {
    console.log(`🗑️ [ARCHIVE] Deleting archived repository for business: ${businessId}`);
    await AsyncStorage.multiRemove([
      getArchivedKey(businessId, 'business_profile'),
      getArchivedKey(businessId, 'rewards'),
      getArchivedKey(businessId, 'campaigns'),
      getArchivedKey(businessId, 'customers'),
      getArchivedKey(businessId, 'sync_metadata'),
    ]);
    console.log(`✅ [ARCHIVE] Archived repository deleted for business: ${businessId}`);
  } catch (error) {
    console.error('❌ [ARCHIVE] Error deleting archived repository:', error);
    throw error;
  }
};



