/**
 * Unified Sync Service
 * 
 * Treats account data, rewards, products, and campaigns as ONE logical unit.
 * Sync decision (upload vs download) is based on timestamp comparison:
 * - If local timestamp > remote timestamp → UPLOAD all data
 * - If remote timestamp > local timestamp → DOWNLOAD all data
 * - All data syncs together as one atomic operation
 */

import { businessRepository, rewardsRepository, campaignsRepository, customersRepository, getSyncStatus, getLocalRepositoryTimestamp, markDirty } from './localRepository';
import type { BusinessProfile, Reward, Campaign, Customer } from '../types';

const API_BASE_URL = 'https://api.cannycarrot.com';

/**
 * Get the remote repository timestamp from Redis
 */
const getRemoteRepositoryTimestamp = async (businessId: string): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        // Use business.updatedAt as the repository timestamp
        return result.data.updatedAt || null;
      }
    }
  } catch (error: any) {
    console.error('[UNIFIED SYNC] Error fetching remote timestamp:', error.message || error);
  }
  return null;
};

/**
 * Download all data from Redis (account, rewards, products, campaigns)
 */
const downloadAllData = async (businessId: string): Promise<{
  success: boolean;
  profile: BusinessProfile | null;
  rewards: Reward[];
  campaigns: Campaign[];
  customers: Customer[];
  timestamp: string | null;
}> => {
  console.log('📥 [UNIFIED SYNC] Downloading all data from Redis...');
  
  const result = {
    success: false,
    profile: null as BusinessProfile | null,
    rewards: [] as Reward[],
    campaigns: [] as Campaign[],
    customers: [] as Customer[],
    timestamp: null as string | null,
  };

  try {
    // Download business profile (includes products)
    const profileResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      if (profileResult.success && profileResult.data) {
        result.profile = profileResult.data.profile || profileResult.data;
        result.timestamp = profileResult.data.updatedAt || null;
        console.log('  ✅ Downloaded business profile');
      }
    }

    // Download all rewards
    const rewardsResponse = await fetch(`${API_BASE_URL}/api/v1/rewards?businessId=${businessId}`);
    if (rewardsResponse.ok) {
      const rewardsResult = await rewardsResponse.json();
      if (rewardsResult.success && Array.isArray(rewardsResult.data)) {
        result.rewards = rewardsResult.data;
        console.log(`  ✅ Downloaded ${result.rewards.length} rewards`);
      }
    }

    // Download all campaigns
    const campaignsResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns?businessId=${businessId}`);
    if (campaignsResponse.ok) {
      const campaignsResult = await campaignsResponse.json();
      if (campaignsResult.success && Array.isArray(campaignsResult.data)) {
        // Normalize campaigns to ensure all required fields are present
        const now = new Date().toISOString();
        result.campaigns = campaignsResult.data.map((campaign: any) => ({
          id: campaign.id,
          businessId: campaign.businessId || businessId,
          name: campaign.name || 'Unnamed Campaign',
          description: campaign.description || '',
          type: campaign.type || 'bonus_reward',
          startDate: campaign.startDate || now,
          endDate: campaign.endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          status: campaign.status || 'active',
          targetAudience: campaign.targetAudience || 'all',
          conditions: campaign.conditions || {},
          createdAt: campaign.createdAt || now,
          updatedAt: campaign.updatedAt || now,
          stats: campaign.stats || { impressions: 0, clicks: 0, conversions: 0 },
          ...(campaign.objective && { objective: campaign.objective }),
          ...(campaign.segmentId && { segmentId: campaign.segmentId }),
          ...(campaign.channelMasks && { channelMasks: campaign.channelMasks }),
          ...(campaign.notificationMessage && { notificationMessage: campaign.notificationMessage }),
          ...(campaign.customerProgress && { customerProgress: campaign.customerProgress }),
        }));
        console.log(`  ✅ Downloaded ${result.campaigns.length} campaigns`);
      }
    }

    // Download all customers
    const customersResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/customers`);
    if (customersResponse.ok) {
      const customersResult = await customersResponse.json();
      if (customersResult.success && Array.isArray(customersResult.data)) {
        result.customers = customersResult.data;
        console.log(`  ✅ Downloaded ${result.customers.length} customers`);
      }
    }

    result.success = true;
    console.log('✅ [UNIFIED SYNC] All data downloaded successfully');
  } catch (error: any) {
    console.error('❌ [UNIFIED SYNC] Error downloading data:', error.message || error);
  }

  return result;
};

