/**
 * Full Replacement Sync Service
 * 
 * Performs a complete replacement sync on logout:
 * 1. Deletes ALL existing data from Redis for this business
 * 2. Writes ALL local data to Redis
 * 3. Ensures Redis is an exact copy of local repository
 */

import { businessRepository, rewardsRepository, campaignsRepository, customersRepository } from './localRepository';
import type { BusinessProfile, Reward, Campaign, Customer } from '../types';

const API_BASE_URL = 'https://api.cannycarrot.com';

/**
 * Delete all rewards for a business from Redis (HARD DELETE)
 * This actually removes the reward keys and clears the business rewards set
 */
const deleteAllRewards = async (businessId: string): Promise<void> => {
  try {
    console.log(`🗑️ [FULL SYNC] Deleting all rewards for business ${businessId}...`);
    
    const setKey = `business:${businessId}:rewards`;
    
    // Get all reward IDs from the set using Redis proxy
    const smembersResponse = await fetch(`${API_BASE_URL}/api/v1/redis/smembers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args: [setKey] }),
    });
    
    if (!smembersResponse.ok) {
      const errorText = await smembersResponse.text();
      console.error(`❌ [FULL SYNC] Failed to get reward IDs: ${smembersResponse.status} ${errorText}`);
      return;
    }
    
    const smembersResult = await smembersResponse.json();
    const rewardIds: string[] = smembersResult.data || [];
    console.log(`🗑️ [FULL SYNC] Found ${rewardIds.length} reward IDs in set: ${rewardIds.slice(0, 5).join(', ')}${rewardIds.length > 5 ? '...' : ''}`);
    
    // Delete each reward key directly via Redis proxy
    let deletedCount = 0;
    for (const rewardId of rewardIds) {
      try {
        const rewardKey = `reward:${rewardId}`;
        const delResponse = await fetch(`${API_BASE_URL}/api/v1/redis/del`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args: [rewardKey] }),
        });
        
        if (delResponse.ok) {
          const delResult = await delResponse.json();
          // Redis DEL returns number of keys deleted (0 or 1)
          if (delResult.data > 0) {
            deletedCount++;
            console.log(`  ✅ Deleted reward key ${rewardKey} (${deletedCount}/${rewardIds.length})`);
          } else {
            console.warn(`  ⚠️ Reward key ${rewardKey} didn't exist (already deleted?)`);
          }
        } else {
          const errorText = await delResponse.text();
          console.error(`  ❌ Failed to delete reward ${rewardKey}: ${delResponse.status} ${errorText.substring(0, 100)}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Error deleting reward ${rewardId}:`, error.message || error);
      }
    }
    
    console.log(`🗑️ [FULL SYNC] Deleted ${deletedCount}/${rewardIds.length} reward keys`);
    
    // Delete the business rewards set
    try {
      const delSetResponse = await fetch(`${API_BASE_URL}/api/v1/redis/del`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: [setKey] }),
      });
      
      if (delSetResponse.ok) {
        const delSetResult = await delSetResponse.json();
        if (delSetResult.data > 0) {
          console.log(`  ✅ Deleted business rewards set ${setKey}`);
        } else {
          console.warn(`  ⚠️ Business rewards set ${setKey} didn't exist`);
        }
      } else {
        const errorText = await delSetResponse.text();
        console.error(`  ❌ Failed to delete set ${setKey}: ${delSetResponse.status} ${errorText.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error deleting business rewards set:`, error.message || error);
    }
  } catch (error: any) {
    console.error('❌ [FULL SYNC] Error deleting rewards:', error.message || error);
  }
};

/**
 * Delete all campaigns for a business from Redis
 */
const deleteAllCampaigns = async (businessId: string): Promise<void> => {
  try {
    console.log(`🗑️ [FULL SYNC] Fetching all campaigns for business ${businessId} to delete...`);
    
    // Get all campaign IDs for this business
    const response = await fetch(`${API_BASE_URL}/api/v1/campaigns?businessId=${businessId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const campaignIds = result.data.map((c: Campaign) => c.id);
        console.log(`🗑️ [FULL SYNC] Found ${campaignIds.length} campaigns in Redis to delete`);
        
        // Delete each campaign
        for (const campaignId of campaignIds) {
          try {
            const deleteResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns/${campaignId}`, {
              method: 'DELETE',
            });
            if (deleteResponse.ok) {
              console.log(`  ✅ Deleted campaign ${campaignId} from Redis`);
            } else {
              console.warn(`  ⚠️ Failed to delete campaign ${campaignId}: ${deleteResponse.status}`);
            }
          } catch (error) {
            console.error(`  ❌ Error deleting campaign ${campaignId}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ [FULL SYNC] Error deleting campaigns:', error);
  }
};

/**
 * Delete all customers for a business from Redis
 * Note: Customers are managed via full replacement - we just overwrite with local data
 */
const deleteAllCustomers = async (businessId: string): Promise<void> => {
  try {
    console.log(`🗑️ [FULL SYNC] Checking customers for business ${businessId}...`);
    
    // Get all customer IDs for this business
    const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/customers`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const customerIds = result.data.map((c: Customer) => c.id);
        console.log(`🗑️ [FULL SYNC] Found ${customerIds.length} customers in Redis (will be overwritten by local data)`);
      }
    } else if (response.status === 404) {
      // 404 means no customers exist - this is fine, just log it
      console.log(`ℹ️ [FULL SYNC] No customers found in Redis (404)`);
    } else {
      // Other error - log but don't fail
      const errorText = await response.text();
      console.warn(`⚠️ [FULL SYNC] Failed to fetch customers: ${response.status} ${errorText.substring(0, 100)}`);
    }
  } catch (error: any) {
    console.warn(`⚠️ [FULL SYNC] Error fetching customers (non-critical):`, error.message || error);
  }
};

