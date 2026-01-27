
// Read rewards
const rewardsKey = 'local_repo:rewards';
const rewardsData = localStorage.getItem(rewardsKey);
console.log('=== REWARDS ===');
if (rewardsData) {
  try {
    const rewards = JSON.parse(rewardsData);
    console.log(`Found ${rewards.length} reward(s):`);
    rewards.forEach((r, i) => {
      console.log(`  ${i+1}. "${r.name}" (ID: ${r.id})`);
    });
    console.log('\nFull rewards data:');
    console.log(JSON.stringify(rewards, null, 2));
  } catch (e) {
    console.error('Error parsing rewards:', e);
  }
} else {
  console.log('No rewards data found');
}

console.log('\n' + '='.repeat(80));

// Read campaigns
const campaignsKey = 'local_repo:campaigns';
const campaignsData = localStorage.getItem(campaignsKey);
console.log('=== CAMPAIGNS ===');
if (campaignsData) {
  try {
    const campaigns = JSON.parse(campaignsData);
    console.log(`Found ${campaigns.length} campaign(s):`);
    campaigns.forEach((c, i) => {
      console.log(`  ${i+1}. "${c.name}" (ID: ${c.id}, Type: ${c.type || 'N/A'})`);
    });
    console.log('\nFull campaigns data:');
    console.log(JSON.stringify(campaigns, null, 2));
  } catch (e) {
    console.error('Error parsing campaigns:', e);
  }
} else {
  console.log('No campaigns data found');
}

console.log('\n' + '='.repeat(80));
console.log('✅ Done reading local_repo data');
