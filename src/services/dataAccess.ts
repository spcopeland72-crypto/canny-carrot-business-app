/**
 * Data Access Layer - Business App
 * 
 * Provides unified API for reading/writing data with automatic sync
 * All operations are offline-first: write locally, sync in background
 * 
 * Redis Structure per Business:
 * - business:{id} -> BusinessRecord (profile, rewards, campaigns, customerScans)
 * - business:{id}:rewards -> Set of reward IDs
 * - business:{id}:campaigns -> Set of campaign IDs
 * - business:{id}:customers -> Set of customer IDs who have scanned
 */

import { storage } from './localStorage';
import { queueOperation, addSyncMetadata, markDirty, markSynced } from './syncManager';
import type { 
  Customer, 
  Reward, 
  Campaign, 
  BusinessProfile,
  BusinessRecord,
  CustomerScanData,
  CustomerRewardProgress,
  CustomerCampaignProgress,
  ScanRecord,
} from '../types';
import type { SyncableEntity } from '../types/sync';

// Storage key prefixes
const KEYS = {
  BUSINESS: 'business:',
  BUSINESS_RECORD: 'businessRecord:',
  CUSTOMER: 'customer:',
  REWARD: 'reward:',
  CAMPAIGN: 'campaign:',
  CUSTOMER_SCANS: 'customerScans:',
};

/**
 * Business Profile Operations
 */
export const businessData = {
  /**
   * Get business profile
   */
  get: async (businessId: string): Promise<BusinessProfile & SyncableEntity | null> => {
    return await storage.get<BusinessProfile & SyncableEntity>(`${KEYS.BUSINESS}${businessId}`);
  },

  /**
   * Save business profile (offline-first)
   */
  save: async (business: BusinessProfile): Promise<void> => {
    const existing = await businessData.get(business.id);
    const entity = existing
      ? markDirty({ ...existing, ...business })
      : addSyncMetadata(business, true);

    await storage.set(`${KEYS.BUSINESS}${business.id}`, entity);
    await queueOperation('update', 'business', business.id, entity);
  },
};

/**
 * Customer Operations
 */
export const customerData = {
  /**
   * Get all customers for a business
   */
  getAll: async (businessId: string): Promise<(Customer & SyncableEntity)[]> => {
    // Get all customer keys for this business
    const allCustomers = await storage.getAll<Customer & SyncableEntity>(KEYS.CUSTOMER);
    // Filter by businessId if stored, or return all (simplified)
    return allCustomers;
  },

  /**
   * Get single customer
   */
  get: async (customerId: string): Promise<(Customer & SyncableEntity) | null> => {
    return await storage.get<Customer & SyncableEntity>(`${KEYS.CUSTOMER}${customerId}`);
  },

  /**
   * Create customer (offline-first)
   */
  create: async (customer: Customer, businessId: string): Promise<void> => {
    const entity = addSyncMetadata({ ...customer, businessId }, true);
    await storage.set(`${KEYS.CUSTOMER}${customer.id}`, entity);
    await queueOperation('create', 'customer', customer.id, entity);
  },

  /**
   * Update customer (offline-first)
   */
  update: async (customer: Customer): Promise<void> => {
    const existing = await customerData.get(customer.id);
    const entity = existing
      ? markDirty({ ...existing, ...customer })
      : addSyncMetadata(customer, true);

    await storage.set(`${KEYS.CUSTOMER}${customer.id}`, entity);
    await queueOperation('update', 'customer', customer.id, entity);
  },

  /**
   * Delete customer (offline-first)
   */
  delete: async (customerId: string): Promise<void> => {
    await storage.delete(`${KEYS.CUSTOMER}${customerId}`);
    await queueOperation('delete', 'customer', customerId);
  },
};

/**
 * Reward Operations
 */
