/**
 * Script to check if "The Stables" campaign exists in local AsyncStorage
 * 
 * This can be run in:
 * 1. Browser console (for web builds using localStorage)
 * 2. React Native debugger console
 * 3. Or add this to a temporary component in the app
 */

// For web: check localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  console.log('🔍 Checking localStorage for campaigns...\n');
  
  const campaignsKey = 'local_repo:campaigns';
  const campaignsData = localStorage.getItem(campaignsKey);
  
  if (!campaignsData) {
    console.log('❌ No campaigns found in localStorage');
    console.log(`   Key: ${campaignsKey}`);
  } else {
    try {
      const campaigns = JSON.parse(campaignsData);
      console.log(`✅ Found ${campaigns.length} items in localStorage (raw data):\n`);
      
      // Check validation - same logic as campaignsRepository.getAll()
      const campaignTypes = ['double_stamps', 'bonus_reward', 'flash_sale', 'referral', 'birthday', 'happy_hour', 'loyalty_tier'];
      const campaignStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];
      
      const validCampaigns = campaigns.filter((item) => {
        const isReward = item.isActive !== undefined || item.stampsRequired || item.costStamps;
        if (isReward) {
          return false; // Filter out rewards
        }
        const hasCampaignType = item.type && campaignTypes.includes(item.type);
        const hasCampaignStatus = item.status && campaignStatuses.includes(item.status);
        return hasCampaignType && hasCampaignStatus;
      });
      
      console.log(`   Valid campaigns (pass validation): ${validCampaigns.length}`);
      console.log(`   Invalid/filtered out: ${campaigns.length - validCampaigns.length}\n`);
      
      // Look for "The Stables" business campaigns in RAW data (before filtering)
      const stablesCampaignsRaw = campaigns.filter(c => 
        c.name && c.name.toLowerCase().includes('stables')
      );
      
      // Look for "The Stables" business campaigns in VALID data (after filtering)
      const stablesCampaignsValid = validCampaigns.filter(c => 
        c.name && c.name.toLowerCase().includes('stables')
      );
      
      if (stablesCampaignsRaw.length > 0) {
        console.log(`🔍 Found ${stablesCampaignsRaw.length} campaign(s) related to "Stables" in RAW storage:\n`);
        stablesCampaignsRaw.forEach((campaign, idx) => {
          console.log(`${idx + 1}. "${campaign.name}"`);
          console.log(`   ID: ${campaign.id}`);
          console.log(`   Business ID: ${campaign.businessId}`);
          console.log(`   Type: ${campaign.type || '❌ MISSING'}`);
          console.log(`   Status: ${campaign.status || '❌ MISSING'}`);
          console.log(`   Created: ${campaign.createdAt || 'N/A'}`);
          console.log(`   Updated: ${campaign.updatedAt || 'N/A'}`);
          
          // Check why it might be filtered out
          const isReward = campaign.isActive !== undefined || campaign.stampsRequired || campaign.costStamps;
          const hasValidType = campaign.type && campaignTypes.includes(campaign.type);
          const hasValidStatus = campaign.status && campaignStatuses.includes(campaign.status);
          
          if (isReward) {
            console.log(`   ⚠️ ISSUE: This looks like a reward (has isActive/stampsRequired), not a campaign`);
          }
          if (!hasValidType) {
            console.log(`   ⚠️ ISSUE: Missing or invalid 'type'. Required: one of [${campaignTypes.join(', ')}]`);
            console.log(`   ⚠️        Current value: "${campaign.type || 'undefined'}"`);
          }
          if (!hasValidStatus) {
            console.log(`   ⚠️ ISSUE: Missing or invalid 'status'. Required: one of [${campaignStatuses.join(', ')}]`);
            console.log(`   ⚠️        Current value: "${campaign.status || 'undefined'}"`);
          }
          
          if (hasValidType && hasValidStatus && !isReward) {
            console.log(`   ✅ VALID: Would appear in app`);
          } else {
            console.log(`   ❌ FILTERED OUT: Won't appear in app due to validation`);
          }
          
          console.log('');
        });
        
        if (stablesCampaignsValid.length === 0 && stablesCampaignsRaw.length > 0) {
          console.log('⚠️ WARNING: Campaign exists in storage but is being FILTERED OUT by validation!\n');
          console.log('   This is why it\'s missing from the app.\n');
        }
      } else {
        console.log('❌ No campaigns found with "Stables" in the name\n');
      }
      
      // Also list all campaigns for reference
      console.log('\n📋 All campaigns in local storage (RAW):');
      campaigns.forEach((campaign, idx) => {
        const isValid = validCampaigns.some(c => c.id === campaign.id);
        const marker = isValid ? '✅' : '❌';
        console.log(`   ${marker} ${idx + 1}. "${campaign.name || 'Unnamed'}" - ID: ${campaign.id}, Type: ${campaign.type || 'MISSING'}, Status: ${campaign.status || 'MISSING'}`);
      });
      
      console.log('\n📋 Valid campaigns (appears in app):');
      if (validCampaigns.length > 0) {
        validCampaigns.forEach((campaign, idx) => {
          console.log(`   ${idx + 1}. "${campaign.name || 'Unnamed'}" - ID: ${campaign.id}, Type: ${campaign.type}`);
        });
      } else {
        console.log('   (none - all campaigns are invalid or filtered out)');
      }
      
    } catch (error) {
      console.error('❌ Error parsing campaigns data:', error);
      console.log('Raw data (first 500 chars):', campaignsData.substring(0, 500));
    }
  }
  
  // Also check for business profile to get business ID
  console.log('\n🔍 Checking business profile...\n');
  const businessProfileKey = 'local_repo:business_profile';
  const businessProfileData = localStorage.getItem(businessProfileKey);
  
  if (businessProfileData) {
    try {
      const profile = JSON.parse(businessProfileData);
      console.log(`✅ Business Profile found: ${profile.name || 'Unnamed'}`);
      console.log(`   Business ID: ${profile.id || 'N/A'}\n`);
      
      // Now check if any campaigns match this business ID
      if (campaignsData) {
        const campaigns = JSON.parse(campaignsData);
        const businessCampaigns = campaigns.filter(c => 
          c.businessId === profile.id || c.businessId === profile.businessId
        );
        console.log(`📊 Campaigns for this business: ${businessCampaigns.length}`);
        businessCampaigns.forEach((campaign, idx) => {
          console.log(`   ${idx + 1}. "${campaign.name}" - ID: ${campaign.id}`);
        });
      }
    } catch (error) {
      console.error('❌ Error parsing business profile:', error);
    }
  } else {
    console.log('❌ No business profile found in localStorage');
  }
  
} else {
  console.log('⚠️ This script is designed to run in a browser console.');
  console.log('For React Native, add this code to a temporary component:');
  console.log(`
import AsyncStorage from '@react-native-async-storage/async-storage';

const checkCampaigns = async () => {
  try {
    const campaignsData = await AsyncStorage.getItem('local_repo:campaigns');
    if (campaignsData) {
      const campaigns = JSON.parse(campaignsData);
      console.log('Campaigns found:', campaigns);
      
      const stablesCampaigns = campaigns.filter(c => 
        c.name && c.name.toLowerCase().includes('stables')
      );
      console.log('Stables campaigns:', stablesCampaigns);
    } else {
      console.log('No campaigns found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

checkCampaigns();
  `);
}

