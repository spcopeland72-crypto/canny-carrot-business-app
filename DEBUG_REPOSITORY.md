# Debug Repository Contents in Browser

## Steps to Check Repository Contents:

1. **Open Browser DevTools** (F12)
2. **Go to Console Tab**
3. **Run these commands** (AsyncStorage in React Native Web uses localStorage):

```javascript
// Check all AsyncStorage keys
const checkRepository = async () => {
  console.log('=== REPOSITORY DEBUG ===');
  
  // Check all localStorage keys (AsyncStorage maps to localStorage in web)
  const allKeys = Object.keys(localStorage);
  const repoKeys = allKeys.filter(key => key.includes('local_repo') || key.includes('archived_repo'));
  
  console.log('Repository Keys Found:', repoKeys);
  
  // Check business profile
  const profile = localStorage.getItem('local_repo:business_profile');
  if (profile) {
    console.log('Business Profile:', JSON.parse(profile));
  } else {
    console.log('❌ No business profile in repository');
  }
  
  // Check rewards
  const rewards = localStorage.getItem('local_repo:rewards');
  if (rewards) {
    const rewardsData = JSON.parse(rewards);
    console.log(`✅ Rewards Found: ${rewardsData.length} rewards`);
    console.log('Rewards Data:', rewardsData);
    rewardsData.forEach((reward, index) => {
      console.log(`  Reward ${index + 1}:`, {
        id: reward.id,
        name: reward.name,
        requirement: reward.requirement,
        stampsRequired: reward.stampsRequired,
        count: reward.count,
        total: reward.total,
        icon: reward.icon,
        type: reward.type,
        rewardType: reward.rewardType,
      });
    });
  } else {
    console.log('❌ No rewards in repository');
  }
  
  // Check campaigns
  const campaigns = localStorage.getItem('local_repo:campaigns');
  if (campaigns) {
    const campaignsData = JSON.parse(campaigns);
    console.log(`✅ Campaigns Found: ${campaignsData.length} campaigns`);
    console.log('Campaigns Data:', campaignsData);
  } else {
    console.log('❌ No campaigns in repository');
  }
  
  // Check sync metadata
  const syncMetadata = localStorage.getItem('local_repo:sync_metadata');
  if (syncMetadata) {
    console.log('Sync Metadata:', JSON.parse(syncMetadata));
  }
  
  // Check current business ID
  const currentBusinessId = localStorage.getItem('local_repo:current_business_id');
  console.log('Current Business ID:', currentBusinessId);
  
  // Check auth
  const auth = localStorage.getItem('business_auth');
  if (auth) {
    const authData = JSON.parse(auth);
    console.log('Auth Data:', {
      businessId: authData.businessId,
      email: authData.email,
      isAuthenticated: authData.isAuthenticated,
    });
  } else {
    console.log('❌ No auth data found');
  }
};

checkRepository();
```

4. **After Login, Check Console Logs** - Look for:
   - `[REPOSITORY]` logs
   - `[App]` logs
   - `[HomeScreen]` logs
   - Any errors related to rewards loading

## Common Issues:

1. **If rewards array is empty**: Check API response in Network tab
2. **If rewards exist but don't display**: Check HomeScreen props and state
3. **If transformation failed**: Check if rewards have `requirement`, `count`, `total`, `icon` fields

## Network Tab Checks:

1. **Check API Call**: `GET /api/v1/rewards?businessId={id}`
   - Status should be 200
   - Response should have `success: true` and `data: [...]`
   - Check if rewards have `stampsRequired` field (DB format)

2. **Check if data is being downloaded**: Look for network request after login