export const rewardData = {
  /**
   * Get all rewards for a business
   */
  getAll: async (businessId: string): Promise<(Reward & SyncableEntity)[]> => {
    const allRewards = await storage.getAll<Reward & SyncableEntity>(KEYS.REWARD);
    // Filter by businessId if stored, or return all (simplified)
    return allRewards;
  },

  /**
   * Get single reward
   */
  get: async (rewardId: string): Promise<(Reward & SyncableEntity) | null> => {
    return await storage.get<Reward & SyncableEntity>(`${KEYS.REWARD}${rewardId}`);
  },

  /**
   * Create reward (offline-first)
   */
  create: async (reward: Reward, businessId: string): Promise<void> => {
    const entity = addSyncMetadata({ ...reward, businessId }, true);
    await storage.set(`${KEYS.REWARD}${reward.id}`, entity);
    await queueOperation('create', 'reward', reward.id, entity);
  },

  /**
   * Update reward (offline-first)
   */
  update: async (reward: Reward): Promise<void> => {
    const existing = await rewardData.get(reward.id);
    const entity = existing
      ? markDirty({ ...existing, ...reward })
      : addSyncMetadata(reward, true);

    await storage.set(`${KEYS.REWARD}${reward.id}`, entity);
    await queueOperation('update', 'reward', reward.id, entity);
  },

  /**
   * Delete reward (offline-first)
   */
  delete: async (rewardId: string): Promise<void> => {
    await storage.delete(`${KEYS.REWARD}${rewardId}`);
    await queueOperation('delete', 'reward', rewardId);
  },
};

/**
 * Campaign Operations
 */
export const campaignData = {
  /**
   * Get all campaigns for a business
   */
  getAll: async (businessId: string): Promise<(Campaign & SyncableEntity)[]> => {
    const allCampaigns = await storage.getAll<Campaign & SyncableEntity>(KEYS.CAMPAIGN);
    // Filter by businessId if stored, or return all (simplified)
    return allCampaigns;
  },

  /**
   * Get single campaign
   */
  get: async (campaignId: string): Promise<(Campaign & SyncableEntity) | null> => {
    return await storage.get<Campaign & SyncableEntity>(`${KEYS.CAMPAIGN}${campaignId}`);
  },

  /**
   * Create campaign (offline-first)
   */
  create: async (campaign: Campaign, businessId: string): Promise<void> => {
    const entity = addSyncMetadata({ ...campaign, businessId }, true);
    await storage.set(`${KEYS.CAMPAIGN}${campaign.id}`, entity);
    await queueOperation('create', 'campaign', campaign.id, entity);
  },

  /**
   * Update campaign (offline-first)
   */
  update: async (campaign: Campaign): Promise<void> => {
    const existing = await campaignData.get(campaign.id);
    const entity = existing
      ? markDirty({ ...existing, ...campaign })
      : addSyncMetadata(campaign, true);

    await storage.set(`${KEYS.CAMPAIGN}${campaign.id}`, entity);
    await queueOperation('update', 'campaign', campaign.id, entity);
  },

  /**
   * Delete campaign (offline-first)
   */
  delete: async (campaignId: string): Promise<void> => {
    await storage.delete(`${KEYS.CAMPAIGN}${campaignId}`);
    await queueOperation('delete', 'campaign', campaignId);
  },
};

/**
 * Customer Scan Tracking Operations
 * Tracks customer scans, points, earned rewards, and redemptions
 */
