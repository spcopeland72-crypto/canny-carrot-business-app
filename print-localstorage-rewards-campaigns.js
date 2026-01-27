/**
 * Print Rewards and Campaigns from localStorage
 * 
 * This JavaScript code reads and prints rewards and campaigns directly from localStorage.
 * 
 * USAGE:
 * 1. Open business.cannycarrot.com in your browser (and log in if needed)
 * 2. Open Developer Console (F12)
 * 3. Copy the code below (from "REWARDS:" to the end)
 * 4. Paste into console and press Enter
 * 
 * The script will print all rewards and campaigns found in localStorage
 */

const scriptCode = `
// Read and print rewards and campaigns from localStorage
(function() {
  console.log('REWARDS:');
  console.log('='.repeat(80));
  
  const rewardsKey = 'local_repo:rewards';
  const campaignsKey = 'local_repo:campaigns';
  const prefixes = ['', '@AsyncStorage:', 'asyncStorage:', 'RNAsyncStorage:'];
  
  let rewards = null;
  let campaigns = null;
  
  // Find rewards
  for (const prefix of prefixes) {
    const key = prefix + rewardsKey;
    const value = localStorage.getItem(key);
    if (value) {
      try {
        rewards = JSON.parse(value);
        console.log(\`✅ Found \${rewards.length} rewards in: \${key}\`);
        break;
      } catch (e) {
        console.log(\`⚠️  Key \${key} exists but invalid JSON\`);
      }
    }
  }
  
  // Find campaigns
  for (const prefix of prefixes) {
    const key = prefix + campaignsKey;
    const value = localStorage.getItem(key);
    if (value) {
      try {
        campaigns = JSON.parse(value);
        console.log(\`✅ Found \${campaigns.length} campaigns in: \${key}\`);
        break;
      } catch (e) {
        console.log(\`⚠️  Key \${key} exists but invalid JSON\`);
      }
    }
  }
  
  // Print rewards
  if (rewards && Array.isArray(rewards)) {
    console.log(\`\\n\${rewards.length} REWARDS:\`);
    rewards.forEach((r, i) => {
      console.log(\`\${i + 1}. \${r.name || 'Unnamed'} (ID: \${r.id || 'N/A'})\`);
    });
    console.log('\\nFull rewards JSON:');
    console.log(JSON.stringify(rewards, null, 2));
  } else {
    console.log('❌ No rewards found in localStorage');
    console.log('All localStorage keys:', Object.keys(localStorage));
  }
  
  // Print campaigns
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
    console.log('❌ No campaigns found in localStorage');
  }
  
  return { rewards, campaigns };
})();
`;

console.log('='.repeat(80));
console.log('LOCALSTORAGE READER - REWARDS & CAMPAIGNS');
console.log('='.repeat(80));
console.log('');
console.log('Copy this code and run it in your browser console on business.cannycarrot.com:');
console.log('');
console.log(scriptCode);
console.log('');
console.log('='.repeat(80));





