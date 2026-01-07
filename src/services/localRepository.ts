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
} as const;

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
 * DOWNLOAD ALL DATA FROM REDIS (First Login)
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
    ]);
    console.log('✅ Repository cleared');
  } catch (error) {
    console.error('Error clearing repository:', error);
    throw error;
  }
};



