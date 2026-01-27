/**
 * Read local_repo data directly
 * This script reads the actual localStorage keys that the app uses
 */

const fs = require('fs');
const path = require('path');

// Since localStorage is browser-only, this script will:
// 1. Output instructions to run in browser console
// 2. Or we can try to read from browser storage files if accessible

console.log('Reading local_repo data...\n');
console.log('NOTE: localStorage data is stored in the browser.');
console.log('Run this code in the browser console on business.cannycarrot.com:\n');
console.log('='.repeat(80));

const scriptToRun = `
// Read rewards
const rewardsKey = 'local_repo:rewards';
const rewardsData = localStorage.getItem(rewardsKey);
console.log('=== REWARDS ===');
if (rewardsData) {
  try {
    const rewards = JSON.parse(rewardsData);
    console.log(\`Found \${rewards.length} reward(s):\`);
    rewards.forEach((r, i) => {
      console.log(\`  \${i+1}. "\${r.name}" (ID: \${r.id})\`);
    });
    console.log('\\nFull rewards data:');
    console.log(JSON.stringify(rewards, null, 2));
  } catch (e) {
    console.error('Error parsing rewards:', e);
  }
} else {
  console.log('No rewards data found');
}

console.log('\\n' + '='.repeat(80));

// Read campaigns
const campaignsKey = 'local_repo:campaigns';
const campaignsData = localStorage.getItem(campaignsKey);
console.log('=== CAMPAIGNS ===');
if (campaignsData) {
  try {
    const campaigns = JSON.parse(campaignsData);
    console.log(\`Found \${campaigns.length} campaign(s):\`);
    campaigns.forEach((c, i) => {
      console.log(\`  \${i+1}. "\${c.name}" (ID: \${c.id}, Type: \${c.type || 'N/A'})\`);
    });
    console.log('\\nFull campaigns data:');
    console.log(JSON.stringify(campaigns, null, 2));
  } catch (e) {
    console.error('Error parsing campaigns:', e);
  }
} else {
  console.log('No campaigns data found');
}

console.log('\\n' + '='.repeat(80));
console.log('✅ Done reading local_repo data');
`;

console.log(scriptToRun);
console.log('='.repeat(80));

// Save the script to a file for easy copying
const outputFile = path.join(__dirname, 'read-local-repo-browser-console.js');
fs.writeFileSync(outputFile, scriptToRun, 'utf8');
console.log(`\n✅ Script saved to: ${outputFile}`);
console.log('\nTo use:');
console.log('1. Open business.cannycarrot.com in your browser');
console.log('2. Open browser console (F12)');
console.log('3. Copy and paste the script above, or copy from the saved file');
console.log('4. Press Enter to execute');





