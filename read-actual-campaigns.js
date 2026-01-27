/**
 * Read ACTUAL campaign data from local storage using the EXACT same logic as the repository
 * This shows what the app actually sees, not test data
 */

// Use the EXACT validation logic from campaignsRepository.getAll()
const campaignTypes = ['double_stamps', 'bonus_reward', 'flash_sale', 'referral', 'birthday', 'happy_hour', 'loyalty_tier'];
const campaignStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];

function validateCampaign(item) {
  // Check if it's a reward: has 'isActive' or 'stampsRequired' fields
  const isReward = item.isActive !== undefined || item.stampsRequired || item.costStamps;
  if (isReward) {
    return { valid: false, reason: 'Looks like a reward (has isActive/stampsRequired)' };
  }
  
  // Campaign must have 'type' (CampaignType) and 'status' (CampaignStatus)
  const hasCampaignType = item.type && campaignTypes.includes(item.type);
  const hasCampaignStatus = item.status && campaignStatuses.includes(item.status);
  
  if (!hasCampaignType) {
    return { valid: false, reason: `Missing or invalid 'type'. Has: "${item.type || 'undefined'}". Required: one of [${campaignTypes.join(', ')}]` };
  }
  
  if (!hasCampaignStatus) {
    return { valid: false, reason: `Missing or invalid 'status'. Has: "${item.status || 'undefined'}". Required: one of [${campaignStatuses.join(', ')}]` };
  }
  
  return { valid: true };
}

// For browser console
if (typeof window !== 'undefined' && window.localStorage) {
  console.log('🔍 Reading ACTUAL campaign data from localStorage...\n');
  
  const campaignsKey = 'local_repo:campaigns';
  const rawData = localStorage.getItem(campaignsKey);
  
  if (!rawData) {
    console.log('❌ No campaigns data found in localStorage');
    console.log(`   Storage key: ${campaignsKey}`);
  } else {
    try {
      const allItems = JSON.parse(rawData);
      console.log(`📦 RAW STORAGE: Found ${allItems.length} item(s) in localStorage\n`);
      
      // Apply EXACT validation logic from campaignsRepository.getAll()
      const validCampaigns = [];
      const invalidItems = [];
      
      allItems.forEach((item) => {
        const validation = validateCampaign(item);
        if (validation.valid) {
          validCampaigns.push(item);
        } else {
          invalidItems.push({ item, reason: validation.reason });
        }
      });
      
      console.log(`✅ VALID CAMPAIGNS (what app shows): ${validCampaigns.length}`);
      console.log(`❌ INVALID/FILTERED OUT: ${invalidItems.length}\n`);
      
      // Look for "Stables bingo" specifically
      const stablesBingoRaw = allItems.find(c => 
        c.name && c.name.toLowerCase().includes('stables bingo')
      );
      
      const stablesBingoValid = validCampaigns.find(c => 
        c.name && c.name.toLowerCase().includes('stables bingo')
      );
      
      if (stablesBingoRaw) {
        console.log('🎯 FOUND "Stables bingo" in RAW storage:');
        console.log(JSON.stringify(stablesBingoRaw, null, 2));
        console.log('');
        
        const validation = validateCampaign(stablesBingoRaw);
        if (validation.valid) {
          console.log('✅ VALIDATION: PASSED - Should appear in app');
        } else {
          console.log(`❌ VALIDATION: FAILED - ${validation.reason}`);
          console.log('   This is why it\'s missing from the app!\n');
        }
      } else {
        console.log('❌ "Stables bingo" NOT FOUND in raw storage\n');
      }
      
      // Show all valid campaigns
      if (validCampaigns.length > 0) {
        console.log('\n📋 VALID CAMPAIGNS (what app displays):');
        validCampaigns.forEach((campaign, idx) => {
          console.log(`   ${idx + 1}. "${campaign.name}"`);
          console.log(`      ID: ${campaign.id}`);
          console.log(`      Type: ${campaign.type}`);
          console.log(`      Status: ${campaign.status}`);
          console.log(`      Business ID: ${campaign.businessId}`);
          console.log('');
        });
      }
      
      // Show invalid items and why they're filtered
      if (invalidItems.length > 0) {
        console.log('\n❌ INVALID ITEMS (filtered out by app):');
        invalidItems.forEach(({ item, reason }, idx) => {
          console.log(`   ${idx + 1}. "${item.name || 'Unnamed'}"`);
          console.log(`      ID: ${item.id}`);
          console.log(`      Reason: ${reason}`);
          console.log('');
        });
      }
      
      // Check business profile
      const businessProfileKey = 'local_repo:business_profile';
      const profileData = localStorage.getItem(businessProfileKey);
      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log(`\n🏢 BUSINESS PROFILE: ${profile.name || 'Unnamed'}`);
        console.log(`   Business ID: ${profile.id}`);
        
        // Check if campaigns match business ID
        const businessCampaigns = validCampaigns.filter(c => 
          c.businessId === profile.id
        );
        console.log(`   Valid campaigns for this business: ${businessCampaigns.length}`);
      }
      
    } catch (error) {
      console.error('❌ Error parsing campaigns data:', error);
      console.log('Raw data (first 1000 chars):', rawData.substring(0, 1000));
    }
  }
} else {
  console.log('⚠️ This script must be run in a browser console where localStorage is available.');
  console.log('Open the business app in your browser, open DevTools (F12), go to Console tab,');
  console.log('and paste this entire script to see the actual stored data.');
}





