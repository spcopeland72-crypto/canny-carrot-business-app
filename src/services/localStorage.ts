/**
 * Local Storage Adapter - Offline-First Storage
 * 
 * Provides unified storage interface using:
 * - IndexedDB (web, preferred)
 * - localStorage (web, fallback)
 * - AsyncStorage (React Native, if available)
 * - File system (Node.js, if available)
 */

import { Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  BUSINESSES: 'canny_carrot:businesses',
  CUSTOMERS: 'canny_carrot:customers',
  REWARDS: 'canny_carrot:rewards',
  CAMPAIGNS: 'canny_carrot:campaigns',
  SYNC_QUEUE: 'canny_carrot:sync_queue',
  SYNC_STATUS: 'canny_carrot:sync_status',
  DEVICE_ID: 'canny_carrot:device_id',
} as const;

// IndexedDB database name
const DB_NAME = 'CannyCarrotDB';
const DB_VERSION = 1;

// IndexedDB instance
let db: IDBDatabase | null = null;

/**
 * Get or create device ID
 */
export const getDeviceId = (): string => {
  if (Platform.OS === 'web') {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }
  // For native, generate and store in AsyncStorage or similar
  return `device-native-${Date.now()}`;
};

/**
 * Initialize IndexedDB (web only)
 */
const initIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains('businesses')) {
        database.createObjectStore('businesses', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('customers')) {
        database.createObjectStore('customers', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('rewards')) {
        database.createObjectStore('rewards', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('campaigns')) {
        database.createObjectStore('campaigns', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('syncQueue')) {
        database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

/**
 * Get IndexedDB instance (initialize if needed)
 */
const getDB = async (): Promise<IDBDatabase> => {
  if (db) return db;
  if (Platform.OS === 'web' && typeof indexedDB !== 'undefined') {
    try {
      db = await initIndexedDB();
      return db;
    } catch (error) {
      console.warn('IndexedDB initialization failed, using localStorage:', error);
    }
  }
  throw new Error('IndexedDB not available');
};

/**
 * IndexedDB operations
 */
const idbOperations = {
  get: async <T>(storeName: string, key: string): Promise<T | null> => {
    try {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn(`IDB GET failed for ${storeName}/${key}:`, error);
      return null;
    }
  },

  set: async <T>(storeName: string, key: string, value: T): Promise<void> => {
    try {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ id: key, ...value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn(`IDB SET failed for ${storeName}/${key}:`, error);
      throw error;
    }
  },

  getAll: async <T>(storeName: string): Promise<T[]> => {
    try {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn(`IDB GETALL failed for ${storeName}:`, error);
      return [];
    }
  },

  delete: async (storeName: string, key: string): Promise<void> => {
    try {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn(`IDB DELETE failed for ${storeName}/${key}:`, error);
      throw error;
    }
  },
};

/**
 * localStorage operations (fallback)
 */
const localStorageOperations = {
  get: <T>(key: string): T | null => {
    try {
      if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
        return null;
      }
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`localStorage GET failed for ${key}:`, error);
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`localStorage SET failed for ${key}:`, error);
    }
  },

  delete: (key: string): void => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`localStorage DELETE failed for ${key}:`, error);
    }
  },
};

/**
 * Unified storage interface
 */
export const storage = {
  /**
   * Get item from storage
   */
  get: async <T>(key: string): Promise<T | null> => {
    // Try IndexedDB first
    if (Platform.OS === 'web' && typeof indexedDB !== 'undefined') {
      try {
        const result = await idbOperations.get<T>(key.split(':')[1] || 'default', key);
        if (result) return result as T;
      } catch (error) {
        // Fall through to localStorage
      }
    }
    // Fallback to localStorage
    return localStorageOperations.get<T>(key);
  },

  /**
   * Set item in storage
   */
  set: async <T>(key: string, value: T): Promise<void> => {
    // Try IndexedDB first
    if (Platform.OS === 'web' && typeof indexedDB !== 'undefined') {
      try {
        const storeName = key.split(':')[1] || 'default';
        await idbOperations.set(storeName, key, value);
        return;
      } catch (error) {
        // Fall through to localStorage
      }
    }
    // Fallback to localStorage
    localStorageOperations.set(key, value);
  },

  /**
   * Delete item from storage
   */
  delete: async (key: string): Promise<void> => {
    // Try IndexedDB first
    if (Platform.OS === 'web' && typeof indexedDB !== 'undefined') {
      try {
        const storeName = key.split(':')[1] || 'default';
        await idbOperations.delete(storeName, key);
        return;
      } catch (error) {
        // Fall through to localStorage
      }
    }
    // Fallback to localStorage
    localStorageOperations.delete(key);
  },

  /**
   * Get all items with a prefix
   */
  getAll: async <T>(prefix: string): Promise<T[]> => {
    // Try IndexedDB first
    if (Platform.OS === 'web' && typeof indexedDB !== 'undefined') {
      try {
        const storeName = prefix.split(':')[1] || 'default';
        const all = await idbOperations.getAll<T>(storeName);
        return all.filter((item: any) => item.id?.startsWith(prefix));
      } catch (error) {
        // Fall through to localStorage
      }
    }
    // Fallback: iterate localStorage (limited)
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const items: T[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const value = localStorageOperations.get<T>(key);
          if (value) items.push(value);
        }
      }
      return items;
    }
    return [];
  },
};

/**
 * Sync queue operations
 */
export const syncQueue = {
  /**
   * Add operation to sync queue
   */
  add: async (operation: {
    type: 'create' | 'update' | 'delete';
    entityType: string;
    entityId: string;
    data?: any;
    timestamp: number;
  }): Promise<void> => {
    const queue = await storage.getAll<any>(STORAGE_KEYS.SYNC_QUEUE);
    queue.push({
      id: `${operation.entityType}:${operation.entityId}:${operation.timestamp}`,
      ...operation,
    });
    await storage.set(STORAGE_KEYS.SYNC_QUEUE, queue);
  },

  /**
   * Get all pending operations
   */
  getAll: async (): Promise<any[]> => {
    return await storage.getAll<any>(STORAGE_KEYS.SYNC_QUEUE);
  },

  /**
   * Remove operation from queue
   */
  remove: async (operationId: string): Promise<void> => {
    const queue = await storage.getAll<any>(STORAGE_KEYS.SYNC_QUEUE);
    const filtered = queue.filter((op: any) => op.id !== operationId);
    await storage.set(STORAGE_KEYS.SYNC_QUEUE, filtered);
  },

  /**
   * Clear entire queue
   */
  clear: async (): Promise<void> => {
    await storage.delete(STORAGE_KEYS.SYNC_QUEUE);
  },
};

/**
 * Sync status operations
 */
export const syncStatus = {
  /**
   * Get sync status
   */
  get: async (): Promise<{
    isOnline: boolean;
    lastSyncTime: number | null;
    pendingOperations: number;
  }> => {
    const status = await storage.get<any>(STORAGE_KEYS.SYNC_STATUS);
    const queue = await syncQueue.getAll();
    return {
      isOnline: status?.isOnline ?? false,
      lastSyncTime: status?.lastSyncTime ?? null,
      pendingOperations: queue.length,
    };
  },

  /**
   * Update sync status
   */
  update: async (updates: {
    isOnline?: boolean;
    lastSyncTime?: number;
  }): Promise<void> => {
    const current = await storage.get<any>(STORAGE_KEYS.SYNC_STATUS) || {};
    await storage.set(STORAGE_KEYS.SYNC_STATUS, {
      ...current,
      ...updates,
    });
  },
};

