export const customerScanData = {
  /**
   * Get all customer scans for a business
   */
  getAll: async (businessId: string): Promise<Record<string, CustomerScanData>> => {
    const data = await storage.get<Record<string, CustomerScanData>>(
      `${KEYS.CUSTOMER_SCANS}${businessId}`
    );
    return data || {};
  },

  /**
   * Get scan data for a specific customer
   */
  getCustomer: async (businessId: string, customerId: string): Promise<CustomerScanData | null> => {
    const allScans = await customerScanData.getAll(businessId);
    return allScans[customerId] || null;
  },

  /**
   * Record a reward scan from a customer
   */
  recordRewardScan: async (
    businessId: string,
    customerId: string,
    reward: Reward,
    pointsAwarded: number = 1
  ): Promise<CustomerRewardProgress> => {
    const now = new Date().toISOString();
    const allScans = await customerScanData.getAll(businessId);
    
    // Initialize customer data if new
    if (!allScans[customerId]) {
      allScans[customerId] = {
        customerId,
        firstScanAt: now,
        lastScanAt: now,
        totalScans: 0,
        rewards: {},
        campaigns: {},
      };
    }
    
    const customerData = allScans[customerId];
    customerData.lastScanAt = now;
    customerData.totalScans += 1;
    
    // Initialize reward progress if new
    if (!customerData.rewards[reward.id]) {
      customerData.rewards[reward.id] = {
        rewardId: reward.id,
        rewardName: reward.name,
        pointsEarned: 0,
        pointsRequired: reward.requirement,
        rewardEarned: false,
        rewardRedeemed: false,
        lastScanAt: now,
        scanHistory: [],
      };
    }
    
    const rewardProgress = customerData.rewards[reward.id];
    rewardProgress.pointsEarned += pointsAwarded;
    rewardProgress.lastScanAt = now;
    rewardProgress.scanHistory.push({
      timestamp: now,
      pointsAwarded,
    });
    
    // Check if reward is earned
    if (rewardProgress.pointsEarned >= rewardProgress.pointsRequired && !rewardProgress.rewardEarned) {
      rewardProgress.rewardEarned = true;
      rewardProgress.earnedAt = now;
    }
    
    // Save locally
    await storage.set(`${KEYS.CUSTOMER_SCANS}${businessId}`, allScans);
    
    // Queue sync to Redis
    await queueOperation('update', 'customerScans', businessId, {
      businessId,
      customerId,
      rewardId: reward.id,
      ...rewardProgress,
    });
    
    return rewardProgress;
  },

  /**
   * Record a campaign scan from a customer
   */
  recordCampaignScan: async (
    businessId: string,
    customerId: string,
    campaign: Campaign,
    pointsAwarded: number = 1
  ): Promise<CustomerCampaignProgress> => {
    const now = new Date().toISOString();
    const allScans = await customerScanData.getAll(businessId);
    
    // Initialize customer data if new
    if (!allScans[customerId]) {
      allScans[customerId] = {
        customerId,
        firstScanAt: now,
        lastScanAt: now,
        totalScans: 0,
        rewards: {},
        campaigns: {},
      };
    }
    
    const customerData = allScans[customerId];
    customerData.lastScanAt = now;
    customerData.totalScans += 1;
    
    // Initialize campaign progress if new
    if (!customerData.campaigns[campaign.id]) {
      customerData.campaigns[campaign.id] = {
        campaignId: campaign.id,
        campaignName: campaign.name,
        pointsEarned: 0,
        pointsRequired: campaign.reward?.requirement || 1,
        rewardEarned: false,
        rewardRedeemed: false,
        lastScanAt: now,
        scanHistory: [],
      };
    }
    
    const campaignProgress = customerData.campaigns[campaign.id];
    campaignProgress.pointsEarned += pointsAwarded;
    campaignProgress.lastScanAt = now;
    campaignProgress.scanHistory.push({
      timestamp: now,
      pointsAwarded,
    });
    
    // Check if reward is earned
    if (campaignProgress.pointsEarned >= campaignProgress.pointsRequired && !campaignProgress.rewardEarned) {
      campaignProgress.rewardEarned = true;
      campaignProgress.earnedAt = now;
    }
    
    // Save locally
    await storage.set(`${KEYS.CUSTOMER_SCANS}${businessId}`, allScans);
    
    // Queue sync to Redis
    await queueOperation('update', 'customerScans', businessId, {
      businessId,
      customerId,
      campaignId: campaign.id,
      ...campaignProgress,
    });
    
    return campaignProgress;
  },

  /**
   * Mark a reward as redeemed
   */
  redeemReward: async (
    businessId: string,
    customerId: string,
    rewardId: string
  ): Promise<CustomerRewardProgress | null> => {
    const now = new Date().toISOString();
    const allScans = await customerScanData.getAll(businessId);
    
    const customerData = allScans[customerId];
    if (!customerData || !customerData.rewards[rewardId]) {
      return null;
    }
    
    const rewardProgress = customerData.rewards[rewardId];
    if (!rewardProgress.rewardEarned) {
      return null; // Can't redeem if not earned
    }
    
    rewardProgress.rewardRedeemed = true;
    rewardProgress.redeemedAt = now;
    
    // Reset points for next cycle (if repeatable)
    rewardProgress.pointsEarned = 0;
    rewardProgress.rewardEarned = false;
    
    // Save locally
    await storage.set(`${KEYS.CUSTOMER_SCANS}${businessId}`, allScans);
    
    // Queue sync to Redis
    await queueOperation('update', 'customerScans', businessId, {
      businessId,
      customerId,
      rewardId,
      ...rewardProgress,
      action: 'redeem',
    });
    
    return rewardProgress;
  },

  /**
   * Get all customers who have scanned at this business
   */
  getAllCustomerIds: async (businessId: string): Promise<string[]> => {
    const allScans = await customerScanData.getAll(businessId);
    return Object.keys(allScans);
  },

  /**
   * Get summary stats for a business
   */
  getStats: async (businessId: string): Promise<{
    totalCustomers: number;
    totalScans: number;
    rewardsEarned: number;
    rewardsRedeemed: number;
  }> => {
    const allScans = await customerScanData.getAll(businessId);
    let totalScans = 0;
    let rewardsEarned = 0;
    let rewardsRedeemed = 0;
    
    for (const customerId of Object.keys(allScans)) {
      const customer = allScans[customerId];
      totalScans += customer.totalScans;
      
      for (const rewardId of Object.keys(customer.rewards)) {
        const reward = customer.rewards[rewardId];
        if (reward.rewardEarned) rewardsEarned++;
        if (reward.rewardRedeemed) rewardsRedeemed++;
      }
      
      for (const campaignId of Object.keys(customer.campaigns)) {
        const campaign = customer.campaigns[campaignId];
        if (campaign.rewardEarned) rewardsEarned++;
        if (campaign.rewardRedeemed) rewardsRedeemed++;
      }
    }
    
    return {
      totalCustomers: Object.keys(allScans).length,
      totalScans,
      rewardsEarned,
      rewardsRedeemed,
    };
  },
};

