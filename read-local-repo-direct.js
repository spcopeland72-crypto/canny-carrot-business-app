/**
 * Read local_repo data directly from localStorage
 * Uses the same keys as the repository: local_repo:rewards, local_repo:campaigns
 */

// For Node.js, we need to access browser's localStorage
// On web, AsyncStorage maps to localStorage
// The keys are: 'local_repo:rewards' and 'local_repo:campaigns'

const readLocalRepo = () => {
  // This would need to run in browser context
  // For now, output the structure
  console.log('Reading local_repo data...');
  console.log('Keys to check:');
  console.log('  - local_repo:rewards');
  console.log('  - local_repo:campaigns');
  console.log('  - local_repo:business_profile');
  console.log('\nTo access, run this in browser console on business.cannycarrot.com:');
  
  const script = `
// Read rewards
const rewardsData = localStorage.getItem('local_repo:rewards');
if (rewardsData) {
  const rewards = JSON.parse(rewardsData);
  console.log('REWARDS:', rewards.length, rewards);
} else {
  console.log('REWARDS: No data found');
}

// Read campaigns  
const campaignsData = localStorage.getItem('local_repo:campaigns');
if (campaignsData) {
  const campaigns = JSON.parse(campaignsData);
  console.log('CAMPAIGNS:', campaigns.length, campaigns);
} else {
  console.log('CAMPAIGNS: No data found');
}
  `;
  
  console.log(script);
};

readLocalRepo();





