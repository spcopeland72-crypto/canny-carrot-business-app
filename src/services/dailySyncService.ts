/**
 * Daily Sync Service
 *
 * 1 RULE, 3 USE CASES. Sync ONLY on Sync click, login, logout. No other time.
 * This service is NOT one of the 3. Do NOT use. No daily/background/interval sync.
 * Dead code. Use unifiedSyncService for Sync + logout; authService for login.
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
    console.log(`  📤 Syncing business profile for ${businessId} to Redis...`);
    const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    
    if (response.ok) {
      console.log(`  ✅ Successfully synced business profile to Redis`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`  ❌ Failed to sync business profile: ${response.status} ${errorText.substring(0, 200)}`);
      return false;
    }
  } catch (error: any) {
    console.error('  ❌ Error syncing business profile:', error.message || error);
    return false;
  }
};

/**
 * Sync rewards to Redis
 * Sends DB format directly - no transformation needed
 */
const syncRewards = async (rewards: Reward[], businessId: string): Promise<number> => {
  let synced = 0;
  console.log(`🔄 [SYNC] Syncing ${rewards.length} rewards to Redis...`);
  
  for (const reward of rewards) {
    try {
      // Ensure businessId is set
      const rewardToSync = {
        ...reward,
        businessId: reward.businessId || businessId,
      };
      
      console.log(`  📤 Syncing reward "${reward.name}" (${reward.id}) to Redis...`);
      
      // Always use POST for syncing - the POST endpoint handles both create and update (upsert)
      const url = `${API_BASE_URL}/api/v1/rewards`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardToSync),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`  ✅ Successfully synced reward "${reward.name}" to Redis`);
        synced++;
      } else {
        const errorText = await response.text();
        console.error(`  ❌ Failed to sync reward "${reward.name}": ${response.status} ${errorText.substring(0, 200)}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error syncing reward ${reward.id} ("${reward.name}"):`, error.message);
    }
  }
  
  console.log(`✅ [SYNC] Synced ${synced}/${rewards.length} rewards to Redis`);
  return synced;
};

/**
 * Sync campaigns to Redis
 */
const syncCampaigns = async (campaigns: Campaign[], businessId: string): Promise<number> => {
  let synced = 0;
  for (const campaign of campaigns) {
    try {
      // Ensure businessId is set
      const campaignToSend = {
        ...campaign,
        businessId: campaign.businessId || businessId,
      };
      
      const url = campaign.id
        ? `${API_BASE_URL}/api/v1/campaigns/${campaign.id}`
        : `${API_BASE_URL}/api/v1/campaigns`;
      
      const method = campaign.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignToSend),
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
 * @param businessId - Business ID to sync
 * @param forceSync - If true, sync even if hasUnsyncedChanges is false (used on login when local is newer)
 */
export const performDailySync = async (businessId: string, forceSync: boolean = false): Promise<{
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
    console.log(`🔄 [DAILY SYNC] Starting ${forceSync ? 'forced' : 'daily'} sync for business: ${businessId}`);

    // Check if there are unsynced changes (unless force sync)
    if (!forceSync) {
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
    } else {
      console.log('🔄 [DAILY SYNC] Force sync enabled - syncing all data regardless of dirty flag');
    }

    // Sync business profile
    const profile = await businessRepository.get();
    if (profile) {
      result.profile = await syncBusinessProfile(profile, businessId);
      if (!result.profile) {
        errors.push('Failed to sync business profile');
      }
    }

    // Sync rewards - only sync active (exclude deleted/inactive). Service is dead / do not use.
    const rewards = await rewardsRepository.getActive();
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

    // Timestamp (lastModified) is ONLY altered on create/edit in app or admin server-side. Never on sync.
    const syncTime = new Date().toISOString();
    const allRewardsSynced = result.rewards === rewards.length;
    const allCampaignsSynced = result.campaigns === campaigns.length;
    const allCustomersSynced = result.customers === customers.length;
    const syncFullySuccessful = allRewardsSynced && allCampaignsSynced && allCustomersSynced && errors.length === 0;

    await updateSyncMetadata({
      lastSyncedAt: syncTime,
      hasUnsyncedChanges: !syncFullySuccessful,
    });
    if (syncFullySuccessful) {
      console.log(`✅ [SYNC] Sync metadata updated (lastModified unchanged)`);
    } else {
      console.warn(`⚠️ [SYNC] Sync incomplete - lastModified unchanged. Rewards: ${result.rewards}/${rewards.length}, Campaigns: ${result.campaigns}/${campaigns.length}, Customers: ${result.customers}/${customers.length}`);
    }

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

