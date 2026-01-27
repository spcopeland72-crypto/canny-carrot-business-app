# Test Build Environment - Lessons Learned & Configuration

## Date: 2026-01-05

## Critical Lessons Learned

### 1. CORS Configuration for Local Development

**Issue:** Business app running locally (Metro/Expo on `localhost:8082`) cannot connect to production API (`api.cannycarrot.com`) due to CORS restrictions.

**Root Cause:** Production API's `CORS_ORIGINS` environment variable in Vercel only allows production domains, blocking localhost origins.

**Solution:** 
- Update `CORS_ORIGINS` in Vercel to include localhost for development:
  ```
  https://cannycarrot.com,https://www.cannycarrot.com,http://localhost:8082,http://localhost:8081
  ```
- **NOTE:** This must be reverted before final production release (see PRODUCTION_TODO.md)

**Location:** Vercel Dashboard → `canny-carrot-api` → Settings → Environment Variables → `CORS_ORIGINS`

---

### 2. Metro Bundler Dynamic Import Issues

**Issue:** Error "Requiring unknown module '412'" when using dynamic imports in React Native/Expo.

**Root Cause:** Metro bundler has issues with dynamic `import()` statements in some cases.

**Solution:** Use static imports instead of dynamic imports:
```typescript
// ❌ BAD - Causes Metro bundler errors
const { startDailySync } = await import('./src/services/dailySyncService');

// ✅ GOOD - Static import at top of file
import { startDailySync } from './src/services/dailySyncService';
```

**Lesson:** Always prefer static imports in React Native/Expo applications.

---

### 3. Authentication Flow - Local Storage vs API

**Issue:** Business app needs to authenticate against production API but store credentials locally for subsequent logins.

**Implementation:**
- **First Login:** 
  - Calls `/api/v1/auth/business/login` with email/password
  - API verifies credentials against Redis
  - Stores auth credentials locally in AsyncStorage
  - Downloads all business data to local repository
  
- **Subsequent Logins:**
  - Uses locally stored credentials from AsyncStorage
  - Still verifies password against API (for security)
  - No need to re-download data (uses local repository)

**Key Files:**
- `src/services/authService.ts` - Authentication logic
- `src/services/localRepository.ts` - Local data storage (single source of truth)
- `App.tsx` - Login flow and data loading

---

### 4. Local Repository as Single Source of Truth

**Architecture:** The business app uses an offline-first architecture where the local repository is the single source of truth.

**Data Flow:**
1. **First Login:** Data downloads from Redis → Local Repository
2. **App Usage:** All reads/writes go to Local Repository
3. **Daily Sync:** Local Repository → Redis (once per day)

**Repository Structure:**
- Business Profile: `businessRepository`
- Rewards: `rewardsRepository`
- Campaigns: `campaignsRepository`
- Customers: `customersRepository`

