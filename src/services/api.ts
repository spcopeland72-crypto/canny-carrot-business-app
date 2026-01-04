/**
 * Canny Carrot API Service
 * Connects Business App to Redis-backed API
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Types
export interface Business {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    region: string;
  };
  category: string;
  bidId?: string;
  logo?: string;
  description?: string;
  createdAt: string;
  settings: {
    stampValidationMethod: 'qr' | 'code' | 'nfc' | 'manual';
    autoRewardEnabled: boolean;
    notificationsEnabled: boolean;
  };
  stats: {
    totalMembers: number;
    totalStampsIssued: number;
    totalRedemptions: number;
    activeRewards: number;
  };
}

export interface Reward {
  id: string;
  businessId: string;
  name: string;
  description: string;
  stampsRequired: number;
  type: 'product' | 'discount' | 'freebie' | 'experience';
  value?: number;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  maxRedemptions?: number;
  currentRedemptions: number;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  stampCount: number;
  totalRedemptions: number;
  lastVisit?: string;
}

export interface Campaign {
  id: string;
  businessId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  type: 'double_stamps' | 'bonus_reward' | 'flash_sale' | 'referral';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  targetAudience: 'all' | 'new' | 'returning' | 'inactive';
  conditions?: Record<string, any>;
}

export interface StampResult {
  stamp: any;
  currentStampCount: number;
  rewardAvailable: boolean;
  reward: Reward | null;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Helper for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================
// BUSINESS ENDPOINTS
// ============================================

export const businessApi = {
  // Register a new business
  async register(businessData: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      postcode: string;
    };
    category: string;
    description?: string;
  }): Promise<ApiResponse<Business>> {
    return apiCall<Business>('/businesses', {
      method: 'POST',
      body: JSON.stringify(businessData),
    });
  },

  // Get business by ID
  async getById(id: string): Promise<ApiResponse<Business>> {
    return apiCall<Business>(`/businesses/${id}`);
  },

  // Update business profile
  async update(id: string, updates: Partial<Business>): Promise<ApiResponse<Business>> {
    return apiCall<Business>(`/businesses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Get business statistics
  async getStats(id: string, period: string = 'month'): Promise<ApiResponse<any>> {
    return apiCall(`/analytics/business/${id}?period=${period}`);
  },

  // Get business members/customers
  async getMembers(id: string, page: number = 1, limit: number = 20): Promise<ApiResponse<Customer[]>> {
    return apiCall<Customer[]>(`/businesses/${id}/members?page=${page}&limit=${limit}`);
  },
};

// ============================================
// REWARD ENDPOINTS
// ============================================

export const rewardApi = {
  // Create a new reward
  async create(rewardData: {
    businessId: string;
    name: string;
    description: string;
    stampsRequired: number;
    type: 'product' | 'discount' | 'freebie' | 'experience';
    value?: number;
    expiresAt?: string;
    maxRedemptions?: number;
  }): Promise<ApiResponse<Reward>> {
    return apiCall<Reward>('/rewards', {
      method: 'POST',
      body: JSON.stringify(rewardData),
    });
  },

  // Get rewards for a business
  async getByBusiness(businessId: string, activeOnly: boolean = true): Promise<ApiResponse<Reward[]>> {
    return apiCall<Reward[]>(`/rewards?businessId=${businessId}&active=${activeOnly}`);
  },

  // Get reward by ID
  async getById(id: string): Promise<ApiResponse<Reward>> {
    return apiCall<Reward>(`/rewards/${id}`);
  },

  // Update a reward
  async update(id: string, updates: Partial<Reward>): Promise<ApiResponse<Reward>> {
    return apiCall<Reward>(`/rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Deactivate a reward
  async deactivate(id: string): Promise<ApiResponse<void>> {
    return apiCall(`/rewards/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// STAMP ENDPOINTS
// ============================================

export const stampApi = {
  // Issue a stamp to a customer
  async issue(data: {
    memberId: string;
    businessId: string;
    rewardId?: string;
    method?: 'qr' | 'code' | 'manual';
    staffId?: string;
  }): Promise<ApiResponse<StampResult>> {
    return apiCall<StampResult>('/stamps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Redeem a reward
  async redeem(data: {
    memberId: string;
    businessId: string;
    rewardId: string;
    staffId?: string;
  }): Promise<ApiResponse<any>> {
    return apiCall('/stamps/redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Check customer's stamp count
  async check(memberId: string, businessId: string): Promise<ApiResponse<{
    stampCount: number;
    availableRewards: Reward[];
    nextReward: Reward | null;
    stampsUntilNextReward: number | null;
  }>> {
    return apiCall(`/stamps/check?memberId=${memberId}&businessId=${businessId}`);
  },
};

// ============================================
// CAMPAIGN ENDPOINTS (to be implemented)
// ============================================

export const campaignApi = {
  // Create a campaign
  async create(campaignData: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    return apiCall<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  },

  // Get campaigns for a business
  async getByBusiness(businessId: string): Promise<ApiResponse<Campaign[]>> {
    return apiCall<Campaign[]>(`/campaigns?businessId=${businessId}`);
  },

  // Update campaign
  async update(id: string, updates: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    return apiCall<Campaign>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Activate/deactivate campaign
  async setStatus(id: string, status: Campaign['status']): Promise<ApiResponse<Campaign>> {
    return apiCall<Campaign>(`/campaigns/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

export const analyticsApi = {
  // Get daily stats
  async getDaily(days: number = 7): Promise<ApiResponse<any[]>> {
    return apiCall(`/analytics/daily?days=${days}`);
  },

  // Get business analytics
  async getBusiness(businessId: string, period: string = 'month'): Promise<ApiResponse<any>> {
    return apiCall(`/analytics/business/${businessId}?period=${period}`);
  },

  // Get regional stats (for BID managers)
  async getRegional(period: string = 'month'): Promise<ApiResponse<any>> {
    return apiCall(`/analytics/regional?period=${period}`);
  },

  // Get leaderboard
  async getLeaderboard(category?: string, limit: number = 10): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (category) params.append('category', category);
    return apiCall(`/analytics/leaderboard?${params}`);
  },
};

// ============================================
// QR CODE GENERATION
// ============================================

export const qrApi = {
  // Generate QR code data for stamping
  generateStampQR(businessId: string, rewardId?: string): string {
    const data = {
      type: 'stamp',
      businessId,
      rewardId,
      timestamp: Date.now(),
    };
    return JSON.stringify(data);
  },

  // Generate QR code data for customer to show
  generateCustomerQR(memberId: string): string {
    const data = {
      type: 'customer',
      memberId,
      timestamp: Date.now(),
    };
    return JSON.stringify(data);
  },

  // Parse scanned QR code
  parseQR(qrData: string): {
    type: 'stamp' | 'customer' | 'unknown';
    data: any;
  } {
    try {
      const parsed = JSON.parse(qrData);
      return {
        type: parsed.type || 'unknown',
        data: parsed,
      };
    } catch {
      return { type: 'unknown', data: null };
    }
  },
};

export default {
  business: businessApi,
  reward: rewardApi,
  stamp: stampApi,
  campaign: campaignApi,
  analytics: analyticsApi,
  qr: qrApi,
};




















