/**
 * Export LocalStorage to Readable JSON
 * 
 * This script reads the browser's localStorage LevelDB files and exports
 * local_repo data to readable JSON files for debugging.
 * 
 * USAGE: node export-localstorage-to-json.js
 * OUTPUT: Creates JSON files in ./localstorage-exports/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Level } = require('level');

const leveldbPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb');
const outputDir = path.join(__dirname, 'localstorage-exports');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('📦 Exporting LocalStorage to JSON files...\n');
console.log('Source:', leveldbPath);
console.log('Output:', outputDir);
console.log('');

(async () => {
  try {
    // Try to open LevelDB (will fail if Edge is running, but we'll handle that)
    const db = new Level(leveldbPath, { valueEncoding: 'json' });
    
    try {
      await db.open();
      console.log('✅ Database opened successfully\n');
      
      // Export specific repository keys
      const keysToExport = [
        'local_repo:rewards',
        'local_repo:campaigns',
        'local_repo:business_profile',
        'local_repo:customers',
        'local_repo:sync_metadata',
        'local_repo:last_sync',
        'local_repo:current_business_id'
      ];
      
      const exportData = {
        timestamp: new Date().toISOString(),
        source: 'Edge LocalStorage LevelDB',
        keys: {}
      };
      
      for (const key of keysToExport) {
        try {
          const value = await db.get(key);
          exportData.keys[key] = value;
          
          // Also save individual files
          const filename = key.replace(/:/g, '_') + '.json';
          const filepath = path.join(outputDir, filename);
          fs.writeFileSync(filepath, JSON.stringify(value, null, 2), 'utf8');
          console.log(`✅ Exported: ${key} -> ${filename}`);
        } catch (err) {
          if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
            console.log(`❌ Not found: ${key}`);
            exportData.keys[key] = null;
          } else {
            console.error(`❌ Error reading ${key}:`, err.message);
            exportData.keys[key] = { error: err.message };
          }
        }
      }
      
      // Export all data to single file
      const allDataFile = path.join(outputDir, 'all-localstorage-data.json');
      fs.writeFileSync(allDataFile, JSON.stringify(exportData, null, 2), 'utf8');
      console.log(`\n✅ Exported all data to: all-localstorage-data.json`);
      
      await db.close();
      console.log('\n✅ Export complete!');
      
    } catch (openError) {
      if (openError.code === 'LEVEL_LOCKED' || openError.cause?.code === 'LEVEL_LOCKED') {
        console.log('⚠️  Database is locked (Edge is running)');
        console.log('   Attempting to read directly from .ldb files...\n');
        
        // Fallback: read from binary files
        await exportFromBinaryFiles();
      } else {
        throw openError;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

async function exportFromBinaryFiles() {
  const files = fs.readdirSync(leveldbPath)
    .filter(f => f.endsWith('.ldb'))
    .map(f => ({ name: f, path: path.join(leveldbPath, f) }))
    .map(f => ({ ...f, size: fs.statSync(f.path).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 3);
  
  const exportData = {
    timestamp: new Date().toISOString(),
    source: 'Edge LocalStorage LevelDB (binary files)',
    note: 'Database was locked, read from binary .ldb files',
    keys: {}
  };
  
  for (const file of files) {
    console.log(`Reading ${file.name}...`);
    const data = fs.readFileSync(file.path);
    const str = data.toString('utf8');
    
    // Extract rewards
    const rewardsIndex = str.indexOf('local_repo:rewards');
    if (rewardsIndex !== -1) {
      console.log(`  Found local_repo:rewards`);
      exportData.keys['local_repo:rewards'] = {
        found: true,
        note: 'Data found but requires proper LevelDB parsing - see raw export',
        rawLocation: `file: ${file.name}, position: ${rewardsIndex}`
      };
    }
    
    // Extract campaigns
    const campaignsIndex = str.indexOf('local_repo:campaigns');
    if (campaignsIndex !== -1) {
      console.log(`  Found local_repo:campaigns`);
      exportData.keys['local_repo:campaigns'] = {
        found: true,
        note: 'Data found but requires proper LevelDB parsing - see raw export',
        rawLocation: `file: ${file.name}, position: ${campaignsIndex}`
      };
    }
  }
  
  // Save export
  const allDataFile = path.join(outputDir, 'all-localstorage-data.json');
  fs.writeFileSync(allDataFile, JSON.stringify(exportData, null, 2), 'utf8');
  console.log(`\n✅ Exported metadata to: all-localstorage-data.json`);
  console.log('\n⚠️  To get full data, close Edge and run this script again');
}