/**
 * Write all local rewards to Redis
 */
const writeAllRewards = async (rewards: Reward[], businessId: string): Promise<number> => {
  let written = 0;
  console.log(`📤 [FULL SYNC] Writing ${rewards.length} rewards to Redis...`);
  
  for (const reward of rewards) {
    try {
      const rewardToSync = {
        ...reward,
        businessId: reward.businessId || businessId,
      };
      
      const response = await fetch(`${API_BASE_URL}/api/v1/rewards`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Sync-Context': 'logout', // Required by Redis write monitor
        },
        body: JSON.stringify(rewardToSync),
      });
      
      if (response.ok) {
        written++;
        console.log(`  ✅ Wrote reward "${reward.name}" (${reward.id}) to Redis`);
      } else {
        const errorText = await response.text();
        console.error(`  ❌ Failed to write reward "${reward.name}": ${response.status} ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error(`  ❌ Error writing reward ${reward.id}:`, error);
    }
  }
  
  return written;
};

/**
 * Write all local campaigns to Redis
 */
const writeAllCampaigns = async (campaigns: Campaign[], businessId: string): Promise<number> => {
  let written = 0;
  console.log(`📤 [FULL SYNC] Writing ${campaigns.length} campaigns to Redis...`);
  
  for (const campaign of campaigns) {
    try {
      // Normalize campaign to ensure all required fields are present
      // IMPORTANT: Include ALL fields from local campaign, including selectedProducts, selectedActions, pinCode, qrCode
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
        // Include direct fields (same as rewards) - selectedProducts, selectedActions, pinCode, qrCode, pointsPerPurchase
        selectedProducts: campaign.selectedProducts || [],
        selectedActions: campaign.selectedActions || [],
        pinCode: campaign.pinCode,
        qrCode: campaign.qrCode,
        pointsPerPurchase: campaign.pointsPerPurchase,
        ...(campaign.objective && { objective: campaign.objective }),
        ...(campaign.segmentId && { segmentId: campaign.segmentId }),
        ...(campaign.channelMasks && { channelMasks: campaign.channelMasks }),
        ...(campaign.notificationMessage && { notificationMessage: campaign.notificationMessage }),
        ...(campaign.customerProgress && { customerProgress: campaign.customerProgress }),
      };
      
      // Validate required fields before sending
      if (!campaignToSend.businessId || !campaignToSend.name || !campaignToSend.type || !campaignToSend.startDate || !campaignToSend.endDate) {
        console.error(`  ❌ Campaign "${campaign.name}" missing required fields:`, {
          businessId: !!campaignToSend.businessId,
          name: !!campaignToSend.name,
          type: !!campaignToSend.type,
          startDate: !!campaignToSend.startDate,
          endDate: !!campaignToSend.endDate,
        });
        continue; // Skip invalid campaigns
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/campaigns`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Sync-Context': 'logout', // Required by Redis write monitor
        },
        body: JSON.stringify(campaignToSend),
      });
      
      if (response.ok) {
        written++;
        console.log(`  ✅ Wrote campaign "${campaign.name}" (${campaign.id}) to Redis`);
      } else {
        const errorText = await response.text();
        console.error(`  ❌ Failed to write campaign "${campaign.name}": ${response.status} ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error(`  ❌ Error writing campaign ${campaign.id}:`, error);
    }
  }
  
  return written;
};

/**
 * Write all local customers to Redis
 */
const writeAllCustomers = async (customers: Customer[], businessId: string): Promise<number> => {
  let written = 0;
  console.log(`📤 [FULL SYNC] Writing ${customers.length} customers to Redis...`);
  
  for (const customer of customers) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      
      if (response.ok) {
        written++;
        console.log(`  ✅ Wrote customer "${customer.firstName} ${customer.lastName}" (${customer.id}) to Redis`);
      } else {
        const errorText = await response.text();
        console.error(`  ❌ Failed to write customer ${customer.id}: ${response.status} ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error(`  ❌ Error writing customer ${customer.id}:`, error);
    }
  }
  
  return written;
};

/**
 * Perform full replacement sync - makes Redis identical to local repository
 */