/**
 * Upload all data to Redis (account, rewards, products, campaigns)
 */
const uploadAllData = async (businessId: string): Promise<{
  success: boolean;
  profile: boolean;
  rewards: number;
  campaigns: number;
  customers: number;
}> => {
  console.log('📤 [UNIFIED SYNC] Uploading all data to Redis...');
  
  const result = {
    success: false,
    profile: false,
    rewards: 0,
    campaigns: 0,
    customers: 0,
  };

  try {
    // Get local repository timestamp
    const localTimestamp = await getLocalRepositoryTimestamp();

    // Upload business profile (includes products)
    const profile = await businessRepository.get();
    if (profile) {
      const profileResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          updatedAt: localTimestamp, // Preserve local timestamp
        }),
      });
      
      if (profileResponse.ok) {
        result.profile = true;
        console.log('  ✅ Uploaded business profile');
      } else {
        const errorText = await profileResponse.text();
        console.error(`  ❌ Failed to upload profile: ${profileResponse.status} ${errorText.substring(0, 200)}`);
        return result; // Fail early - all or nothing
      }
    }

    // Delete all existing rewards in Redis first (full replacement)
    const existingRewardsResponse = await fetch(`${API_BASE_URL}/api/v1/rewards?businessId=${businessId}`);
    if (existingRewardsResponse.ok) {
      const existingRewardsResult = await existingRewardsResponse.json();
      if (existingRewardsResult.success && Array.isArray(existingRewardsResult.data)) {
        for (const reward of existingRewardsResult.data) {
          try {
            await fetch(`${API_BASE_URL}/api/v1/rewards/${reward.id}`, { method: 'DELETE' });
          } catch (error) {
            // Continue even if delete fails
          }
        }
      }
    }

    // Upload all local rewards
    const activeRewards = await rewardsRepository.getActive();
    for (const reward of activeRewards) {
      try {
        const rewardResponse = await fetch(`${API_BASE_URL}/api/v1/rewards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...reward,
            businessId: reward.businessId || businessId,
          }),
        });
        
        if (rewardResponse.ok) {
          result.rewards++;
        } else {
          const errorText = await rewardResponse.text();
          console.error(`  ❌ Failed to upload reward "${reward.name}": ${rewardResponse.status} ${errorText.substring(0, 200)}`);
          return result; // Fail early - all or nothing
        }
      } catch (error: any) {
        console.error(`  ❌ Error uploading reward ${reward.id}:`, error.message || error);
        return result; // Fail early - all or nothing
      }
    }
    console.log(`  ✅ Uploaded ${result.rewards}/${activeRewards.length} rewards`);

    // Delete all existing campaigns in Redis first (full replacement)
    const existingCampaignsResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns?businessId=${businessId}`);
    if (existingCampaignsResponse.ok) {
      const existingCampaignsResult = await existingCampaignsResponse.json();
      if (existingCampaignsResult.success && Array.isArray(existingCampaignsResult.data)) {
        for (const campaign of existingCampaignsResult.data) {
          try {
            await fetch(`${API_BASE_URL}/api/v1/campaigns/${campaign.id}`, { method: 'DELETE' });
          } catch (error) {
            // Continue even if delete fails
          }
        }
      }
    }

    // Upload all local campaigns
    const allCampaigns = await campaignsRepository.getAll();
    for (const campaign of allCampaigns) {
      try {
        // Normalize campaign to ensure all required fields are present
        const now = new Date().toISOString();
        const campaignToSend: Campaign = {
          id: campaign.id,
          businessId: campaign.businessId || businessId,
          name: campaign.name || 'Unnamed Campaign',
          description: campaign.description || '',
          type: campaign.type || 'bonus_reward', // Required: default to 'bonus_reward'
          startDate: campaign.startDate || now, // Required: default to now
          endDate: campaign.endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // Required: default to 1 year from now
          status: campaign.status || 'active',
          targetAudience: campaign.targetAudience || 'all',
          conditions: campaign.conditions || {},
          createdAt: campaign.createdAt || now,
          updatedAt: campaign.updatedAt || now,
          stats: campaign.stats || { impressions: 0, clicks: 0, conversions: 0 },
          ...(campaign.objective && { objective: campaign.objective }),
          ...(campaign.segmentId && { segmentId: campaign.segmentId }),
          ...(campaign.channelMasks && { channelMasks: campaign.channelMasks }),
          ...(campaign.notificationMessage && { notificationMessage: campaign.notificationMessage }),
          ...(campaign.customerProgress && { customerProgress: campaign.customerProgress }),
        };
        
        // Validate required fields before sending
        if (!campaignToSend.businessId || !campaignToSend.name || !campaignToSend.type || !campaignToSend.startDate || !campaignToSend.endDate) {
          console.error(`  ❌ Campaign "${campaign.name}" missing required fields, skipping`);
          continue; // Skip invalid campaigns
        }
        
        const campaignResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignToSend),
        });
        
        if (campaignResponse.ok) {
          result.campaigns++;
        } else {
          const errorText = await campaignResponse.text();
          console.error(`  ❌ Failed to upload campaign "${campaign.name}": ${campaignResponse.status} ${errorText.substring(0, 200)}`);
          return result; // Fail early - all or nothing
        }
      } catch (error: any) {
        console.error(`  ❌ Error uploading campaign ${campaign.id}:`, error.message || error);
        return result; // Fail early - all or nothing
      }
    }
    console.log(`  ✅ Uploaded ${result.campaigns}/${allCampaigns.length} campaigns`);

    // Upload all local customers
    const allCustomers = await customersRepository.getAll();
    for (const customer of allCustomers) {
      try {
        const customerResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });
        
        if (customerResponse.ok) {
          result.customers++;
        } else {
          const errorText = await customerResponse.text();
          console.error(`  ❌ Failed to upload customer ${customer.id}: ${customerResponse.status} ${errorText.substring(0, 200)}`);
          return result; // Fail early - all or nothing
        }
      } catch (error: any) {
        console.error(`  ❌ Error uploading customer ${customer.id}:`, error.message || error);
        return result; // Fail early - all or nothing
      }
    }
    console.log(`  ✅ Uploaded ${result.customers}/${allCustomers.length} customers`);

    // Update business.updatedAt in Redis to match local timestamp
    try {
      const businessResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (businessResponse.ok) {
        const businessResult = await businessResponse.json();
        if (businessResult.success && businessResult.data) {
          const updatedBusiness = {
            ...businessResult.data,
            updatedAt: localTimestamp, // Preserve local timestamp
          };
          
          await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedBusiness),
          });
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ [UNIFIED SYNC] Error updating business timestamp: ${error.message || error}`);
      // Don't fail sync if timestamp update fails
    }

    // All data uploaded successfully
    result.success = true;
    console.log('✅ [UNIFIED SYNC] All data uploaded successfully');
  } catch (error: any) {
    console.error('❌ [UNIFIED SYNC] Error uploading data:', error.message || error);
  }

  return result;
};

/**
 * Perform unified sync - treats all data as one logical unit
 * Compares timestamps to decide upload vs download
 */
export const performUnifiedSync = async (businessId: string): Promise<{
  success: boolean;
  direction: 'upload' | 'download' | 'none';
  synced: {
    profile: boolean;
    rewards: number;
    campaigns: number;
    customers: number;
  };
  errors: string[];
}> => {
  const errors: string[] = [];
  const result = {
    profile: false,
    rewards: 0,
    campaigns: 0,
    customers: 0,
  };

  try {
    console.log('🔄 [UNIFIED SYNC] Starting unified sync for business:', businessId);
    console.log('🔄 [UNIFIED SYNC] All data (account, rewards, products, campaigns) syncs as one unit');

    // Get timestamps
    const localTimestamp = await getLocalRepositoryTimestamp();
    const remoteTimestamp = await getRemoteRepositoryTimestamp(businessId);

    console.log(`📊 [UNIFIED SYNC] Timestamp comparison:`);
    console.log(`   Local:  ${localTimestamp}`);
    console.log(`   Remote: ${remoteTimestamp || 'N/A (no timestamp in Redis)'}`);

    // Decide sync direction based on timestamps
    let direction: 'upload' | 'download' | 'none' = 'none';
    
    if (!remoteTimestamp) {
      // No remote timestamp - upload local data
      console.log('📤 [UNIFIED SYNC] No remote timestamp found - uploading all local data');
      direction = 'upload';
    } else {
      const localTime = new Date(localTimestamp).getTime();
      const remoteTime = new Date(remoteTimestamp).getTime();
      
      if (localTime > remoteTime) {
        // Local is newer - upload
        console.log('📤 [UNIFIED SYNC] Local is newer - uploading all data');
        direction = 'upload';
      } else if (remoteTime > localTime) {
        // Remote is newer - download
        console.log('📥 [UNIFIED SYNC] Remote is newer - downloading all data');
        direction = 'download';
      } else {
        // Timestamps are equal - no sync needed
        console.log('✅ [UNIFIED SYNC] Timestamps are equal - no sync needed');
        direction = 'none';
      }
    }

    // Perform sync based on direction
    if (direction === 'upload') {
      const uploadResult = await uploadAllData(businessId);
      result.profile = uploadResult.profile;
      result.rewards = uploadResult.rewards;
      result.campaigns = uploadResult.campaigns;
      result.customers = uploadResult.customers;
      
      if (!uploadResult.success) {
        errors.push('Failed to upload all data');
      } else {
        // Update sync metadata
        const syncTime = new Date().toISOString();
        await updateSyncMetadata({
          lastSyncedAt: syncTime,
          lastModified: localTimestamp, // Keep local timestamp
          hasUnsyncedChanges: false,
        });
      }
    } else if (direction === 'download') {
      const downloadResult = await downloadAllData(businessId);
      
      if (downloadResult.success) {
        // Save all downloaded data to local repository
        if (downloadResult.profile) {
          await businessRepository.save(downloadResult.profile);
          result.profile = true;
        }
        
        await rewardsRepository.saveAll(downloadResult.rewards, true); // skipMarkDirty - we'll update timestamp after all saves
        result.rewards = downloadResult.rewards.length;
        
        await campaignsRepository.saveAll(downloadResult.campaigns, true); // skipMarkDirty
        result.campaigns = downloadResult.campaigns.length;
        
        await customersRepository.saveAll(downloadResult.customers, true); // skipMarkDirty
        result.customers = downloadResult.customers.length;
        
        // Update sync metadata with remote timestamp
        if (downloadResult.timestamp) {
          await updateSyncMetadata({
            lastSyncedAt: new Date().toISOString(),
            lastModified: downloadResult.timestamp, // Use remote timestamp
            hasUnsyncedChanges: false,
          });
        }
      } else {
        errors.push('Failed to download all data');
      }
    }

    console.log('\n✅ [UNIFIED SYNC] Unified sync completed');
    console.log(`   Direction: ${direction}`);
    console.log(`   Profile: ${result.profile ? '✅' : '❌'}`);
    console.log(`   Rewards: ${result.rewards}`);
    console.log(`   Campaigns: ${result.campaigns}`);
    console.log(`   Customers: ${result.customers}`);

    return {
      success: errors.length === 0,
      direction,
      synced: result,
      errors,
    };
  } catch (error: any) {
    console.error('❌ [UNIFIED SYNC] Unified sync error:', error);
    errors.push(error.message || 'Unknown sync error');
    return {
      success: false,
      direction: 'none',
      synced: result,
      errors,
    };
  }
};

// Helper function to update sync metadata (re-exported from localRepository)
const updateSyncMetadata = async (updates: {
  lastSyncedAt: string;
  lastModified: string;
  hasUnsyncedChanges: boolean;
}): Promise<void> => {
  const { updateSyncMetadata: update } = await import('./localRepository');
  await update(updates);
};