**Storage:** AsyncStorage (React Native's persistent key-value store)

**Key Files:**
- `src/services/localRepository.ts` - Repository implementation
- `src/services/dailySyncService.ts` - Daily sync to Redis

---

### 5. App Initialization - Always Show Login

**Requirement:** App should always start with login screen to allow testing different business IDs.

**Implementation:**
- Check authentication status on mount
- If authenticated, load data from local repository
- If not authenticated, show login screen
- **Important:** Don't auto-login based on stored credentials (requires explicit login)

**Current Behavior:**
- App checks `isAuthenticated()` on mount
- If auth exists, sets `isAuthenticatedState = true`
- If no auth, shows login screen

**To Force Login Screen:** Clear AsyncStorage or ensure no auth credentials exist.

---

## Configuration

### Metro Bundler Configuration

**Port:** 8082 (business app)
- Started with: `npx expo start --lan --port 8082`
- Accessible on local network (WiFi) via IP address

**Settings:**
- Network mode: LAN (allows mobile device access on WiFi)
- Port: 8082 (avoid conflicts with other Expo apps)

---

### API Configuration

**Production API URL:** `https://api.cannycarrot.com`

**Configuration Files:**
- `app.json` → `extra.apiUrl`: `https://api.cannycarrot.com`
- `src/services/authService.ts`: Uses Constants.expoConfig.extra.apiUrl
- `src/services/redis.ts`: Uses Constants.expoConfig.extra.apiUrl
- `src/services/localRepository.ts`: Uses production API URL

**All services point to production API** - no localhost API server needed for testing.

---

### Environment Variables (Vercel)

**API Server (`canny-carrot-api`):**
- `NODE_ENV`: `production`
- `REDIS_URL`: Redis connection string
- `CORS_ORIGINS`: `https://cannycarrot.com,https://www.cannycarrot.com,http://localhost:8082,http://localhost:8081` (includes localhost for dev)
- `JWT_SECRET`: JWT signing secret

**Note:** CORS_ORIGINS must include localhost origins for local development testing.

---

## Development Workflow

### Starting the App

1. **Start Metro Bundler:**
   ```powershell
   cd "C:\Canny Carrot\canny-carrot-business-app"
   $env:EXPO_NO_TELEMETRY="1"
   npx expo start --lan --port 8082
   ```

2. **Access on Mobile:**
   - Connect mobile device to same WiFi network
   - Scan QR code from Metro bundler
   - Or manually enter: `exp://[YOUR_IP]:8082`

3. **Login:**
   - App will show login screen
   - Enter business email and password
   - First login downloads data from Redis
   - Subsequent logins use local repository

---

### Testing Different Business IDs

**To test with different business:**
1. Logout (clears local auth)
2. Login with different business credentials
3. Data downloads for that business ID
4. App uses that business's local repository data

**Current Issue:** App doesn't automatically clear auth on mount, so it might auto-login with stored credentials.

**Solution Needed:** Always show login screen on app start (clear auth state on mount, or add logout on app start).

---

## Known Issues & Fixes

### Issue 1: Data Not Loading After Login

**Problem:** Data downloads to local repository but app doesn't load it into state.

**Root Cause:** App.tsx uses old `dataStorage.ts` (file-based) instead of `localRepository.ts`.

**Fix Required:** 
- Update App.tsx to load data from `localRepository` instead of `dataStorage`
- Load data after successful login
- Load data on mount if already authenticated

---

### Issue 2: App Auto-Login on Start

**Problem:** App automatically logs in if credentials exist in AsyncStorage.

**Requirement:** App should always show login screen on start.

**Fix Required:**
- Clear auth state on mount, OR
- Add option to force logout on app start, OR
- Add debug setting to always show login screen

---

## File Structure

```
canny-carrot-business-app/
├── App.tsx                          # Main app component (needs update for localRepository)
├── src/
│   ├── services/
│   │   ├── authService.ts          # Authentication (uses local storage)
│   │   ├── localRepository.ts      # Local data repository (single source of truth)
│   │   ├── dailySyncService.ts     # Daily sync to Redis
│   │   ├── redis.ts                # Redis proxy (uses API)
│   │   └── dataAccess.ts           # (legacy, might not be used)
│   ├── utils/
│   │   ├── dataStorage.ts          # (legacy file-based storage)
│   │   └── qrCodeUtils.ts          # QR code generation/parsing
│   └── components/
│       └── LoginPage.tsx           # Login component
└── app.json                         # Expo configuration (API URL)
```

---

## Next Steps

1. ✅ Fix CORS in Vercel (add localhost origins)
2. ✅ Fix Metro bundler dynamic import issue
3. ⚠️ Fix data loading from localRepository (currently uses dataStorage)
4. ⚠️ Ensure app always shows login screen on start
5. ⚠️ Test login flow with different business IDs
6. ⚠️ Verify data downloads correctly to local repository
7. ⚠️ Verify data loads from local repository after login

---

## Testing Checklist

- [ ] App shows login screen on start
- [ ] First login downloads data from Redis
- [ ] Data appears in app after login
- [ ] Subsequent logins use local repository
- [ ] Logout clears auth and data
- [ ] Login with different business ID works
- [ ] Data loads correctly for each business ID
- [ ] Daily sync service starts after login
- [ ] CORS allows localhost:8082 to connect to API






