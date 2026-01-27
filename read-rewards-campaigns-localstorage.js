/**
 * Read rewards and campaigns from localStorage
 * Direct access using the same keys the repository uses: 'local_repo:rewards' and 'local_repo:campaigns'
 * 
 * This script reads directly from localStorage - the same way the app reads data
 */

// This is the JavaScript code to run in browser console on business.cannycarrot.com
const code = `
// Read rewards and campaigns from local repository
const rewardsKey = 'local_repo:rewards';
const campaignsKey = 'local_repo:campaigns';

console.log('REWARDS:');
console.log('='.repeat(80));

const rewardsData = localStorage.getItem(rewardsKey);
if (rewardsData) {
  const rewards = JSON.parse(rewardsData);
  console.log(\`Found \${rewards.length} rewards:\`);
  rewards.forEach((r, i) => {
    console.log(\`\${i + 1}. \${r.name || 'Unnamed'} (ID: \${r.id || 'N/A'})\`);
  });
  console.log('\\nFull rewards JSON:');
  console.log(JSON.stringify(rewards, null, 2));
} else {
  console.log('No rewards found');
  console.log('All localStorage keys:', Object.keys(localStorage));
}

console.log('\\n\\nCAMPAIGNS:');
console.log('='.repeat(80));

const campaignsData = localStorage.getItem(campaignsKey);
if (campaignsData) {
  const campaigns = JSON.parse(campaignsData);
  console.log(\`Found \${campaigns.length} campaigns:\`);
  campaigns.forEach((c, i) => {
    console.log(\`\${i + 1}. \${c.name || 'Unnamed'} (ID: \${c.id || 'N/A'})\`);
  });
  console.log('\\nFull campaigns JSON:');
  console.log(JSON.stringify(campaigns, null, 2));
} else {
  console.log('No campaigns found');
}
`;

console.log('='.repeat(80));
console.log('LOCALSTORAGE READER - REWARDS & CAMPAIGNS');
console.log('='.repeat(80));
console.log('');
console.log('Copy and paste this into your browser console on business.cannycarrot.com:');
console.log('');
console.log(code);





