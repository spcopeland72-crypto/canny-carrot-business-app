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

// Reward type matches DB format exactly - no transformation needed
export interface Reward {
  id: string;                     // Unique ID: businessID + reward identifier
  businessId: string;
  name: string;
  description: string;
  stampsRequired: number;        // Required stamps to earn reward
  costStamps?: number;            // Alias for stampsRequired
  type: 'product' | 'discount' | 'freebie' | 'experience' | 'voucher' | 'upgrade';
  value?: number;                 // For discounts, the amount off
  isActive: boolean;              // Active status (true/false instead of status enum)
  validFrom: string;              // When reward becomes available
  validTo?: string;               // When reward expires
  expiresAt?: string;             // Legacy field (maps to validTo)
  maxRedemptions?: number;
  currentRedemptions: number;
  createdAt: string;
  updatedAt: string;
  // Customer progress tracking: customerId -> { points, actions }
  // Each customer who has scanned this reward's QR code is tracked here
  // actions: actionId -> count of times that action was completed
  customerProgress?: Record<string, {
    points: number;              // Points awarded to this customer
    actions: Record<string, number>; // actionId -> count of actions completed
  }>;
  // App-specific fields (computed at render time, not stored):
  // - icon (randomly assigned for UI)
  // - count, total (UI convenience, computed from stampsRequired)
  // Business app specific fields (stored in DB but not in core type):
  qrCode?: string;                // QR code data
  pinCode?: string;               // 4-digit PIN for redemption
  selectedProducts?: string[];    // Product IDs for product rewards
  selectedActions?: string[];     // Action types for action rewards
  pointsPerPurchase?: number;     // Points per purchase/action
}

// ============================================
// CAMPAIGN TYPES
// ============================================

export type CampaignType = 
  | 'double_stamps'    // 2x stamps for every purchase
  | 'bonus_reward'     // Extra bonus on top of regular reward
  | 'flash_sale'       // Limited time discount
  | 'referral'         // Referral bonus campaign
  | 'birthday'         // Birthday rewards
  | 'happy_hour'       // Time-based promotions
  | 'loyalty_tier';    // VIP tier unlock

export type CampaignStatus = 
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface CampaignConditions {
  bonusStamps?: number;
  discountPercent?: number;
  minPurchase?: number;
  maxUsesPerMember?: number;
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  startTime?: string; // HH:MM format
  endTime?: string;
  // Business app specific: store reward data in conditions
  rewardData?: {
    selectedProducts?: string[];
    selectedActions?: string[];
    pinCode?: string;
    qrCode?: string;
    stampsRequired?: number;
    pointsPerPurchase?: number;
    rewardType?: 'free_product' | 'discount' | 'other';
  };
}

export interface CampaignStats {
  impressions: number;
  clicks: number;
  conversions: number;
}

// Campaign type matches API exactly
export interface Campaign {
  id: string;                    // Unique ID: businessID + campaign identifier
  businessId: string;
  name: string;
  description: string;
  type: CampaignType;
  objective?: 'reactivate' | 'upsell' | 'retention' | 'acquisition' | 'engagement';
  startDate: string;
  startAt?: string;              // Alias for startDate
  endDate: string;
  endAt?: string;                // Alias for endDate
  status: CampaignStatus;
  targetAudience: 'all' | 'new' | 'returning' | 'inactive';
  segmentId?: string;            // Link to Segment entity
  conditions?: CampaignConditions;
  channelMasks?: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
    geo: boolean;
  };
  notificationMessage?: string;
  // Customer progress tracking: customerId -> { points, actions }
  // Each customer who has scanned this campaign's QR code is tracked here
  // actions: actionId -> count of times that action was completed
  customerProgress?: Record<string, {
    points: number;              // Points awarded to this customer
    actions: Record<string, number>; // actionId -> count of actions completed
  }>;
  createdAt: string;
  updatedAt: string;
  stats: CampaignStats;
  // App-specific fields (same as Reward - stored directly, not nested)
  qrCode?: string;                // QR code data
  pinCode?: string;               // 4-digit PIN for redemption
  selectedProducts?: string[];    // Product IDs for product campaigns (same as Reward)
  selectedActions?: string[];     // Action types for action campaigns (same as Reward)
  pointsPerPurchase?: number;     // Points per purchase/action (same as Reward)
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
  logo?: string;              // Full logo image (base64 data URI)
  logoIcon?: string;          // Circular icon version of logo (64x64, optimized for app use)
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
  products?: string[];        // List of products created by this business
  actions?: string[];         // List of actions created by this business
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
  | 'OnlineAdmin'
  | 'Settings'
  | 'Analytics'
  | 'Products'
  | 'Reports'
  | 'About'
  | 'EventLog'
  | 'Messages'
  | 'MessageChat'
  | 'HelpGettingStarted'
  | 'HelpCustomers'
  | 'HelpRewards'
  | 'HelpCampaigns'
  | 'HelpAnalytics'
  | 'HelpContact'
  | string; // For dynamic routes like EditCustomer1, EditReward1, etc.




