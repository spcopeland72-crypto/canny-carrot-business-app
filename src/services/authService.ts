/**
 * Authentication Service for Business App
 * Handles login, invitation verification, and session management
 * Redis is the single source of truth for all authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { redis } from './redis';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get API base URL (same logic as redis.ts)
const getApiBaseUrl = (): string => {
  // Try to get from Expo constants (app.json extra.apiUrl)
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (apiUrl) return apiUrl;
  
  // Fallback to environment variable or default
  // Use production API for testing real infrastructure
  if (Platform.OS === 'web') {
    return process.env.API_BASE_URL || 'https://api.cannycarrot.com';
  }
  // For native, use production API (test against real infrastructure)
  return 'https://api.cannycarrot.com';
};

const API_BASE_URL = getApiBaseUrl();

export interface BusinessAuth {
  businessId: string;
  email: string;
  token: string;
  isAuthenticated: boolean;
  createdAt: string;
}

export interface InvitationData {
  businessId: string;
  businessName: string;
  contactEmail: string;
  contactName: string;
  invitationToken: string;
  invitationLink: string;
  expiryDate: string;
}

const AUTH_STORAGE_KEY = 'business_auth';
const INVITATION_STORAGE_KEY = 'business_invitation';

/**
 * Verify invitation token and get business data
 */
export const verifyInvitationToken = async (token: string, businessId: string): Promise<InvitationData | null> => {
  try {
    // In production, this would call an API to verify the token
    // For demo, we'll check localStorage (which would be synced from admin app via Redis)
    
    // Check if invitation exists in admin app's storage (simulated via API call)
    // For now, we'll accept any token that matches the format and fetch business data
    
    // Fetch business data from admin/Redis
    const businessData = await fetchBusinessData(businessId);
    
    if (businessData) {
      return {
        businessId: businessData.id,
        businessName: businessData.name,
        contactEmail: businessData.email,
        contactName: businessData.contactName || businessData.name,
        invitationToken: token,
        invitationLink: '',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying invitation token:', error);
    return null;
  }
};

/**
 * Fetch business data from admin/Redis
 */
const fetchBusinessData = async (businessId: string): Promise<any> => {
  try {
    // In production, this would call your backend API or Redis
    // For demo, we'll check if there's a way to access admin app's localStorage
    // or use a shared Redis instance
    
    // Simulated API call - in production, replace with actual API
    // const response = await fetch(`/api/business/${businessId}`);
    // return await response.json();
    
    // For demo, we'll return null and handle it in the UI
    // The business data should be pre-populated from the invitation
    return null;
  } catch (error) {
    console.error('Error fetching business data:', error);
    return null;
  }
};

/**
 * Create business account from invitation
 * User provides their own email and password
 */
export const createBusinessAccount = async (
  invitationData: InvitationData,
  email: string,
  password: string,
  confirmPassword: string
): Promise<BusinessAuth | null> => {
  try {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    // Call API to register business user account
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/business/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        businessId: invitationData.businessId,
        invitationToken: invitationData.invitationToken,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to create account');
    }
    
    const auth: BusinessAuth = {
      businessId: result.data.businessId,
      email: result.data.email,
      token: result.data.token,
      isAuthenticated: true,
      createdAt: new Date().toISOString(),
    };
    
    // Store authentication
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    
    // Store invitation token to mark it as used
    await AsyncStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify({
      ...invitationData,
      used: true,
      userEmail: email,
    }));
    
    return auth;
  } catch (error) {
    console.error('Error creating business account:', error);
    throw error;
  }
};

/**
 * Login with email and password
 * FIRST LOGIN: Verifies credentials against Redis database (single source of truth)
 * SUBSEQUENT LOGINS: Uses local credentials stored in AsyncStorage
 * Uses API endpoint that verifies password hash against Redis on first login
 */
