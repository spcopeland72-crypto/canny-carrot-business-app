/**
 * Business Data Service
 * Handles pre-populating business data from admin registration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BusinessProfile } from '../types';

const BUSINESS_DATA_KEY = 'business_profile_data';

/**
 * Pre-populate business data from admin registration
 */
export const prePopulateBusinessData = async (businessData: Partial<BusinessProfile>): Promise<void> => {
  try {
    // Store business data from admin registration
    await AsyncStorage.setItem(BUSINESS_DATA_KEY, JSON.stringify(businessData));
    console.log('✅ Business data pre-populated:', businessData);
  } catch (error) {
    console.error('Error pre-populating business data:', error);
  }
};

/**
 * Get pre-populated business data
 */
export const getPrePopulatedBusinessData = async (): Promise<Partial<BusinessProfile> | null> => {
  try {
    const data = await AsyncStorage.getItem(BUSINESS_DATA_KEY);
    if (data) {
      return JSON.parse(data) as Partial<BusinessProfile>;
    }
    return null;
  } catch (error) {
    console.error('Error getting pre-populated business data:', error);
    return null;
  }
};

/**
 * Clear pre-populated business data (after successful setup)
 */
export const clearPrePopulatedBusinessData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(BUSINESS_DATA_KEY);
  } catch (error) {
    console.error('Error clearing pre-populated business data:', error);
  }
};

const API_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * Sync business data from admin/Redis database
 * This is called after login to fetch the latest business data from the database
 */
export const syncBusinessDataFromAdmin = async (businessId: string): Promise<Partial<BusinessProfile> | null> => {
  try {
    // Fetch business data from API/Redis
    const response = await fetch(`${API_BASE_URL}/businesses/${businessId}`);
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch business data');
    }
    
    const businessData = result.data;
    
    // Map API business data to BusinessProfile format
    const businessProfile: Partial<BusinessProfile> = {
      id: businessData.id || businessData.profile?.id || businessId,
      name: businessData.name || businessData.profile?.name || '',
      email: businessData.email || businessData.profile?.email || '',
      phone: businessData.phone || businessData.profile?.phone || '',
      addressLine1: businessData.address?.line1 || businessData.profile?.addressLine1 || '',
      addressLine2: businessData.address?.line2 || businessData.profile?.addressLine2 || '',
      city: businessData.address?.city || businessData.profile?.city || '',
      postcode: businessData.address?.postcode || businessData.profile?.postcode || '',
      country: businessData.profile?.country || 'UK',
      logo: businessData.logo || businessData.profile?.logo,
      website: businessData.profile?.website,
      socialMedia: businessData.profile?.socialMedia,
      category: businessData.category || businessData.profile?.category,
      description: businessData.description || businessData.profile?.description,
      companyNumber: businessData.profile?.companyNumber,
      createdAt: businessData.createdAt || businessData.profile?.createdAt,
      updatedAt: businessData.updatedAt || businessData.profile?.updatedAt,
    };
    
    // Store the fetched data locally
    await prePopulateBusinessData(businessProfile);
    
    return businessProfile;
  } catch (error) {
    console.error('Error syncing business data from admin:', error);
    // Fallback to pre-populated data if available
    return await getPrePopulatedBusinessData();
  }
};

/**
 * Sync member (customer) data from Redis database
 * Pulls all members for this business and stores them locally
 */
export const syncMemberDataFromRedis = async (businessId: string): Promise<any[]> => {
  try {
    // Fetch all members for this business from API
    // This endpoint returns paginated results, so we'll fetch in batches
    let allMembers: any[] = [];
    let page = 1;
    const limit = 100; // Fetch 100 members per page
    
    while (true) {
      const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/members?page=${page}&limit=${limit}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        break;
      }
      
      const members = result.data || [];
      if (members.length === 0) {
        break; // No more members
      }
      
      allMembers = [...allMembers, ...members];
      
      // Check if there are more pages
      const total = result.meta?.total || 0;
      if (allMembers.length >= total) {
        break; // Fetched all members
      }
      
      page++;
    }
    
    // Store members locally in AsyncStorage
    const MEMBERS_STORAGE_KEY = `business_${businessId}_members`;
    await AsyncStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(allMembers));
    
    console.log(`✅ Synced ${allMembers.length} members from Redis for business ${businessId}`);
    
    return allMembers;
  } catch (error) {
    console.error('Error syncing member data from Redis:', error);
    return [];
  }
};

