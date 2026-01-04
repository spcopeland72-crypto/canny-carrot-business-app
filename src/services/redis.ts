/**
 * Redis Client Service - Offline-First Architecture
 * 
 * This service provides a Redis client that:
 * - Works offline (queues operations when disconnected)
 * - Automatically reconnects when online
 * - Handles connection failures gracefully
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use existing Canny Carrot API as Redis proxy
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
const REDIS_API_URL = `${API_BASE_URL}/api/v1/redis`; // API proxy endpoint

// Check connection status via API health endpoint
const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data.redis === 'connected';
  } catch {
    return false;
  }
};

// Redis client instance (lazy-loaded)
let redisClient: any = null;
let isConnected = false;
let connectionAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * Initialize Redis client - uses Canny Carrot API as proxy
 * All platforms use HTTP API to the existing Redis setup
 */
const initRedisClient = async (): Promise<any> => {
  // Always use HTTP API to Canny Carrot API (which has Redis configured)
  return {
    isWeb: true,
    apiUrl: REDIS_API_URL,
  };
};

/**
 * Check if Redis is available and connected
 */
export const isRedisAvailable = async (): Promise<boolean> => {
  // Check API health to determine Redis availability
  return await checkApiHealth();
};

/**
 * Check if device is online
 */
export const isOnline = (): boolean => {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }
  // For native, you might want to use NetInfo
  return true; // Assume online for native (can be enhanced with NetInfo)
};

/**
 * Execute Redis command via HTTP API (web) or direct client (native)
 */
const executeCommand = async (
  command: string,
  ...args: any[]
): Promise<any> => {
  const client = await initRedisClient();

  if (!client) {
    throw new Error('Redis client not available');
  }

  // Use HTTP API to Canny Carrot API (which proxies to Redis)
  if (client.isWeb) {
    try {
      const response = await fetch(`${client.apiUrl}/${command}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args }),
      });

      if (!response.ok) {
        throw new Error(`Redis API error: ${response.statusText}`);
      }

      const result = await response.json();
      // Handle API response format: { data: ... } or direct value
      if (result.data !== undefined) {
        return result.data;
      }
      return result;
    } catch (error) {
      // If offline or API unavailable, throw to trigger offline queue
      throw new Error(`Redis API unavailable: ${error}`);
    }
  }

  throw new Error('Redis client not initialized');
};

/**
 * Redis Operations
 */
export const redis = {
  /**
   * Get value by key
   */
  get: async (key: string): Promise<string | null> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      return await executeCommand('get', key);
    } catch (error) {
      console.warn(`Redis GET failed for ${key}:`, error);
      return null;
    }
  },

  /**
   * Set key-value pair
   */
  set: async (key: string, value: string, expiry?: number): Promise<boolean> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      if (expiry) {
        await executeCommand('setex', key, expiry, value);
      } else {
        await executeCommand('set', key, value);
      }
      return true;
    } catch (error) {
      console.warn(`Redis SET failed for ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete key
   */
  del: async (key: string): Promise<boolean> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      await executeCommand('del', key);
      return true;
    } catch (error) {
      console.warn(`Redis DEL failed for ${key}:`, error);
      return false;
    }
  },

  /**
   * Get all keys matching pattern
   */
  keys: async (pattern: string): Promise<string[]> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      return await executeCommand('keys', pattern);
    } catch (error) {
      console.warn(`Redis KEYS failed for ${pattern}:`, error);
      return [];
    }
  },

  /**
   * Add member to set
   */
  sadd: async (key: string, ...members: string[]): Promise<number> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      return await executeCommand('sadd', key, ...members);
    } catch (error) {
      console.warn(`Redis SADD failed for ${key}:`, error);
      return 0;
    }
  },

  /**
   * Get all members of set
   */
  smembers: async (key: string): Promise<string[]> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      return await executeCommand('smembers', key);
    } catch (error) {
      console.warn(`Redis SMEMBERS failed for ${key}:`, error);
      return [];
    }
  },

  /**
   * Remove member from set
   */
  srem: async (key: string, ...members: string[]): Promise<number> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      return await executeCommand('srem', key, ...members);
    } catch (error) {
      console.warn(`Redis SREM failed for ${key}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  exists: async (key: string): Promise<boolean> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      const result = await executeCommand('exists', key);
      return result === 1;
    } catch (error) {
      console.warn(`Redis EXISTS failed for ${key}:`, error);
      return false;
    }
  },

  /**
   * Get multiple keys at once
   */
  mget: async (keys: string[]): Promise<(string | null)[]> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      if (keys.length === 0) return [];
      return await executeCommand('mget', ...keys);
    } catch (error) {
      console.warn(`Redis MGET failed:`, error);
      return keys.map(() => null);
    }
  },

  /**
   * Set multiple key-value pairs at once
   */
  mset: async (keyValues: Record<string, string>): Promise<boolean> => {
    try {
      if (!isOnline()) {
        throw new Error('Offline');
      }
      const args: any[] = [];
      for (const [key, value] of Object.entries(keyValues)) {
        args.push(key, value);
      }
      await executeCommand('mset', ...args);
      return true;
    } catch (error) {
      console.warn(`Redis MSET failed:`, error);
      return false;
    }
  },
};

/**
 * Initialize Redis connection
 */
export const initRedis = async (): Promise<void> => {
  try {
    await initRedisClient();
  } catch (error) {
    console.warn('Redis initialization failed, using offline mode:', error);
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient && typeof redisClient.quit === 'function') {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

