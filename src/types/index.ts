/**
 * Type definitions for Canny Carrot Business App
 */

// ============================================
// CUSTOMER TYPES
// ============================================

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  stamps?: number;
  rewards?: number;
  lastVisit?: string;
}

// ============================================
// REWARD TYPES
// ============================================

export type RewardStatus = 'live' | 'draft' | 'archived';

export interface Reward {
  id: string;
  name: string;
  type: 'product' | 'action';
  requirement: number;
  rewardType: 'free_product' | 'discount' | 'other';
  productId?: string;
  action?: string;
  description?: string;
  status?: RewardStatus; // live, draft, or archived
  qrCode?: string;
  pinCode?: string; // 4-digit PIN code required for redemption
  selectedProducts?: string[];
  selectedActions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// CAMPAIGN TYPES
// ============================================

export type CampaignStatus = 'live' | 'draft' | 'archived';

export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  reward: Reward;
  status: CampaignStatus; // live, draft, or archived
  description?: string;
  qrCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// CUSTOMER SCAN TRACKING
// ============================================

/**
 * Tracks a customer's progress on a specific reward
 */
export interface CustomerRewardProgress {
  rewardId: string;
  rewardName: string;
  pointsEarned: number;        // Current points count
  pointsRequired: number;      // Points needed to earn reward
  rewardEarned: boolean;       // Has customer earned the reward?
  rewardRedeemed: boolean;     // Has customer redeemed the reward?
  earnedAt?: string;           // When reward was earned
  redeemedAt?: string;         // When reward was redeemed
  lastScanAt: string;          // Last time this reward was scanned
  scanHistory: ScanRecord[];   // History of all scans
}

/**
 * Individual scan record
 */
export interface ScanRecord {
  timestamp: string;
  pointsAwarded: number;
  location?: string;           // Optional: where scan occurred
}

/**
 * Tracks a customer's progress on a specific campaign
 */
export interface CustomerCampaignProgress {
  campaignId: string;
  campaignName: string;
  pointsEarned: number;
  pointsRequired: number;
  rewardEarned: boolean;
  rewardRedeemed: boolean;
  earnedAt?: string;
  redeemedAt?: string;
  lastScanAt: string;
  scanHistory: ScanRecord[];
}

/**
 * All tracking data for a single customer at this business
 */
export interface CustomerScanData {
  customerId: string;
  firstScanAt: string;
  lastScanAt: string;
  totalScans: number;
  rewards: Record<string, CustomerRewardProgress>;     // rewardId -> progress
  campaigns: Record<string, CustomerCampaignProgress>; // campaignId -> progress
}

// ============================================
// BUSINESS PROFILE & RECORD
// ============================================

export interface BusinessProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  logo?: string;
  additionalFiles?: string[];  // Flyers, menus, etc.
  companyQRCode?: string;      // Unique QR code assigned by admin (7-digit format)
  companyNumber?: string;      // Business registration number
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
  };
  category?: string;           // Business category (restaurant, retail, etc.)
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Complete Business Record stored in Redis
 * Key format: business:{businessId}
 */
export interface BusinessRecord {
  // Business profile and signup data
  profile: BusinessProfile;
  
  // All rewards organized by status
  rewards: {
    live: Reward[];
    draft: Reward[];
    archived: Reward[];
  };
  
  // All campaigns organized by status
  campaigns: {
    live: Campaign[];
    draft: Campaign[];
    archived: Campaign[];
  };
  
  // Customer scan data - keyed by customerId
  customerScans: Record<string, CustomerScanData>;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
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




