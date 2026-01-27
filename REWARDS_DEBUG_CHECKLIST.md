# Rewards Not Displaying - Debug Checklist

## Issue
Rewards are not appearing in the UI carousel after login, even though they should be loaded from the repository.

## Steps to Debug on business.cannycarrot.com

### 1. Check if Code is Deployed
- The latest fixes may not be deployed yet
- Check git commit history: Latest commit should be `e4e0eda` (Simplify reward transformation)
- Vercel may need to rebuild after push

### 2. Browser Console Checks (F12 → Console Tab)

After logging in, check for these logs:

#### Expected Logs on Login:
```
[REPOSITORY] Fetching rewards from API...
[REPOSITORY] API returned X rewards (DB format)
[REPOSITORY] X rewards transformed (DB→App) and saved
[App] Loading rewards from repository after login...
[App] Found X rewards in repository
[App] Loaded X rewards from repository (already in app format)
[App] Rendering HomeScreen with rewards: { rewardsCount: X, ... }
[HomeScreen] Rewards props updated: { count: X, rewards: [...] }
[HomeScreen] Current render state: { rewardsCount: X, ... }
```

#### If logs show 0 rewards:
- Check Network tab for API call: `GET /api/v1/rewards?businessId={id}`
- Verify API returns rewards in response
- Check if transformation is happening

#### If logs show rewards but UI is empty:
- Check if props are being passed correctly
- Check if HomeScreen is receiving rewards prop
- Check browser console for rendering errors

### 3. Check LocalStorage (F12 → Application Tab → Local Storage)

Look for these keys:
- `local_repo:rewards` - Should contain JSON array of rewards
- `local_repo:business_profile` - Should have business data
- `local_repo:current_business_id` - Should have businessId
- `business_auth` - Should have auth data

#### Run this in Console to check:
```javascript
// Check rewards in repository
const rewards = localStorage.getItem('local_repo:rewards');
if (rewards) {
  const data = JSON.parse(rewards);
  console.log(`Found ${data.length} rewards:`, data);
  data.forEach((r, i) => {
    console.log(`Reward ${i+1}:`, {
      id: r.id,
      name: r.name,
      requirement: r.requirement,
      count: r.count,
      total: r.total,
      icon: r.icon,
      type: r.type,
      rewardType: r.rewardType
    });
  });
} else {
  console.log('❌ No rewards in repository');
}
```

### 4. Network Tab Checks

After login, check for:
- `GET /api/v1/rewards?businessId={id}` - Should return 200 with rewards array
- Response should have: `{ success: true, data: [...] }`
- Each reward should have `stampsRequired` field (DB format)

### 5. Common Issues & Fixes

#### Issue: Rewards array is empty in repository
**Cause:** API not returning rewards or download failed
**Fix:** Check API endpoint, verify businessId is correct

#### Issue: Rewards exist but don't have required fields (count, total, icon)
**Cause:** Transformation not happening or incomplete
**Fix:** Check transformation code in `localRepository.ts` line 589-613

#### Issue: Rewards in repository but not in UI
**Cause:** Props not being passed or component not re-rendering
**Fix:** Check `App.tsx` line 415 - rewards prop should be passed to HomeScreen

#### Issue: HomeScreen shows "No rewards available" debug message
**Cause:** Rewards array is empty when component renders
**Fix:** Check if rewards are loaded after login completes

### 6. Force Reload Test

1. Clear localStorage: `localStorage.clear()`
2. Log out and log back in
3. Watch console logs for reward loading
4. Check if rewards appear

### 7. Manual Repository Check

If rewards are in repository but not displaying:

```javascript
// Force check repository
import { rewardsRepository } from './src/services/localRepository';
const rewards = await rewardsRepository.getAll();
console.log('Repository rewards:', rewards);
```

### 8. Deployment Status

To verify deployment:
1. Check Vercel dashboard for latest deployment
2. Verify latest commit hash matches `e4e0eda`
3. If not, trigger manual redeploy: `git push origin main`

## Current Code Flow (After Fixes)

1. **Login** → `authService.loginBusiness()`
2. **Download** → `downloadAllData()` → Fetches from API, transforms DB→App format ONCE
3. **Store** → `rewardsRepository.saveAll()` → Stores app format in repository
4. **Load** → `handleLoginSuccess()` → Loads from repository (already app format)
5. **Render** → `HomeScreen` → Receives rewards prop, renders carousel

## Files to Check

- `src/services/localRepository.ts` - Lines 574-620 (downloadAllData transformation)
- `App.tsx` - Lines 148-177 (handleLoginSuccess loading)
- `src/components/HomeScreen.tsx` - Lines 108-154 (props and rendering)



