/**
 * Utility to dump repository contents for debugging
 * Call this from browser console: dumpRepository()
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const REPOSITORY_KEYS = {
  BUSINESS_PROFILE: 'local_repo:business_profile',
  REWARDS: 'local_repo:rewards',
  CAMPAIGNS: 'local_repo:campaigns',
  CUSTOMERS: 'local_repo:customers',
  SYNC_METADATA: 'local_repo:sync_metadata',
  LAST_SYNC: 'local_repo:last_sync',
  CURRENT_BUSINESS_ID: 'local_repo:current_business_id',
} as const;

export const dumpRepository = async (): Promise<void> => {
  console.log('=== REPOSITORY DUMP ===\n');
  
  try {
    // Get all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`📋 Total AsyncStorage keys: ${allKeys.length}`);
    console.log('All keys:', allKeys);
    
    // Check repository keys
    console.log('\n=== REPOSITORY KEYS ===');
    for (const [key, storageKey] of Object.entries(REPOSITORY_KEYS)) {
      try {
        const value = await AsyncStorage.getItem(storageKey);
        if (value) {
          const parsed = JSON.parse(value);
          console.log(`\n✅ ${key} (${storageKey}):`);
          console.log(JSON.stringify(parsed, null, 2));
        } else {
          console.log(`\n❌ ${key} (${storageKey}): NULL or EMPTY`);
        }
      } catch (e) {
        console.error(`❌ Error reading ${key}:`, e);
      }
    }
    
    // Check sync metadata
    console.log('\n=== SYNC METADATA ===');
    try {
      const syncMeta = await AsyncStorage.getItem(REPOSITORY_KEYS.SYNC_METADATA);
      if (syncMeta) {
        const parsed = JSON.parse(syncMeta);
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log('NULL or EMPTY');
      }
    } catch (e) {
      console.error('Error reading sync metadata:', e);
    }
    
    // Check auth
    console.log('\n=== AUTH STATE ===');
    try {
      const authKeys = allKeys.filter(k => k.startsWith('auth_'));
      for (const key of authKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}:`, value ? JSON.parse(value) : 'NULL');
      }
    } catch (e) {
      console.error('Error reading auth:', e);
    }
    
    // Check current business ID (same key as localRepository)
    console.log('\n=== CURRENT BUSINESS ID ===');
    try {
      const businessId = await AsyncStorage.getItem(REPOSITORY_KEYS.CURRENT_BUSINESS_ID);
      console.log('local_repo:current_business_id:', businessId || 'NULL');
    } catch (e) {
      console.error('Error reading current business id:', e);
    }
    
    console.log('\n=== END DUMP ===');
  } catch (error) {
    console.error('❌ Error dumping repository:', error);
  }
};

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).dumpRepository = dumpRepository;
}

