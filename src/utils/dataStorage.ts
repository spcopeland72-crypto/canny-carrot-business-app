// Simple localStorage-based storage for web compatibility
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Products storage
export const saveProducts = async (products: string[]) => {
  try {
    if (isWeb) {
      localStorage.setItem('canny_carrot_products', JSON.stringify(products));
    }
  } catch (error) {
    console.error('Error saving products:', error);
  }
};

export const loadProducts = async (): Promise<string[]> => {
  try {
    if (isWeb) {
      const stored = localStorage.getItem('canny_carrot_products');
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
  return [];
};

// Rewards storage
export const saveRewards = async (rewards: any[]) => {
  try {
    if (isWeb) {
      localStorage.setItem('canny_carrot_rewards', JSON.stringify(rewards));
    }
  } catch (error) {
    console.error('Error saving rewards:', error);
  }
};

export const loadRewards = async (): Promise<any[]> => {
  try {
    if (isWeb) {
      const stored = localStorage.getItem('canny_carrot_rewards');
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading rewards:', error);
  }
  return [];
};

// Campaigns storage
export const saveCampaigns = async (campaigns: any[]) => {
  try {
    if (isWeb) {
      localStorage.setItem('canny_carrot_campaigns', JSON.stringify(campaigns));
    }
  } catch (error) {
    console.error('Error saving campaigns:', error);
  }
};

export const loadCampaigns = async (): Promise<any[]> => {
  try {
    if (isWeb) {
      const stored = localStorage.getItem('canny_carrot_campaigns');
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading campaigns:', error);
  }
  return [];
};
