const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to read LevelDB files directly as binary and parse
const leveldbPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb');

console.log('Attempting to read LevelDB files from:', leveldbPath);
console.log('Keys to find: local_repo:rewards, local_repo:campaigns\n');

// Read the CURRENT file to find which MANIFEST to use
try {
  const currentFile = path.join(leveldbPath, 'CURRENT');
  if (fs.existsSync(currentFile)) {
    const manifestName = fs.readFileSync(currentFile, 'utf8').trim();
    console.log('Current manifest:', manifestName);
  }
} catch (e) {
  console.log('Could not read CURRENT file');
}

// Try to read .ldb files and search for our keys
const ldbFiles = fs.readdirSync(leveldbPath).filter(f => f.endsWith('.ldb')).sort().reverse().slice(0, 3);

console.log(`\nScanning ${ldbFiles.length} largest .ldb files for local_repo keys...\n`);

for (const file of ldbFiles) {
  const filePath = path.join(leveldbPath, file);
  try {
    const data = fs.readFileSync(filePath);
    const dataStr = data.toString('utf8', 0, Math.min(data.length, 1000000)); // First 1MB as string
    
    // Look for our keys
    if (dataStr.includes('local_repo:rewards') || dataStr.includes('local_repo:campaigns')) {
      console.log(`\n✅ Found repository keys in: ${file}`);
      
      // Try to extract JSON data around the keys
      const rewardsMatch = dataStr.match(/local_repo:rewards[^\x00]*?(\[[\s\S]{0,50000}\]|{[\s\S]{0,50000}})/);
      if (rewardsMatch) {
        try {
          const jsonStr = rewardsMatch[1];
          const rewards = JSON.parse(jsonStr);
          console.log(`\n=== REWARDS (${rewards.length} items) ===`);
          rewards.forEach((r, i) => {
            console.log(`${i + 1}. ${r.name || 'Unnamed'} (ID: ${r.id})`);
          });
          console.log('\nFull rewards data:');
          console.log(JSON.stringify(rewards, null, 2));
        } catch (e) {
          console.log('Could not parse rewards JSON:', e.message);
        }
      }
      
      const campaignsMatch = dataStr.match(/local_repo:campaigns[^\x00]*?(\[[\s\S]{0,50000}\]|{[\s\S]{0,50000}})/);
      if (campaignsMatch) {
        try {
          const jsonStr = campaignsMatch[1];
          const campaigns = JSON.parse(jsonStr);
          console.log(`\n=== CAMPAIGNS (${campaigns.length} items) ===`);
          campaigns.forEach((c, i) => {
            console.log(`${i + 1}. ${c.name || 'Unnamed'} (ID: ${c.id})`);
          });
          console.log('\nFull campaigns data:');
          console.log(JSON.stringify(campaigns, null, 2));
        } catch (e) {
          console.log('Could not parse campaigns JSON:', e.message);
        }
      }
    }
  } catch (e) {
    console.log(`Error reading ${file}:`, e.message);
  }
}





