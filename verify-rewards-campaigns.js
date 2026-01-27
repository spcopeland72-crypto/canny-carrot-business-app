/**
 * Quick verification script to check rewards and campaigns in localStorage
 * Run this in browser console on business.cannycarrot.com
 */

(function verifyStorage() {
  console.log('🔍 Verifying rewards and campaigns in localStorage...\n');
  
  const rewardsKey = 'local_repo:rewards';
  const campaignsKey = 'local_repo:campaigns';
  
  // Check rewards
  const rewardsData = localStorage.getItem(rewardsKey);
  if (rewardsData) {
    try {
      const rewards = JSON.parse(rewardsData);
      console.log(`✅ REWARDS: Found ${rewards.length} item(s)`);
      if (rewards.length > 0) {
        rewards.forEach((r, idx) => {
          console.log(`   ${idx + 1}. "${r.name || 'Unnamed'}" (ID: ${r.id})`);
        });
      }
    } catch (e) {
      console.error('❌ Error parsing rewards:', e);
    }
  } else {
    console.log('❌ REWARDS: No data found');
  }
  
  console.log('');
  
  // Check campaigns
  const campaignsData = localStorage.getItem(campaignsKey);
  if (campaignsData) {
    try {
      const campaigns = JSON.parse(campaignsData);
      console.log(`✅ CAMPAIGNS: Found ${campaigns.length} item(s)`);
      if (campaigns.length > 0) {
        campaigns.forEach((c, idx) => {
          console.log(`   ${idx + 1}. "${c.name || 'Unnamed'}" (ID: ${c.id})`);
        });
      }
    } catch (e) {
      console.error('❌ Error parsing campaigns:', e);
    }
  } else {
    console.log('❌ CAMPAIGNS: No data found');
  }
  
  console.log('\n✅ Verification complete');
})();





