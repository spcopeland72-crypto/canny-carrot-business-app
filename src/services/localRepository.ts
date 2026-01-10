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
}

/**
 * Get sync metadata
 */
export const getSyncMetadata = async (): Promise<SyncMetadata> => {
  try {
    const data = await AsyncStorage.getItem(REPOSITORY_KEYS.SYNC_METADATA);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error getting sync metadata:', error);
  }
  return {
    lastSyncedAt: null,
    lastDownloadedAt: null,
    hasUnsyncedChanges: false,
    version: 0,
  };
};

/**
 * Update sync metadata
 */
export const updateSyncMetadata = async (updates: Partial<SyncMetadata>): Promise<void> => {
  try {
    const current = await getSyncMetadata();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(REPOSITORY_KEYS.SYNC_METADATA, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating sync metadata:', error);
  }
};

/**
 * Mark repository as having unsynced changes
 */
const markDirty = async (): Promise<void> => {
  await updateSyncMetadata({ hasUnsyncedChanges: true });
};

/**
 * BUSINESS PROFILE OPERATIONS
 */
export const businessRepository = {
  /**
   * Save business profile to local repository
   */
  save: async (profile: BusinessProfile): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.BUSINESS_PROFILE, JSON.stringify(profile));
      await markDirty();
      console.log('✅ Business profile saved to local repository');
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
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await businessRepository.save(updated);
  },
};

/**
 * REWARDS OPERATIONS
 */
export const rewardsRepository = {
  /**
   * Save all rewards to local repository
   */
  saveAll: async (rewards: Reward[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.REWARDS, JSON.stringify(rewards));
      await markDirty();
      console.log(`✅ ${rewards.length} rewards saved to local repository`);
    } catch (error) {
      console.error('Error saving rewards:', error);
      throw error;
    }
  },

  /**
   * Get all rewards from local repository
   */
  getAll: async (): Promise<Reward[]> => {
    try {
      const data = await AsyncStorage.getItem(REPOSITORY_KEYS.REWARDS);
      if (data) {
        return JSON.parse(data);
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
   */
  save: async (reward: Reward): Promise<void> => {
    const rewards = await rewardsRepository.getAll();
    const index = rewards.findIndex(r => r.id === reward.id);
    
    if (index >= 0) {
      rewards[index] = { ...reward, updatedAt: new Date().toISOString() };
    } else {
      rewards.push({ ...reward, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    await rewardsRepository.saveAll(rewards);
  },

  /**
   * Delete a reward
   */
  delete: async (rewardId: string): Promise<void> => {
    const rewards = await rewardsRepository.getAll();
    const filtered = rewards.filter(r => r.id !== rewardId);
    await rewardsRepository.saveAll(filtered);
  },
};

/**
 * CAMPAIGNS OPERATIONS
 */
export const campaignsRepository = {
  /**
   * Save all campaigns to local repository
   */
  saveAll: async (campaigns: Campaign[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
      await markDirty();
      console.log(`✅ ${campaigns.length} campaigns saved to local repository`);
    } catch (error) {
      console.error('Error saving campaigns:', error);
      throw error;
    }
  },

  /**
   * Get all campaigns from local repository
   */
  getAll: async (): Promise<Campaign[]> => {
    try {
      const data = await AsyncStorage.getItem(REPOSITORY_KEYS.CAMPAIGNS);
      if (data) {
        return JSON.parse(data);
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
   */
  save: async (campaign: Campaign): Promise<void> => {
    const campaigns = await campaignsRepository.getAll();
    const index = campaigns.findIndex(c => c.id === campaign.id);
    
    if (index >= 0) {
      campaigns[index] = { ...campaign, updatedAt: new Date().toISOString() };
    } else {
      campaigns.push({ ...campaign, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    await campaignsRepository.saveAll(campaigns);
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
  saveAll: async (customers: Customer[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CUSTOMERS, JSON.stringify(customers));
      await markDirty();
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
 */
export const getLocalRepositoryTimestamp = async (): Promise<string | null> => {
  try {
    const profile = await businessRepository.get();
    return profile?.updatedAt || null;
  } catch (error) {
    console.error('Error getting local repository timestamp:', error);
    return null;
  }
};

/**
 * Get database record timestamp from API
 */
export const getDatabaseRecordTimestamp = async (businessId: string, apiBaseUrl: string = 'https://api.cannycarrot.com'): Promise<string | null> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const businessData = result.data;
        // Check both updatedAt locations
        return businessData.updatedAt || businessData.profile?.updatedAt || null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting database record timestamp:', error);
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
    // 1. Download business profile
    const businessResponse = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}`);
    if (businessResponse.ok) {
      const businessResult = await businessResponse.json();
      if (businessResult.success && businessResult.data) {
        const businessData = businessResult.data;
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
        };
        await businessRepository.save(profile);
        console.log('✅ Business profile downloaded');
      }
    }

    // 2. Download rewards
    const rewardsResponse = await fetch(`${apiBaseUrl}/api/v1/rewards?businessId=${businessId}`);
    if (rewardsResponse.ok) {
      const rewardsResult = await rewardsResponse.json();
      if (rewardsResult.success && Array.isArray(rewardsResult.data)) {
        await rewardsRepository.saveAll(rewardsResult.data);
        console.log(`✅ ${rewardsResult.data.length} rewards downloaded`);
      }
    }

    // 3. Download campaigns
    const campaignsResponse = await fetch(`${apiBaseUrl}/api/v1/campaigns?businessId=${businessId}`);
    if (campaignsResponse.ok) {
      const campaignsResult = await campaignsResponse.json();
      if (campaignsResult.success && Array.isArray(campaignsResult.data)) {
        await campaignsRepository.saveAll(campaignsResult.data);
        console.log(`✅ ${campaignsResult.data.length} campaigns downloaded`);
      }
    }

    // 4. Download customers (members)
    const customersResponse = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}/members`);
    if (customersResponse.ok) {
      const customersResult = await customersResponse.json();
      if (customersResult.success && Array.isArray(customersResult.data)) {
        await customersRepository.saveAll(customersResult.data);
        console.log(`✅ ${customersResult.data.length} customers downloaded`);
      }
    }

    // Update sync metadata
    await updateSyncMetadata({
      lastDownloadedAt: new Date().toISOString(),
      hasUnsyncedChanges: false,
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



