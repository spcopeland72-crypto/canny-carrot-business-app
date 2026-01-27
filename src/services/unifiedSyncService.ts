/**
 * Unified Sync Service
 * 
 * Treats account data, rewards, products, and campaigns as ONE logical unit.
 * Sync decision (upload vs download) is based on timestamp comparison:
 * - If local timestamp > remote timestamp → UPLOAD all data
 * - If remote timestamp > local timestamp → DOWNLOAD all data
 * - All data syncs together as one atomic operation
 */

import { businessRepository, rewardsRepository, campaignsRepository, customersRepository, getSyncStatus, getLocalRepositoryTimestamp, updateSyncMetadata as updateLocalSyncMetadata } from './localRepository';
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
        // Use business.updatedAt as the repository timestamp (check both top-level and profile)
        return result.data.updatedAt || result.data.profile?.updatedAt || null;
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

    // Download all campaigns (same pattern as rewards - use data as-is, no normalization)
    const campaignsResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns?businessId=${businessId}`);
    if (campaignsResponse.ok) {
      const campaignsResult = await campaignsResponse.json();
      if (campaignsResult.success && Array.isArray(campaignsResult.data)) {
        result.campaigns = campaignsResult.data.map((campaign: any) => ({
          ...campaign,
          businessId: campaign.businessId || businessId,
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
    // Timestamp only changes on create/edit in app or admin server-side. Use local lastModified, never "now".
    const localTs = await getLocalRepositoryTimestamp();
    if (!localTs) {
      console.error('❌ [UNIFIED SYNC] Cannot upload: no local lastModified (timestamp only set on create/edit).');
      return result;
    }
    const profile = await businessRepository.get();
    if (profile) {
      const profileResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Sync-Context': 'manual-sync', // Required by Redis write monitor
        },
        body: JSON.stringify({
          ...profile,
          updatedAt: localTs,
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
          headers: { 
            'Content-Type': 'application/json',
            'X-Sync-Context': 'manual-sync', // Required by Redis write monitor
          },
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

    // Get existing campaigns from Redis to determine which to update vs create
    const existingCampaignsResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns?businessId=${businessId}`);
    const existingCampaignIds = new Set<string>();
    if (existingCampaignsResponse.ok) {
      const existingCampaignsResult = await existingCampaignsResponse.json();
      if (existingCampaignsResult.success && Array.isArray(existingCampaignsResult.data)) {
        for (const campaign of existingCampaignsResult.data) {
          existingCampaignIds.add(campaign.id);
        }
      }
    }

    // Get local campaigns
    const allCampaigns = await campaignsRepository.getAll();
    console.log(`📤 [UNIFIED SYNC] Uploading ${allCampaigns.length} campaigns (${existingCampaignIds.size} existing in Redis)`);
    
    // Track which campaigns we've uploaded
    const uploadedCampaignIds = new Set<string>();
    
    for (const campaign of allCampaigns) {
      try {
        if (!campaign.id) {
          console.error(`  ❌ Campaign "${campaign.name}" has no ID - skipping`);
          continue;
        }

        // Create campaign object to send
        const campaignToSend = {
          ...campaign,
          businessId: campaign.businessId || businessId,
        };
        
        // Use PUT if campaign exists in Redis, POST if new (POST now preserves ID if provided)
        let campaignResponse: Response;
        const campaignExists = campaign.id && existingCampaignIds.has(campaign.id);
        
        if (campaignExists) {
          // Campaign exists in Redis - use PUT to update
          console.log(`📤 [UNIFIED SYNC] PUT campaign "${campaign.name}" (ID: ${campaign.id}) - updating existing`);
          campaignResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns/${campaign.id}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'X-Sync-Context': 'manual-sync',
            },
            body: JSON.stringify(campaignToSend),
          });
        } else {
          // Campaign doesn't exist - use POST (will preserve ID if provided in body)
          console.log(`📤 [UNIFIED SYNC] POST campaign "${campaign.name}" (ID: ${campaign.id || 'new'}) - creating`);
          campaignResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Sync-Context': 'manual-sync',
            },
            body: JSON.stringify(campaignToSend), // Includes id field if present
          });
        }
        
        if (campaignResponse.ok) {
          result.campaigns++;
          uploadedCampaignIds.add(campaign.id);
        } else {
          const errorText = await campaignResponse.text();
          console.error(`  ❌ Failed to sync campaign "${campaign.name}": ${campaignResponse.status} ${errorText.substring(0, 200)}`);
          return result; // Fail early - all or nothing
        }
      } catch (error: any) {
        console.error(`  ❌ Error uploading campaign ${campaign.id}:`, error.message || error);
        return result; // Fail early - all or nothing
      }
    }

    // Delete campaigns from Redis that no longer exist locally
    for (const existingId of existingCampaignIds) {
      if (!uploadedCampaignIds.has(existingId)) {
        try {
          console.log(`🗑️ [UNIFIED SYNC] Deleting campaign ${existingId} (no longer in local repository)`);
          await fetch(`${API_BASE_URL}/api/v1/campaigns/${existingId}`, { 
            method: 'DELETE',
            headers: { 'X-Sync-Context': 'manual-sync' },
          });
        } catch (error) {
          console.error(`  ❌ Failed to delete campaign ${existingId}:`, error);
          // Continue - don't fail sync if delete fails
        }
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

    // Ensure business.updatedAt in Redis matches local lastModified (from create/edit). Never use "now".
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
            updatedAt: localTs,
          };
          
          const updateResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'X-Sync-Context': 'manual-sync', // Required by Redis write monitor
            },
            body: JSON.stringify(updatedBusiness),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ [UNIFIED SYNC] Business timestamp set to local lastModified: ${localTs}`);
          } else {
            const errorText = await updateResponse.text();
            console.error(`❌ [UNIFIED SYNC] Failed to update business timestamp: ${updateResponse.status} ${errorText.substring(0, 200)}`);
          }
        }
      } else {
        console.error(`❌ [UNIFIED SYNC] Failed to fetch business for timestamp update: ${businessResponse.status}`);
      }
    } catch (error: any) {
      console.error(`❌ [UNIFIED SYNC] Error updating business timestamp: ${error.message || error}`);
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

    // ⚠️ DEBUG: Send local storage dump to API for debugging
    try {
      const [businessProfile, allRewards, allCampaigns, allCustomers, syncStatus] = await Promise.all([
        businessRepository.get(),
        rewardsRepository.getAll(),
        campaignsRepository.getAll(),
        customersRepository.getAll(),
        getSyncStatus(),
      ]);
      
      await fetch(`${API_BASE_URL}/api/v1/debug/local-storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          campaigns: allCampaigns,
          rewards: allRewards,
          businessProfile,
          customers: allCustomers,
          syncMetadata: syncStatus,
        }),
      }).catch(err => {
        // Silently fail - debug endpoint is optional
        console.log('⚠️ [DEBUG] Could not send local storage dump to API:', err.message);
      });
    } catch (debugError: any) {
      // Silently fail - debug endpoint is optional
      console.log('⚠️ [DEBUG] Error collecting local storage dump:', debugError.message);
    }

    // Get timestamps. Retry remote only (transient API issues). Local is never fabricated.
    let localTimestamp = await getLocalRepositoryTimestamp();
    let remoteTimestamp = await getRemoteRepositoryTimestamp(businessId);
    let retryCount = 0;
    const maxRetries = 2;
    while (!remoteTimestamp && retryCount < maxRetries) {
      retryCount++;
      console.warn(`⚠️ [UNIFIED SYNC] Remote timestamp missing (attempt ${retryCount}/${maxRetries}) - retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      remoteTimestamp = await getRemoteRepositoryTimestamp(businessId);
    }

    console.log(`📊 [UNIFIED SYNC] Timestamp comparison:`);
    console.log(`   Local:  ${localTimestamp ?? 'null'}`);
    console.log(`   Remote: ${remoteTimestamp ?? 'null'}`);
    if (localTimestamp && remoteTimestamp) {
      const localMs = new Date(localTimestamp).getTime();
      const remoteMs = new Date(remoteTimestamp).getTime();
      console.log(`   Local (ms): ${localMs}, Remote (ms): ${remoteMs}, diff: ${Math.abs(localMs - remoteMs) / 1000 / 60} min`);
    }

    // Decide direction. Timestamp only changes on create/edit (or admin). Never upload when local is null.
    let direction: 'upload' | 'download' | 'none' = 'none';
    if (!localTimestamp && remoteTimestamp) {
      // No valid local timestamp (e.g. stale device, fresh restore) → take Redis as truth. Never overwrite.
      console.log('📥 [UNIFIED SYNC] Local timestamp null, remote exists → downloading (no upload)');
      direction = 'download';
    } else if (!localTimestamp && !remoteTimestamp) {
      console.log('✅ [UNIFIED SYNC] Both timestamps null → no sync');
      direction = 'none';
    } else if (localTimestamp && !remoteTimestamp) {
      console.log('📤 [UNIFIED SYNC] Local exists, remote null → uploading');
      direction = 'upload';
    } else {
      const localTime = new Date(localTimestamp!).getTime();
      const remoteTime = new Date(remoteTimestamp!).getTime();
      if (localTime > remoteTime) {
        console.log('📤 [UNIFIED SYNC] Local is newer → uploading');
        direction = 'upload';
      } else if (remoteTime > localTime) {
        console.log('📥 [UNIFIED SYNC] Remote is newer → downloading');
        direction = 'download';
      } else {
        console.log('✅ [UNIFIED SYNC] Timestamps equal → no sync');
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
        // DO NOT update timestamp on sync - timestamp only changes on user create/edit/submit
        // Just record that we synced, but preserve existing timestamp
        await updateSyncMetadata({
          lastSyncedAt: new Date().toISOString(),
          hasUnsyncedChanges: false,
          // DO NOT update lastModified - it only changes when user creates/edits/submits
        });
      }
    } else if (direction === 'download') {
      const downloadResult = await downloadAllData(businessId);
      
      if (downloadResult.success) {
        // Save all downloaded data to local repository
        // DO NOT update timestamp - downloads don't change timestamp
        if (downloadResult.profile) {
          await businessRepository.save(downloadResult.profile, true); // skipMarkDirty = true
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

const updateSyncMetadata = async (updates: Partial<{
  lastSyncedAt: string | null;
  lastModified: string | null;
  hasUnsyncedChanges: boolean;
}>): Promise<void> => {
  await updateLocalSyncMetadata(updates);
};

