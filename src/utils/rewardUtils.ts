/**
 * Reward and Campaign Utility Functions
 * 
 * Helper functions for working with rewards and campaigns in DB format
 */

import type { Reward, Campaign } from '../types';

/**
 * Compute UI display fields from DB format reward
 * Note: icon is NOT stored - rewards use the business logo instead
 */
export const getRewardDisplayFields = (reward: Reward) => {
  return {
    count: 0, // Business app doesn't track customer progress
    total: reward.stampsRequired || reward.costStamps || 10,
    // Icon is the business logo, not stored per reward
  };
};

/**
 * Map DB format reward type to UI form fields
 * For CreateEditRewardPage form
 */
export const mapDbRewardToFormFields = (reward: Reward) => {
  // Map DB type to UI type and rewardType
  let uiType: 'product' | 'action' = 'product';
  let uiRewardType: 'free_product' | 'discount' | 'other' = 'free_product';
  
  if (reward.type === 'discount') {
    uiRewardType = 'discount';
  } else if (reward.type === 'freebie' || reward.type === 'product') {
    uiRewardType = 'free_product';
  } else {
    uiRewardType = 'other';
  }
  
  // DB type doesn't have 'action' - it's inferred from context
  // For now, default to 'product'
  uiType = 'product';
  
  return {
    name: reward.name,
    requirement: reward.stampsRequired?.toString() || reward.costStamps?.toString() || '10',
    type: uiType,
    rewardType: uiRewardType,
    selectedProducts: reward.selectedProducts || [],
    selectedActions: reward.selectedActions || [],
    pinCode: reward.pinCode || '',
    pointsPerPurchase: reward.pointsPerPurchase?.toString() || '1',
  };
};

/**
 * Campaign icon pool - randomly assigned for UI display
 */
const CAMPAIGN_ICONS = ['🎄', '🎆', '💝', '🌸', '🎃', '🎁', '🎉', '🏆', '🎯', '🎊', '🌟', '⭐', '🎪', '🎨', '🎭'];

/**
 * Compute UI display fields from DB format campaign
 * Note: icon is NOT stored - randomly assigned for UI consistency
 */
export const getCampaignDisplayFields = (campaign: Campaign): {
  icon: string;
  count: number;
  total: number;
} => {
  // Use campaign ID to deterministically assign icon (consistent per campaign)
  const iconIndex = parseInt(campaign.id.slice(-2) || '0', 10) % CAMPAIGN_ICONS.length;
  const icon = CAMPAIGN_ICONS[iconIndex];
  
  // Get total from rewardData if available, otherwise default
  const total = campaign.conditions?.rewardData?.stampsRequired || 10;
  
  // Count is from customerProgress (sum of all customer points)
  // customerProgress is Record<string, { points: number; actions: Record<string, number> }>
  let count = 0;
  if (campaign.customerProgress) {
    count = Object.values(campaign.customerProgress).reduce((sum, progress) => {
      if (typeof progress === 'object' && progress !== null && 'points' in progress) {
        return sum + (progress.points || 0);
      }
      // Backward compatibility: if it's just a number
      return sum + (typeof progress === 'number' ? progress : 0);
    }, 0);
  }
  
  return {
    icon,
    count,
    total,
  };
};

