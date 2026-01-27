/**
 * Check if campaigns have selectedProducts stored
 * Run this in browser console or Node.js
 */

// For browser/React Native - use AsyncStorage
// For Node.js - would need to read from file

const checkCampaignProducts = async () => {
  try {
    // In browser console, you can run:
    // const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // Or use the browser's localStorage if available
    
    console.log('🔍 Checking campaigns for selectedProducts...\n');
    
    // Try to get from localStorage (web) or AsyncStorage (React Native)
    let campaignsData;
    
    if (typeof localStorage !== 'undefined') {
      // Web environment
      campaignsData = localStorage.getItem('local_repo:campaigns');
    } else if (typeof AsyncStorage !== 'undefined') {
      // React Native environment
      campaignsData = await AsyncStorage.getItem('local_repo:campaigns');
    } else {
      console.error('❌ Neither localStorage nor AsyncStorage available');
      return;
    }
    
    if (!campaignsData) {
      console.log('⚠️ No campaigns found in storage');
      return;
    }
    
    const campaigns = JSON.parse(campaignsData);
    console.log(`📊 Found ${campaigns.length} campaigns\n`);
    
    campaigns.forEach((campaign, index) => {
      console.log(`\n${index + 1}. Campaign: "${campaign.name}" (${campaign.id})`);
      console.log(`   - Has selectedProducts property: ${'selectedProducts' in campaign}`);
      console.log(`   - selectedProducts value:`, campaign.selectedProducts);
      console.log(`   - selectedProducts type:`, typeof campaign.selectedProducts);
      console.log(`   - selectedProducts length:`, Array.isArray(campaign.selectedProducts) ? campaign.selectedProducts.length : 'N/A');
      console.log(`   - Has selectedActions property: ${'selectedActions' in campaign}`);
      console.log(`   - selectedActions value:`, campaign.selectedActions);
      console.log(`   - Has pinCode property: ${'pinCode' in campaign}`);
      console.log(`   - pinCode value:`, campaign.pinCode);
      console.log(`   - Full campaign keys:`, Object.keys(campaign));
    });
    
    const campaignsWithProducts = campaigns.filter(c => 
      'selectedProducts' in c && Array.isArray(c.selectedProducts) && c.selectedProducts.length > 0
    );
    
    console.log(`\n✅ Summary:`);
    console.log(`   - Total campaigns: ${campaigns.length}`);
    console.log(`   - Campaigns with products: ${campaignsWithProducts.length}`);
    console.log(`   - Campaigns with selectedProducts property: ${campaigns.filter(c => 'selectedProducts' in c).length}`);
    
  } catch (error) {
    console.error('❌ Error checking campaigns:', error);
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = checkCampaignProducts;
}

// If running in browser console, you can call it directly
if (typeof window !== 'undefined') {
  window.checkCampaignProducts = checkCampaignProducts;
}

console.log('📝 Usage:');
console.log('   Browser console: checkCampaignProducts()');
console.log('   Or: await checkCampaignProducts()');