export const loginBusiness = async (email: string, password: string): Promise<BusinessAuth | null> => {
  try {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if this is a subsequent login (credentials already stored locally)
    const existingAuth = await getStoredAuth();
    const isSubsequentLogin = existingAuth && existingAuth.email.toLowerCase() === email.toLowerCase();

    if (isSubsequentLogin && existingAuth) {
      // SUBSEQUENT LOGIN: Use local credentials, verify password via API
      // First login was already verified against Redis (single source of truth)
      // Use businessId from local storage instead of querying Redis
      console.log('Subsequent login - using local credentials, verifying password');
      
      // Verify password against Redis via API using stored businessId
      // This is faster than querying Redis for businessId first
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/business/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          password,
          businessId: existingAuth.businessId // Use stored businessId
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Invalid password');
      }

      // Password verified - return existing local credentials
      // No need to update local storage, credentials already exist
      console.log('✅ Subsequent login successful - using local credentials');
      return existingAuth;
    }

    // FIRST LOGIN: Verify against Redis database (single source of truth)
    console.log('First login - verifying against Redis database');

    // Step 1: Verify business exists in Redis using email index
    // Redis key structure: business:email:{email} -> businessId
    const emailKey = `business:email:${email.toLowerCase()}`;
    const businessId = await redis.get(emailKey);

    if (!businessId) {
      throw new Error('Invalid email or password');
    }

    // Step 2: Get business record from Redis to verify it exists
    // Redis key structure: business:{businessId} -> BusinessRecord (JSON)
    const businessKey = `business:${businessId}`;
    const businessData = await redis.get(businessKey);

    if (!businessData) {
      throw new Error('Business account not found in database');
    }

    // Step 3: Verify password using API endpoint
    // The API will verify password hash against Redis (single source of truth)
    // API endpoint handles bcrypt password verification
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/business/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email.toLowerCase(), 
        password,
        businessId 
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Invalid email or password');
    }

    // Step 4: Verify business still exists in Redis (single source of truth)
    const verifyBusiness = await redis.get(businessKey);
    if (!verifyBusiness) {
      throw new Error('Business account not found in database');
    }

    // Step 5: Create auth object with credentials
    const auth: BusinessAuth = {
      businessId: businessId,
      email: email.toLowerCase(),
      token: result.data?.token || generateSessionToken(),
      isAuthenticated: true,
      createdAt: new Date().toISOString(),
    };

    // Step 6: Store authentication locally for subsequent logins
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));

    // Step 7: Verify auth was stored successfully
    const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedAuth) {
      throw new Error('Failed to store authentication');
    }

    console.log('✅ First login successful - credentials stored locally for subsequent logins');
    
    // FIRST LOGIN: Download all business data to local repository
    try {
      const { downloadAllData } = await import('./localRepository');
      await downloadAllData(businessId, API_BASE_URL);
      console.log('✅ All business data downloaded to local repository');
    } catch (downloadError) {
      console.error('⚠️ Error downloading data (will retry later):', downloadError);
      // Don't fail login if download fails - user can still use app offline
    }
    
    return auth;
  } catch (error: any) {
    console.error('Error logging in:', error);
    throw error;
  }
};

/**
 * Get stored authentication
 * Returns local credentials for subsequent logins (no Redis check)
 */
export const getStoredAuth = async (): Promise<BusinessAuth | null> => {
  try {
    const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      const auth = JSON.parse(authData) as BusinessAuth;
      // Return local credentials - no Redis verification for subsequent logins
      // First login was verified against Redis, credentials are stored locally
      return auth;
    }
    return null;
  } catch (error) {
    console.error('Error getting stored auth:', error);
    return null;
  }
};

/**
 * Get stored invitation data
 */
export const getStoredInvitation = async (): Promise<InvitationData | null> => {
  try {
    const invitationData = await AsyncStorage.getItem(INVITATION_STORAGE_KEY);
    if (invitationData) {
      return JSON.parse(invitationData) as InvitationData;
    }
    return null;
  } catch (error) {
    console.error('Error getting stored invitation:', error);
    return null;
  }
};

/**
 * Logout
 */
export const logoutBusiness = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    // Optionally clear invitation data after successful setup
    // await AsyncStorage.removeItem(INVITATION_STORAGE_KEY);
  } catch (error) {
    console.error('Error logging out:', error);
  }
};

/**
 * Check if user is authenticated
 * Uses local credentials (no Redis check) - first login verified against Redis
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const auth = await getStoredAuth();
  // Subsequent logins use local credentials - no Redis verification needed
  // First login was already verified against Redis (single source of truth)
  return auth?.isAuthenticated === true;
};

/**
 * Generate session token
 */
const generateSessionToken = (): string => {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Parse invitation link parameters
 */
export const parseInvitationLink = (url: string): { token?: string; businessId?: string } => {
  try {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token') || undefined;
    const businessId = urlObj.searchParams.get('businessId') || undefined;
    return { token, businessId };
  } catch (error) {
    // Handle deep link format: cannycarrot://business/invite?token=XXX&businessId=YYY
    const match = url.match(/[?&]token=([^&]+)/);
    const token = match ? match[1] : undefined;
    const businessIdMatch = url.match(/[?&]businessId=([^&]+)/);
    const businessId = businessIdMatch ? businessIdMatch[1] : undefined;
    return { token, businessId };
  }
};

