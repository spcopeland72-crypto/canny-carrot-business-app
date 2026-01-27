const fs = require('fs');
const path = require('path');
const os = require('os');

const leveldbPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb');

console.log('Reading LevelDB files as binary to find local_repo keys...\n');

const files = fs.readdirSync(leveldbPath)
  .filter(f => f.endsWith('.ldb'))
  .map(f => ({ name: f, path: path.join(leveldbPath, f) }))
  .map(f => ({ ...f, size: fs.statSync(f.path).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 3);

for (const file of files) {
  console.log(`\n=== Scanning ${file.name} (${file.size} bytes) ===`);
  const data = fs.readFileSync(file.path);
  
  // Convert to string for searching
  const str = data.toString('utf8');
  
  // Find the position of our keys
  const rewardsIndex = str.indexOf('local_repo:rewards');
  const campaignsIndex = str.indexOf('local_repo:campaigns');
  
  if (rewardsIndex !== -1) {
    console.log('✅ Found local_repo:rewards at position', rewardsIndex);
    // Extract from the key onwards, find the JSON array
    const afterKey = str.substring(rewardsIndex + 'local_repo:rewards'.length);
    // Find the opening bracket
    const bracketStart = afterKey.indexOf('[');
    if (bracketStart !== -1) {
      // Find matching closing bracket
      let depth = 0;
      let bracketEnd = bracketStart;
      for (let i = bracketStart; i < Math.min(afterKey.length, bracketStart + 500000); i++) {
        if (afterKey[i] === '[') depth++;
        if (afterKey[i] === ']') {
          depth--;
          if (depth === 0) {
            bracketEnd = i + 1;
            break;
          }
        }
      }
      if (bracketEnd > bracketStart) {
        let jsonStr = afterKey.substring(bracketStart, bracketEnd);
        // Remove null bytes that break JSON parsing
        jsonStr = jsonStr.replace(/\0/g, '');
        try {
          const rewards = JSON.parse(jsonStr);
          console.log(`\n=== REWARDS (${rewards.length} items) ===`);
          rewards.forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.name || 'Unnamed'} (ID: ${r.id})`);
          });
          console.log('\nFull data:');
          console.log(JSON.stringify(rewards, null, 2));
        } catch (e) {
          console.log('Parse error:', e.message);
          console.log('First 200 chars of JSON:', jsonStr.substring(0, 200));
        }
      }
    }
  }
  
  if (campaignsIndex !== -1) {
    console.log('✅ Found local_repo:campaigns at position', campaignsIndex);
    const afterKey = str.substring(campaignsIndex + 'local_repo:campaigns'.length);
    const bracketStart = afterKey.indexOf('[');
    if (bracketStart !== -1) {
      let depth = 0;
      let bracketEnd = bracketStart;
      for (let i = bracketStart; i < Math.min(afterKey.length, bracketStart + 500000); i++) {
        if (afterKey[i] === '[') depth++;
        if (afterKey[i] === ']') {
          depth--;
          if (depth === 0) {
            bracketEnd = i + 1;
            break;
          }
        }
      }
      if (bracketEnd > bracketStart) {
        let jsonStr = afterKey.substring(bracketStart, bracketEnd);
        // Remove null bytes
        jsonStr = jsonStr.replace(/\0/g, '');
        try {
          const campaigns = JSON.parse(jsonStr);
          console.log(`\n=== CAMPAIGNS (${campaigns.length} items) ===`);
          campaigns.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.name || 'Unnamed'} (ID: ${c.id})`);
          });
          console.log('\nFull data:');
          console.log(JSON.stringify(campaigns, null, 2));
        } catch (e) {
          console.log('Parse error:', e.message);
          console.log('First 200 chars of JSON:', jsonStr.substring(0, 200));
        }
      }
    }
  }
}