/**
 * Business Record Operations (Complete business data)
 */
export const businessRecordData = {
  /**
   * Get complete business record
   */
  get: async (businessId: string): Promise<BusinessRecord | null> => {
    return await storage.get<BusinessRecord>(`${KEYS.BUSINESS_RECORD}${businessId}`);
  },

  /**
   * Save complete business record
   */
  save: async (businessId: string, record: BusinessRecord): Promise<void> => {
    record.updatedAt = new Date().toISOString();
    await storage.set(`${KEYS.BUSINESS_RECORD}${businessId}`, record);
    await queueOperation('update', 'businessRecord', businessId, record);
  },

  /**
   * Initialize a new business record
   */
  initialize: async (profile: BusinessProfile): Promise<BusinessRecord> => {
    const now = new Date().toISOString();
    const record: BusinessRecord = {
      profile,
      rewards: { live: [], draft: [], archived: [] },
      campaigns: { live: [], draft: [], archived: [] },
      customerScans: {},
      createdAt: now,
      updatedAt: now,
    };
    
    await storage.set(`${KEYS.BUSINESS_RECORD}${profile.id}`, record);
    await queueOperation('create', 'businessRecord', profile.id, record);
    
    return record;
  },
};

/**
 * Helper to strip sync metadata for display
 */
export const stripSyncMetadata = <T extends SyncableEntity>(entity: T): Omit<T, '_sync'> => {
  const { _sync, ...rest } = entity;
  return rest;
};

/**
 * Helper to get entities without sync metadata
 */
export const getEntitiesWithoutSync = <T extends SyncableEntity>(
  entities: T[]
): Omit<T, '_sync'>[] => {
  return entities.map(stripSyncMetadata);
};








