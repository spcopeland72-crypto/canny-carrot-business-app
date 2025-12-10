/**
 * Type definitions for Canny Carrot Business App
 */

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  stamps?: number;
  rewards?: number;
  lastVisit?: string;
}

export interface Reward {
  id: string;
  name: string;
  type: 'product' | 'action';
  requirement: number;
  rewardType: 'free_product' | 'discount' | 'other';
  productId?: string;
  action?: string;
  description?: string;
}

export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  reward: Reward;
  status: 'active' | 'inactive' | 'completed';
}

export interface BusinessProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  logo?: string;
  additionalFiles?: string[];
}

export type ScreenName = 
  | 'Home'
  | 'Search'
  | 'Rewards'
  | 'Scan'
  | 'Help'
  | 'More'
  | 'Chat'
  | 'Customers'
  | 'AddCustomer'
  | 'Business'
  | 'AllRewards'
  | 'CreateReward'
  | 'AllCampaigns'
  | 'CreateCampaign'
  | 'Settings'
  | 'Analytics'
  | 'Products'
  | 'Reports'
  | 'About'
  | 'HelpGettingStarted'
  | 'HelpCustomers'
  | 'HelpRewards'
  | 'HelpCampaigns'
  | 'HelpAnalytics'
  | 'HelpContact'
  | string; // For dynamic routes like EditCustomer1, EditReward1, etc.

