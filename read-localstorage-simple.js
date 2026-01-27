/**
 * Simple script to read and print rewards and campaigns from localStorage
 * This is the JavaScript code to run in the browser console
 */

const code = `
(function() {
  console.log('REWARDS:');
  console.log('='.repeat(80));
  
  const rewardsKey = 'local_repo:rewards';
  const campaignsKey = 'local_repo:campaigns';
  
  // Try multiple prefixes
  const prefixes = ['', '@AsyncStorage:', 'asyncStorage:', 'RNAsyncStorage:'];
  
  let rewards = null;
  let campaigns = null;
  
  for (const prefix of prefixes) {
    // Rewards
    if (!rewards) {
      const rewardsValue = localStorage.getItem(prefix + rewardsKey);
      if (rewardsValue) {
        try {
          rewards = JSON.parse(rewardsValue);
          console.log(\`Found \${rewards.length} rewards in: \${prefix + rewardsKey}\`);
        } catch (e) {
          console.log(\`Rewards key exists but invalid JSON: \${prefix + rewardsKey}\`);
        }
      }
    }
    
    // Campaigns
    if (!campaigns) {
      const campaignsValue = localStorage.getItem(prefix + campaignsKey);
      if (campaignsValue) {
        try {
          campaigns = JSON.parse(campaignsValue);
          console.log(\`Found \${campaigns.length} campaigns in: \${prefix + campaignsKey}\`);
        } catch (e) {
          console.log(\`Campaigns key exists but invalid JSON: \${prefix + campaignsKey}\`);
        }
      }
    }
  }
  
  if (rewards && Array.isArray(rewards)) {
    console.log(\`\\n\${rewards.length} REWARDS:\`);
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
  
  if (campaigns && Array.isArray(campaigns)) {
    console.log(\`\${campaigns.length} CAMPAIGNS:\`);
    campaigns.forEach((c, i) => {
      console.log(\`\${i + 1}. \${c.name || 'Unnamed'} (ID: \${c.id || 'N/A'})\`);
    });
    console.log('\\nFull campaigns JSON:');
    console.log(JSON.stringify(campaigns, null, 2));
  } else {
    console.log('No campaigns found');
  }
  
  return { rewards, campaigns };
})();
`;

console.log('Browser console JavaScript code:');
console.log('='.repeat(80));
console.log(code);
console.log('='.repeat(80));
console.log('\nTo use this:');
console.log('1. Open business.cannycarrot.com in your browser');
console.log('2. Open Developer Console (F12)');
console.log('3. Copy the code above and paste it into the console');
console.log('4. Press Enter');





