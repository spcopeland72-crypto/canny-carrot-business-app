/**
 * Manage Customers data: always from index, no timestamps, no cache.
 * Fetched at login and when the Manage Customers screen is shown.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiBaseUrl = (): string => {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (apiUrl) return apiUrl;
  if (Platform.OS === 'web') {
    return process.env.API_BASE_URL || 'https://api.cannycarrot.com';
  }
  return 'https://api.cannycarrot.com';
};

export interface TokenWithCustomersItem {
  tokenId: string;
  type: 'reward' | 'campaign';
  name: string;
  customers: Array<{
    customerId: string;
    customerName: string;
    pointsEarned: number;
    pointsRequired: number;
    lastScanAt: string | null;
    scansLast30: number;
    scansLast90: number;
    totalScans: number;
  }>;
}

/**
 * Fetch tokens/with-customers from the API. No cache, no timestamps — latest from index.
 */
export const fetchManageCustomersData = async (
  businessId: string
): Promise<TokenWithCustomersItem[] | null> => {
  const base = getApiBaseUrl();
  const url = `${base}/api/v1/businesses/${businessId}/tokens/with-customers`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.warn('[ManageCustomers] API not ok:', res.status, url);
    return null;
  }
  const json = await res.json();
  const list = json.data?.tokens ?? [];
  const tokens = Array.isArray(list) ? list : [];
  const rewards = tokens.filter((t) => t.type === 'reward');
  const campaigns = tokens.filter((t) => t.type === 'campaign');
  console.log('[ManageCustomers] API response:', {
    url,
    tokenCount: tokens.length,
    rewardTokens: rewards.length,
    campaignTokens: campaigns.length,
    rewardCustomers: rewards.map((t) => ({ name: t.name, customers: (t.customers ?? []).length })),
    campaignCustomers: campaigns.map((t) => ({ name: t.name, customers: (t.customers ?? []).length })),
  });
  return tokens;
};
