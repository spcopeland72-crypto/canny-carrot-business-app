const { Level } = require('level');
const path = require('path');
const os = require('os');

const leveldbPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb');

console.log('Reading LevelDB from:', leveldbPath);
console.log('Looking for keys: local_repo:rewards, local_repo:campaigns\n');

(async () => {
  const db = new Level(leveldbPath, { 
    valueEncoding: 'json',
    readOnly: true 
  });
  
  try {
    await db.open();
    console.log('Database opened successfully\n');
    
    // Read specific keys
    const keysToRead = ['local_repo:rewards', 'local_repo:campaigns'];
    
    for (const key of keysToRead) {
      try {
        const value = await db.get(key);
        console.log(`\n=== ${key} ===`);
        if (Array.isArray(value)) {
          console.log(`Found ${value.length} items:`);
          value.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.name || 'Unnamed'} (ID: ${item.id})`);
          });
          console.log('\nFull data:');
          console.log(JSON.stringify(value, null, 2));
        } else {
          console.log(JSON.stringify(value, null, 2));
        }
      } catch (err) {
        if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
          console.log(`\n❌ ${key}: Not found`);
        } else {
          console.error(`\n❌ Error reading ${key}:`, err.message);
        }
      }
    }
    
    // Also iterate through all keys starting with local_repo:
    console.log('\n\n=== All local_repo keys ===');
    for await (const [key, value] of db.iterator({ gte: 'local_repo:', lte: 'local_repo:\xFF' })) {
      console.log(`\nKEY: ${key}`);
      if (typeof value === 'object' && Array.isArray(value)) {
        console.log(`  Array with ${value.length} items`);
        if (value.length > 0 && value[0] && value[0].name) {
          value.slice(0, 3).forEach((item, i) => {
            console.log(`    ${i + 1}. ${item.name} (ID: ${item.id})`);
          });
          if (value.length > 3) {
            console.log(`    ... and ${value.length - 3} more`);
          }
        }
      } else {
        console.log(`  Value type: ${typeof value}`);
      }
    }
    
    await db.close();
    console.log('\n✅ Finished reading LevelDB');
  } catch (err) {
    console.error('Error:', err);
    try {
      await db.close();
    } catch (e) {}
  }
})();

