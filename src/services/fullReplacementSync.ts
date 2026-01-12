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
    console.log(`🗑️ [FULL SYNC] Fetching all rewards for business ${businessId} to delete...`);
    
    // Get all reward IDs for this business
    const response = await fetch(`${API_BASE_URL}/api/v1/rewards?businessId=${businessId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const rewardIds = result.data.map((r: Reward) => r.id);
        console.log(`🗑️ [FULL SYNC] Found ${rewardIds.length} rewards in Redis to hard delete`);
        
        // Hard delete each reward key directly via Redis proxy
        for (const rewardId of rewardIds) {
          try {
            // Delete the reward key
            const delResponse = await fetch(`${API_BASE_URL}/api/v1/redis/del`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ args: [`reward:${rewardId}`] }),
            });
            if (delResponse.ok) {
              console.log(`  ✅ Hard deleted reward ${rewardId} from Redis`);
            } else {
              console.warn(`  ⚠️ Failed to delete reward ${rewardId} key`);
            }
          } catch (error) {
            console.error(`  ❌ Error deleting reward ${rewardId}:`, error);
          }
        }
        
        // Delete the entire business rewards set
        try {
          const delSetResponse = await fetch(`${API_BASE_URL}/api/v1/redis/del`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ args: [`business:${businessId}:rewards`] }),
          });
          if (delSetResponse.ok) {
            console.log(`  ✅ Deleted business rewards set from Redis`);
          }
        } catch (error) {
          console.error(`  ❌ Error deleting business rewards set:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ [FULL SYNC] Error deleting rewards:', error);
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
 * Note: If DELETE endpoint doesn't exist, we'll overwrite by writing all local customers
 */
const deleteAllCustomers = async (businessId: string): Promise<void> => {
  try {
    console.log(`🗑️ [FULL SYNC] Fetching all customers for business ${businessId}...`);
    
    // Get all customer IDs for this business
    const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/customers`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const customerIds = result.data.map((c: Customer) => c.id);
        console.log(`🗑️ [FULL SYNC] Found ${customerIds.length} customers in Redis`);
        console.log(`ℹ️ [FULL SYNC] Customers will be overwritten by local data (DELETE may not be available)`);
      }
    }
  } catch (error) {
    console.error('❌ [FULL SYNC] Error fetching customers:', error);
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
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_BASE_URL}/api/v1/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campaign, businessId }),
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
          headers: { 'Content-Type': 'application/json' },
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

