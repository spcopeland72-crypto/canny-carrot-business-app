/**
 * Print localStorage data directly
 * Reads local_repo:rewards and local_repo:campaigns and prints to console
 */

// This runs in browser context - outputs to console
const rewardsKey = 'local_repo:rewards';
const campaignsKey = 'local_repo:campaigns';

console.log('REWARDS:');
const rewardsData = localStorage.getItem(rewardsKey);
if (rewardsData) {
  const rewards = JSON.parse(rewardsData);
  console.log(JSON.stringify(rewards, null, 2));
} else {
  console.log('No rewards data found');
}

console.log('\n\nCAMPAIGNS:');
const campaignsData = localStorage.getItem(campaignsKey);
if (campaignsData) {
  const campaigns = JSON.parse(campaignsData);
  console.log(JSON.stringify(campaigns, null, 2));
} else {
  console.log('No campaigns data found');
}





