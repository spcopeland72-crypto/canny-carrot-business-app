// Run this in browser console to dump repository contents
(async () => {
  console.log('=== REPOSITORY DUMP ===');
  
  // Import AsyncStorage
  const AsyncStorage = window.localStorage; // For web, use localStorage
  
  // Get all keys
  const keys = Object.keys(localStorage);
  console.log('All localStorage keys:', keys);
  
  // Filter repository keys
  const repoKeys = keys.filter(k => k.startsWith('local_repo:') || k.startsWith('archived_repo:') || k.startsWith('auth_'));
  console.log('\nRepository keys:', repoKeys);
  
  // Get all repository data
  for (const key of repoKeys) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        console.log(`\n=== ${key} ===`);
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log(`\n=== ${key} === (null or empty)`);
      }
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
    }
  }
  
  console.log('\n=== END DUMP ===');
})();



