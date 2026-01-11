/**
 * Reward Utility Functions
 * 
 * Helper functions for working with rewards in DB format
 */

import type { Reward } from '../types';

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

