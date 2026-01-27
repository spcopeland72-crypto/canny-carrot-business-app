// Run this in the browser console on business.cannycarrot.com
// Paste the entire script and press Enter

(async () => {
  console.log('🔍 Checking for "The Stables" campaign in localStorage...\n');
  
  const campaignsKey = 'local_repo:campaigns';
  const campaignsData = localStorage.getItem(campaignsKey);
  
  if (!campaignsData) {
    console.log('❌ No campaigns found in localStorage');
    console.log(`   Key: ${campaignsKey}`);
    return;
  }
  
  try {
    const campaigns = JSON.parse(campaignsData);
    console.log(`✅ Found ${campaigns.length} items in localStorage (raw data)\n`);
    
    // Validation logic from campaignsRepository.getAll()
    const campaignTypes = ['double_stamps', 'bonus_reward', 'flash_sale', 'referral', 'birthday', 'happy_hour', 'loyalty_tier'];
    const campaignStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];
    
    const validCampaigns = campaigns.filter((item) => {
      const isReward = item.isActive !== undefined || item.stampsRequired || item.costStamps;
      if (isReward) return false;
      const hasCampaignType = item.type && campaignTypes.includes(item.type);
      const hasCampaignStatus = item.status && campaignStatuses.includes(item.status);
      return hasCampaignType && hasCampaignStatus;
    });
    
    console.log(`📊 Valid campaigns (pass validation): ${validCampaigns.length}`);
    console.log(`📊 Invalid/filtered out: ${campaigns.length - validCampaigns.length}\n`);
    
    // Look for Stables campaigns
    const stablesCampaignsRaw = campaigns.filter(c => 
      c.name && c.name.toLowerCase().includes('stables')
    );
    
    const stablesCampaignsValid = validCampaigns.filter(c => 
      c.name && c.name.toLowerCase().includes('stables')
    );
    
    if (stablesCampaignsRaw.length > 0) {
      console.log(`🔍 Found ${stablesCampaignsRaw.length} campaign(s) related to "Stables":\n`);
      
      stablesCampaignsRaw.forEach((campaign, idx) => {
        console.log(`${idx + 1}. "${campaign.name}"`);
        console.log(`   ID: ${campaign.id}`);
        console.log(`   Business ID: ${campaign.businessId}`);
        console.log(`   Type: ${campaign.type || '❌ MISSING'}`);
        console.log(`   Status: ${campaign.status || '❌ MISSING'}`);
        console.log(`   Created: ${campaign.createdAt || 'N/A'}`);
        console.log(`   Updated: ${campaign.updatedAt || 'N/A'}`);
        
        // Check validation
        const isReward = campaign.isActive !== undefined || campaign.stampsRequired || campaign.costStamps;
        const hasValidType = campaign.type && campaignTypes.includes(campaign.type);
        const hasValidStatus = campaign.status && campaignStatuses.includes(campaign.status);
        
        if (isReward) {
          console.log(`   ⚠️ ISSUE: Looks like a reward, not a campaign`);
        }
        if (!hasValidType) {
          console.log(`   ⚠️ ISSUE: Missing/invalid 'type'. Required: [${campaignTypes.join(', ')}]`);
          console.log(`   ⚠️        Current: "${campaign.type || 'undefined'}"`);
        }
        if (!hasValidStatus) {
          console.log(`   ⚠️ ISSUE: Missing/invalid 'status'. Required: [${campaignStatuses.join(', ')}]`);
          console.log(`   ⚠️        Current: "${campaign.status || 'undefined'}"`);
        }
        
        if (hasValidType && hasValidStatus && !isReward) {
          console.log(`   ✅ VALID: Would appear in app`);
        } else {
          console.log(`   ❌ FILTERED OUT: Won't appear due to validation`);
        }
        console.log('');
      });
      
      if (stablesCampaignsValid.length === 0 && stablesCampaignsRaw.length > 0) {
        console.log('⚠️ WARNING: Campaign exists but is being FILTERED OUT by validation!\n');
      }
    } else {
      console.log('❌ No campaigns found with "Stables" in the name\n');
      console.log('All campaigns in storage:');
      campaigns.forEach((campaign, idx) => {
        const isValid = validCampaigns.some(c => c.id === campaign.id);
        const marker = isValid ? '✅' : '❌';
        console.log(`   ${marker} ${idx + 1}. "${campaign.name || 'Unnamed'}" - Type: ${campaign.type || 'MISSING'}, Status: ${campaign.status || 'MISSING'}`);
      });
    }
    
    // Check business profile
    const businessProfileKey = 'local_repo:business_profile';
    const businessProfileData = localStorage.getItem(businessProfileKey);
    if (businessProfileData) {
      const profile = JSON.parse(businessProfileData);
      console.log(`\n📋 Business Profile: ${profile.name || 'Unnamed'}`);
      console.log(`   Business ID: ${profile.id || profile.businessId || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Error parsing data:', error);
  }
})();