export const performFullReplacementSync = async (businessId: string): Promise<{
  success: boolean;
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
    console.log('🔄 [FULL SYNC] Starting full replacement sync for business:', businessId);
    console.log('🔄 [FULL SYNC] This will DELETE all existing data in Redis and replace with local data');

    // STEP 1: Delete all existing data from Redis
    console.log('\n🗑️ [FULL SYNC] STEP 1: Deleting all existing data from Redis...');
    await deleteAllRewards(businessId);
    await deleteAllCampaigns(businessId);
    await deleteAllCustomers(businessId);
    console.log('✅ [FULL SYNC] All existing data deleted from Redis\n');

    // STEP 2: Write all local data to Redis
    console.log('📤 [FULL SYNC] STEP 2: Writing all local data to Redis...');
    
    // Write business profile (replaces entire profile)
    const profile = await businessRepository.get();
    if (profile) {
      try {
        console.log(`📤 [FULL SYNC] Business profile data:`, {
          name: profile.name,
          products: profile.products?.length || 0,
          actions: profile.actions?.length || 0,
          hasProducts: !!profile.products,
          hasActions: !!profile.actions,
        });
        
        const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Sync-Context': 'logout', // Required by Redis write monitor
          },
          body: JSON.stringify(profile),
        });
        
        if (response.ok) {
          result.profile = true;
          console.log(`✅ [FULL SYNC] Business profile written to Redis (${profile.products?.length || 0} products, ${profile.actions?.length || 0} actions)`);
        } else {
          const errorText = await response.text();
          console.error(`❌ [FULL SYNC] Failed to write business profile: ${response.status} ${errorText.substring(0, 200)}`);
          errors.push('Failed to sync business profile');
        }
      } catch (error: any) {
        console.error('❌ [FULL SYNC] Error writing business profile:', error.message || error);
        errors.push('Failed to sync business profile');
      }
    }

    // Write only active rewards (inactive/deleted ones are removed from Redis in step 1)
    const activeRewards = await rewardsRepository.getActive();
    result.rewards = await writeAllRewards(activeRewards, businessId);
    if (result.rewards < activeRewards.length) {
      errors.push(`Failed to write ${activeRewards.length - result.rewards} rewards`);
    }

    // Write all campaigns
    const allCampaigns = await campaignsRepository.getAll();
    result.campaigns = await writeAllCampaigns(allCampaigns, businessId);
    if (result.campaigns < allCampaigns.length) {
      errors.push(`Failed to write ${allCampaigns.length - result.campaigns} campaigns`);
    }

    // Write all customers
    const allCustomers = await customersRepository.getAll();
    result.customers = await writeAllCustomers(allCustomers, businessId);
    if (result.customers < allCustomers.length) {
      errors.push(`Failed to write ${allCustomers.length - result.customers} customers`);
    }

    // STEP 3: Update business.updatedAt timestamp in Redis to match the local repository's timestamp
    // This ensures Redis reflects the device's timestamp, not a new timestamp generated on sync
    try {
      const { getLocalRepositoryTimestamp } = await import('./localRepository');
      const localTimestamp = await getLocalRepositoryTimestamp();
      
      // Fetch current business record and update its timestamp to match local repository
      const businessResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (businessResponse.ok) {
        const businessResult = await businessResponse.json();
        if (businessResult.success && businessResult.data) {
          const existingBusiness = businessResult.data;
          // Update business.updatedAt to match the device's timestamp
          const updatedBusiness = {
            ...existingBusiness,
            updatedAt: localTimestamp, // Use device's timestamp, not a new one
          };
          
          const updateResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'X-Sync-Context': 'logout', // Required by Redis write monitor
            },
            body: JSON.stringify(updatedBusiness),
          });
          
          if (updateResponse.ok) {
            console.log(`✅ [FULL SYNC] Business repository timestamp updated to match local: ${localTimestamp}`);
          } else {
            const errorText = await updateResponse.text();
            console.warn(`⚠️ [FULL SYNC] Failed to update business timestamp: ${updateResponse.status} ${errorText.substring(0, 100)}`);
          }
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ [FULL SYNC] Error updating business timestamp: ${error.message || error}`);
      // Don't fail the sync if timestamp update fails
    }

    console.log('\n✅ [FULL SYNC] Full replacement sync completed');
    console.log(`   Profile: ${result.profile ? '✅' : '❌'}`);
    console.log(`   Rewards: ${result.rewards}/${activeRewards.length} active (inactive rewards removed from Redis)`);
    console.log(`   Campaigns: ${result.campaigns}/${allCampaigns.length}`);
    console.log(`   Customers: ${result.customers}/${allCustomers.length}`);

    return {
      success: errors.length === 0,
      synced: result,
      errors,
    };
  } catch (error: any) {
    console.error('❌ [FULL SYNC] Full replacement sync error:', error);
    errors.push(error.message || 'Unknown sync error');
    return {
      success: false,
      synced: result,
      errors,
    };
  }
};

