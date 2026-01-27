/**
 * Read and print rewards and campaigns from local repository
 * Uses the same repository service the app uses
 */

// Note: This needs to run in a React Native/Expo web environment
// For Node.js, we need to simulate AsyncStorage or read directly

const fs = require('fs');
const path = require('path');

async function readLocalRepo() {
  try {
    // On web, AsyncStorage uses localStorage with specific keys
    // The keys are: 'local_repo:rewards' and 'local_repo:campaigns'
    
    // For web browsers, we can't read localStorage from Node.js
    // But we can create a script that uses the browser's localStorage API
    // OR we can read from the repository service if running in the app context
    
    // Let's create a simple script that reads directly from AsyncStorage keys
    // This will work when run in the browser console
    
    const scriptCode = `
// Read rewards and campaigns from local repository
(async function() {
  const AsyncStorage = window.localStorage || (await import('@react-native-async-storage/async-storage')).default;
  
  console.log('REWARDS:');
  console.log('='.repeat(80));
  
  const rewardsKey = 'local_repo:rewards';
  const rewardsData = AsyncStorage.getItem ? await AsyncStorage.getItem(rewardsKey) : localStorage.getItem(rewardsKey);
  
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
    console.log('All localStorage keys:', Object.keys(localStorage || {}));
  }
  
  console.log('\\n\\nCAMPAIGNS:');
  console.log('='.repeat(80));
  
  const campaignsKey = 'local_repo:campaigns';
  const campaignsData = AsyncStorage.getItem ? await AsyncStorage.getItem(campaignsKey) : localStorage.getItem(campaignsKey);
  
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
})();
`;
    
    // For direct localStorage access (web browser console)
    const browserScript = `
// Run this in browser console on business.cannycarrot.com
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

    console.log('Browser Console Script:');
    console.log('='.repeat(80));
    console.log(browserScript);
    console.log('='.repeat(80));
    console.log('\nRun this script in the browser console on business.cannycarrot.com');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

readLocalRepo();





