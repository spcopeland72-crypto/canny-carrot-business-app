/**
 * Daily Sync Service
 * 
 * Syncs local repository data to Redis once per day.
 * Only syncs data that has changed (marked as dirty).
 */

import { businessRepository, rewardsRepository, campaignsRepository, customersRepository, getSyncStatus, updateSyncMetadata } from './localRepository';
import type { BusinessProfile, Reward, Campaign, Customer } from '../types';

// Get API base URL - use production API
const API_BASE_URL = 'https://api.cannycarrot.com';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Sync business profile to Redis
 */
const syncBusinessProfile = async (profile: BusinessProfile, businessId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    return response.ok;
  } catch (error) {
    console.error('Error syncing business profile:', error);
    return false;
  }
};

/**
 * Sync rewards to Redis
 */
const syncRewards = async (rewards: Reward[], businessId: string): Promise<number> => {
  let synced = 0;
  for (const reward of rewards) {
    try {
      const url = reward.id 
        ? `${API_BASE_URL}/api/v1/rewards/${reward.id}`
        : `${API_BASE_URL}/api/v1/rewards`;
      
      const method = reward.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reward, businessId }),
      });
      
      if (response.ok) {
        synced++;
      }
    } catch (error) {
      console.error(`Error syncing reward ${reward.id}:`, error);
    }
  }
  return synced;
};

/**
 * Sync campaigns to Redis
 */
const syncCampaigns = async (campaigns: Campaign[], businessId: string): Promise<number> => {
  let synced = 0;
  for (const campaign of campaigns) {
    try {
      const url = campaign.id
        ? `${API_BASE_URL}/api/v1/campaigns/${campaign.id}`
        : `${API_BASE_URL}/api/v1/campaigns`;
      
      const method = campaign.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campaign, businessId }),
      });
      
      if (response.ok) {
        synced++;
      }
    } catch (error) {
      console.error(`Error syncing campaign ${campaign.id}:`, error);
    }
  }
  return synced;
};

/**
 * Sync customers to Redis
 */
const syncCustomers = async (customers: Customer[], businessId: string): Promise<number> => {
  let synced = 0;
  for (const customer of customers) {
    try {
      const url = customer.id
        ? `${API_BASE_URL}/api/v1/businesses/${businessId}/members/${customer.id}`
        : `${API_BASE_URL}/api/v1/businesses/${businessId}/members`;
      
      const method = customer.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      
      if (response.ok) {
        synced++;
      }
    } catch (error) {
      console.error(`Error syncing customer ${customer.id}:`, error);
    }
  }
  return synced;
};

/**
 * Perform daily sync of all repository data to Redis
 */
export const performDailySync = async (businessId: string): Promise<{
  success: boolean;
  synced: {
    profile: boolean;
    rewards: number;
    campaigns: number;
    customers: number;
  };
  errors: string[];
}> => {
  if (isSyncing) {
    return {
      success: false,
      synced: { profile: false, rewards: 0, campaigns: 0, customers: 0 },
      errors: ['Sync already in progress'],
    };
  }

  isSyncing = true;
  const errors: string[] = [];
  const result = {
    profile: false,
    rewards: 0,
    campaigns: 0,
    customers: 0,
  };

  try {
    console.log('🔄 [DAILY SYNC] Starting daily sync for business:', businessId);

    // Check if there are unsynced changes
    const syncStatus = await getSyncStatus();
    if (!syncStatus.hasUnsyncedChanges) {
      console.log('ℹ️ [DAILY SYNC] No unsynced changes, skipping sync');
      isSyncing = false;
      return {
        success: true,
        synced: result,
        errors: [],
      };
    }

    // Sync business profile
    const profile = await businessRepository.get();
    if (profile) {
      result.profile = await syncBusinessProfile(profile, businessId);
      if (!result.profile) {
        errors.push('Failed to sync business profile');
      }
    }

    // Sync rewards
    const rewards = await rewardsRepository.getAll();
    result.rewards = await syncRewards(rewards, businessId);
    if (result.rewards < rewards.length) {
      errors.push(`Failed to sync ${rewards.length - result.rewards} rewards`);
    }

    // Sync campaigns
    const campaigns = await campaignsRepository.getAll();
    result.campaigns = await syncCampaigns(campaigns, businessId);
    if (result.campaigns < campaigns.length) {
      errors.push(`Failed to sync ${campaigns.length - result.campaigns} campaigns`);
    }

    // Sync customers
    const customers = await customersRepository.getAll();
    result.customers = await syncCustomers(customers, businessId);
    if (result.customers < customers.length) {
      errors.push(`Failed to sync ${customers.length - result.customers} customers`);
    }

    // Update sync metadata
    await updateSyncMetadata({
      lastSyncedAt: new Date().toISOString(),
      hasUnsyncedChanges: false,
    });

    console.log('✅ [DAILY SYNC] Sync completed:', result);
    
    return {
      success: errors.length === 0,
      synced: result,
      errors,
    };
  } catch (error: any) {
    console.error('❌ [DAILY SYNC] Sync error:', error);
    errors.push(error.message || 'Unknown sync error');
    return {
      success: false,
      synced: result,
      errors,
    };
  } finally {
    isSyncing = false;
  }
};

/**
 * Start daily sync interval
 */
export const startDailySync = (businessId: string): void => {
  if (syncInterval) {
    console.log('⚠️ [DAILY SYNC] Sync already running');
    return;
  }

  console.log('🚀 [DAILY SYNC] Starting daily sync service');
  
  // Perform initial sync
  performDailySync(businessId);

  // Set up interval for daily sync
  syncInterval = setInterval(() => {
    performDailySync(businessId);
  }, SYNC_INTERVAL_MS);
};

/**
 * Stop daily sync interval
 */
export const stopDailySync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('🛑 [DAILY SYNC] Daily sync service stopped');
  }
};

/**
 * Check if sync is in progress
 */
export const isSyncingNow = (): boolean => {
  return isSyncing;
};

