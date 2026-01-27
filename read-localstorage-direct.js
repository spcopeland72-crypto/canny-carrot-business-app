/**
 * Read localStorage directly from business.cannycarrot.com
 * Uses Puppeteer to read localStorage without requiring login
 */

const puppeteer = require('puppeteer');

async function readLocalStorage() {
  let browser;
  try {
    console.log('🔍 Launching browser to read localStorage...\n');
    
    // Launch browser with existing user data directory (if available)
    // This allows access to existing session/cookies
    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ];
    
    browser = await puppeteer.launch({
      headless: false, // Show browser so user can see what's happening
      args: browserArgs,
      // Don't use user data dir - we'll navigate fresh and read localStorage
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to business app
    console.log('🌐 Navigating to business.cannycarrot.com...');
    await page.goto('https://business.cannycarrot.com', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    // Wait a bit for page to load
    await page.waitForTimeout(2000);
    
    // Extract localStorage data
    console.log('📦 Extracting localStorage data...\n');
    const repoData = await page.evaluate(() => {
      const REPOSITORY_KEYS = {
        BUSINESS_PROFILE: 'local_repo:business_profile',
        REWARDS: 'local_repo:rewards',
        CAMPAIGNS: 'local_repo:campaigns',
        CUSTOMERS: 'local_repo:customers',
      };
      
      const data = {
        timestamp: new Date().toISOString(),
        allKeys: Object.keys(localStorage),
        rewards: null,
        campaigns: null,
        businessProfile: null,
        customers: null,
      };
      
      // Try to read repository keys directly
      try {
        const rewardsKey = REPOSITORY_KEYS.REWARDS;
        const campaignsKey = REPOSITORY_KEYS.CAMPAIGNS;
        const profileKey = REPOSITORY_KEYS.BUSINESS_PROFILE;
        const customersKey = REPOSITORY_KEYS.CUSTOMERS;
        
        // Check all possible prefixes
        const prefixes = ['', '@AsyncStorage:', 'asyncStorage:', 'RNAsyncStorage:'];
        
        for (const prefix of prefixes) {
          // Rewards
          const rewardsValue = localStorage.getItem(prefix + rewardsKey);
          if (rewardsValue && !data.rewards) {
            try {
              data.rewards = JSON.parse(rewardsValue);
              console.log(`✅ Found rewards in: ${prefix + rewardsKey}`);
            } catch (e) {
              console.log(`⚠️ Rewards key exists but invalid JSON: ${prefix + rewardsKey}`);
            }
          }
          
          // Campaigns
          const campaignsValue = localStorage.getItem(prefix + campaignsKey);
          if (campaignsValue && !data.campaigns) {
            try {
              data.campaigns = JSON.parse(campaignsValue);
              console.log(`✅ Found campaigns in: ${prefix + campaignsKey}`);
            } catch (e) {
              console.log(`⚠️ Campaigns key exists but invalid JSON: ${prefix + campaignsKey}`);
            }
          }
          
          // Business Profile
          const profileValue = localStorage.getItem(prefix + profileKey);
          if (profileValue && !data.businessProfile) {
            try {
              data.businessProfile = JSON.parse(profileValue);
              console.log(`✅ Found business profile in: ${prefix + profileKey}`);
            } catch (e) {
              console.log(`⚠️ Profile key exists but invalid JSON: ${prefix + profileKey}`);
            }
          }
          
          // Customers
          const customersValue = localStorage.getItem(prefix + customersKey);
          if (customersValue && !data.customers) {
            try {
              data.customers = JSON.parse(customersValue);
              console.log(`✅ Found customers in: ${prefix + customersKey}`);
            } catch (e) {
              console.log(`⚠️ Customers key exists but invalid JSON: ${prefix + customersKey}`);
            }
          }
        }
        
        // Also scan all keys for anything repository-related
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('local_repo:') || key.includes('reward') || key.includes('campaign'))) {
            if (!data[key]) {
              try {
                const value = localStorage.getItem(key);
                if (value) {
                  data[key] = JSON.parse(value);
                }
              } catch (e) {
                data[key] = localStorage.getItem(key);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error reading localStorage:', error);
        data.error = error.message;
      }
      
      return data;
    });
    
    // Print results
    console.log('REWARDS:');
    console.log('='.repeat(80));
    if (repoData.rewards && Array.isArray(repoData.rewards)) {
      console.log(`Found ${repoData.rewards.length} rewards in localStorage:\n`);
      repoData.rewards.forEach((reward, i) => {
        console.log(`${i + 1}. ${reward.name || 'Unnamed'} (ID: ${reward.id || 'N/A'})`);
      });
      console.log('\nFull rewards data:');
      console.log(JSON.stringify(repoData.rewards, null, 2));
    } else {
      console.log('No rewards found in localStorage');
      console.log('All localStorage keys:', repoData.allKeys);
    }
    
    console.log('\n\nCAMPAIGNS:');
    console.log('='.repeat(80));
    if (repoData.campaigns && Array.isArray(repoData.campaigns)) {
      console.log(`Found ${repoData.campaigns.length} campaigns in localStorage:\n`);
      repoData.campaigns.forEach((campaign, i) => {
        console.log(`${i + 1}. ${campaign.name || 'Unnamed'} (ID: ${campaign.id || 'N/A'})`);
      });
      console.log('\nFull campaigns data:');
      console.log(JSON.stringify(repoData.campaigns, null, 2));
    } else {
      console.log('No campaigns found in localStorage');
    }
    
    // Keep browser open briefly for inspection
    console.log('\n⏳ Keeping browser open for 5 seconds for inspection...');
    await page.waitForTimeout(5000);
    
    await browser.close();
    console.log('\n✅ Done');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

readLocalStorage();





