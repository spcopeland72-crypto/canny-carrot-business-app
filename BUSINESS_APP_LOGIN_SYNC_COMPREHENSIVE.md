# Canny Carrot Business App - Comprehensive Login & Database Synchronization Guide

**Date:** January 5, 2026  
**App:** `canny-carrot-business-app`  
**Purpose:** Complete documentation of login process with database synchronization (first login and subsequent timestamp-based sync with multi-account repository management)

---

## Executive Summary

The business app implements a **comprehensive login system with multi-account repository management**:

1. **First Login**: Verifies credentials against Redis database → Stores credentials locally → Handles repository matching/archiving → Downloads or restores data
2. **Subsequent Logins**: Verifies password via API → Checks repository match → Archives/restores as needed → Checks timestamps → Refreshes if needed

**Key Principle**: Redis is the single source of truth. Local repository is an offline-first cache that syncs on login and daily. Supports multiple business accounts via repository archiving.

---

## Architecture Overview

### Core Components

1. **LoginPage.tsx** - UI component handling login form
2. **authService.ts** - Authentication logic (first vs subsequent login with repository matching)
3. **localRepository.ts** - Local data storage (offline-first repository with archiving support)
4. **dailySyncService.ts** - Daily background sync to Redis
5. **syncManager.ts** - Offline-first sync manager with conflict resolution
6. **App.tsx** - Main app component handling post-login data loading

### Data Flow

```
User Login
    ↓
authService.loginBusiness()
    ↓
[First Login?] ──YES──> Verify against Redis → Store credentials → Repository Logic
    │                                                      ↓
    NO                                                      └─> [Repository exists?]
    ↓                                                              │
Verify password via API                                   NO ──> [Archived repo exists?]
    ↓                                                              │ YES ──> Restore archived
    ↓                                                              │ NO ──> Download from DB
Repository Logic ──────────────────────────────────────────────> │
    ↓                                                              │
[Repository exists?]                                              │
    │                                                              │
    NO ──> [Archived repo exists?]                               │
    │      │ YES ──> Restore archived                            │
    │      │ NO ──> Download from DB                             │
    │                                                             │
    YES ──> [Matches login credentials?]                         │
            │                                                     │
            YES ──> Check timestamps                             │
            │      [Local older?]                                │
            │      YES ──> Download from DB                      │
            │      NO ──> Complete (up to date)                  │
            │                                                     │
            NO ──> Archive current repo                          │
                   ↓                                              │
            [Archived repo exists?]                              │
            │ YES ──> Restore archived                           │
            │ NO ──> Download from DB                            │
                   ↓                                              │
            Check timestamps (if restored)                       │
                   ↓                                              │
            └─────────────────────────────────────────────────────┘
                                ↓
                        Local Repository
                                ↓
                        Complete Login
```

---

## COMPLETE LOGIN PROCESS (Updated)

### Flow Logic for ALL Logins

**Step 1: Check if repository exists**
- If NO repository → Go to Step 2A
- If YES repository → Go to Step 3

**Step 2A: No Repository Exists**
- Check if archived repository exists for login businessId
  - If YES: Restore archived repository → Check timestamps → Complete
  - If NO: Download repository from database → Complete

**Step 3: Repository Exists**
- Check if repository matches login credentials (businessId match)
  - If MATCHES: Check timestamps → Refresh if older → Complete
  - If DOESN'T MATCH: Go to Step 4

**Step 4: Repository Doesn't Match Login Credentials**
- Archive current repository (saves to `archived_repo:{currentBusinessId}:*`)
- Clear primary repository
- Check if archived repository exists for login businessId
  - If YES: Restore archived repository → Check timestamps → Complete
  - If NO: Download repository from database → Complete

---

## FIRST LOGIN PROCESS

### Flow Diagram

```
┌─────────────────┐
│  User enters    │
│  email/password │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  LoginPage.tsx              │
│  handleLogin()              │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()            │
│                             │
│  1. Check local storage     │
│     getStoredAuth() ──> null│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  FIRST LOGIN PATH           │
│  (credentials not stored)   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Step 1: Query Redis        │
│  redis.get()                │
│  Key: business:email:{email}│
│  Returns: businessId        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Step 2: Verify Business    │
│  redis.get()                │
│  Key: business:{businessId} │
│  Returns: BusinessRecord    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Step 3: Verify Password    │
│  POST /api/v1/auth/         │
│      business/login         │
│  Returns: JWT token         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Step 4: Store Auth         │
│  AsyncStorage.setItem()     │
│  Stores: businessId, email, │
│          token, etc.        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  REPOSITORY SYNC LOGIC      │
│  (First Login)              │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Check Repository Exists    │
│  repositoryExists()         │
└────────┬────────────────────┘
         │
         ├─── NO REPOSITORY ───────────────────────────────────┐
         │                                                     │
         │  Check Archived Repository                          │
         │  archivedRepositoryExists(businessId)               │
         │                                                     │
         │  ┌───────────────┴──────────────┐                  │
         │  │                               │                  │
         │  YES                            NO                  │
         │  │                               │                  │
         │  ▼                               ▼                  │
         │  Restore Archived        Download All Data          │
         │  restoreArchivedRepo()   downloadAllData()          │
         │  │                               │                  │
         │  ▼                               ▼                  │
         │  Check Timestamps        Repository Created         │
         │  │                               │                  │
         │  └───────────────┬───────────────┘                  │
         │                  │                                  │
         └──────────────────┴──────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────────────────────┐
         │                                                     │
         └─── REPOSITORY EXISTS ───────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────────────┐
         │  Check Repository Matches Login              │
         │  repositoryMatchesBusiness(businessId)       │
         │  Compares: profile.id === businessId         │
         └──────────────┬───────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
    MATCHES                    DOESN'T MATCH
         │                             │
         ▼                             ▼
    Check Timestamps          Archive Current Repo
         │                     archiveRepository()
         │                             │
    [Local older?]            Clear Primary Repo
         │                             │
    YES ──> Download          Check Archived Repo
    NO ──> Complete           │
         │                     ├── YES ──> Restore Archived
         │                     │          │
         │                     │          Check Timestamps
         │                     │          │
         │                     └── NO ──> Download All Data
         │                                │
         └────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  Return Auth Object          │
         │  (Login successful)          │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  App.tsx                     │
         │  handleLoginSuccess()        │
         │                              │
         │  1. Load data from           │
         │     localRepository          │
         │  2. Start daily sync         │
         │  3. Set authenticated state  │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  Show HomeScreen             │
         │  (App authenticated)         │
         └──────────────────────────────┘
```

---

## SUBSEQUENT LOGIN PROCESS

### Flow Diagram

```
┌─────────────────┐
│  User enters    │
│  email/password │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()            │
│                             │
│  1. Check local storage     │
│     getStoredAuth()         │
│     ──> Returns: {          │
│       businessId, email,    │
│       token, ...            │
│     }                       │
│                             │
│  2. Email matches stored?   │
│     ──> YES (subsequent)    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  SUBSEQUENT LOGIN PATH      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Verify Password via API    │
│  POST /api/v1/auth/         │
│      business/login         │
│  Body: {                    │
│    email, password,         │
│    businessId (stored)      │
│  }                          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  REPOSITORY SYNC LOGIC      │
│  (Subsequent Login)         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Check Repository Exists    │
│  repositoryExists()         │
└────────┬────────────────────┘
         │
         ├─── NO REPOSITORY ───────────────────────────────────┐
         │                                                     │
         │  Check Archived Repository                          │
         │  archivedRepositoryExists(businessId)               │
         │                                                     │
         │  ┌───────────────┴──────────────┐                  │
         │  │                               │                  │
         │  YES                            NO                  │
         │  │                               │                  │
         │  ▼                               ▼                  │
         │  Restore Archived        Download All Data          │
         │  restoreArchivedRepo()   downloadAllData()          │
         │  │                               │                  │
         │  ▼                               ▼                  │
         │  Check Timestamps        Repository Created         │
         │  │                               │                  │
         │  └───────────────┬───────────────┘                  │
         │                  │                                  │
         └──────────────────┴──────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────────────────────┐
         │                                                     │
         └─── REPOSITORY EXISTS ───────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────────────┐
         │  Check Repository Matches Login              │
         │  repositoryMatchesBusiness(businessId)       │
         │  Compares: profile.id === businessId         │
         └──────────────┬───────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
    MATCHES                    DOESN'T MATCH
         │                             │
         ▼                             ▼
    Check Timestamps          Archive Current Repo
         │                     archiveRepository()
         │                     Gets: currentBusinessId
         │                     Archives to:
         │                     archived_repo:{currentBusinessId}:*
         │                     Clears primary repo
         │                             │
    [Local older?]            Check Archived Repo
         │                     archivedRepositoryExists(
         │                     businessId)
         │                             │
    YES ──> Download          ┌────────┴────────┐
    NO ──> Complete           │                 │
         │                     YES              NO
         │                     │                 │
         │                     ▼                 ▼
         │              Restore Archived  Download All Data
         │              restoreArchived   downloadAllData()
         │              Repo()            │
         │              │                 │
         │              Check Timestamps  Repository Created
         │              │                 │
         │              └────────┬────────┘
         │                       │
         └───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  Return Stored Auth Object   │
         │  (No need to update storage) │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  App.tsx                     │
         │  handleLoginSuccess()        │
         │  (Same as first login)       │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  Show HomeScreen             │
         │  (App authenticated)         │
         └──────────────────────────────┘
```

---

## KEY FUNCTIONS & IMPLEMENTATIONS

### 1. `loginBusiness(email, password)` - authService.ts

**Purpose:** Main login function handling both first and subsequent logins with repository matching

**Key Logic:**
```typescript
// Check if subsequent login
const existingAuth = await getStoredAuth();
const isSubsequentLogin = existingAuth && 
  existingAuth.email.toLowerCase() === email.toLowerCase();

if (isSubsequentLogin && existingAuth) {
  // SUBSEQUENT LOGIN PATH
  // Verify password using stored businessId (faster)
  // Check repository match and handle archiving/restoring
} else {
  // FIRST LOGIN PATH
  // Query Redis for businessId via email index
  // Verify business exists
  // Verify password via API
  // Store credentials locally
  // Check repository match and handle archiving/restoring
}
```

**Repository Sync Logic (Both Paths):**
```typescript
const repoExists = await repositoryExists();

if (!repoExists) {
  // NO REPOSITORY: Check for archived repository
  const hasArchived = await archivedRepositoryExists(businessId);
  
  if (hasArchived) {
    // RESTORE ARCHIVED REPOSITORY
    await restoreArchivedRepository(businessId);
    // Check timestamps and refresh if needed
  } else {
    // NO ARCHIVED: Download from database
    await downloadAllData(businessId, API_BASE_URL);
  }
} else {
  // REPOSITORY EXISTS: Check if it matches login credentials
  const matchesBusiness = await repositoryMatchesBusiness(businessId);
  
  if (matchesBusiness) {
    // MATCHES: Check timestamps and refresh if needed
    // ... timestamp check logic
  } else {
    // DOESN'T MATCH: Archive current, restore archived OR download
    const currentBusinessId = profile?.id || getCurrentRepositoryBusinessId();
    if (currentBusinessId && currentBusinessId !== businessId) {
      await archiveRepository(currentBusinessId);  // Archives and clears primary
    }
    
    // Check for archived repository matching login
    const hasArchived = await archivedRepositoryExists(businessId);
    if (hasArchived) {
      await restoreArchivedRepository(businessId);
      // Check timestamps and refresh if needed
    } else {
      await downloadAllData(businessId, API_BASE_URL);
    }
  }
}
```

### 2. `repositoryExists()` - localRepository.ts

**Purpose:** Check if local primary repository exists (has business profile)

**Implementation:**
```typescript
export const repositoryExists = async (): Promise<boolean> => {
  try {
    const profile = await businessRepository.get();
    return profile !== null;
  } catch (error) {
    console.error('Error checking repository existence:', error);
    return false;
  }
};
```

### 3. `repositoryMatchesBusiness(businessId)` - localRepository.ts

**Purpose:** Check if the local repository matches the login businessId

**Implementation:**
```typescript
export const repositoryMatchesBusiness = async (businessId: string): Promise<boolean> => {
  try {
    const profile = await businessRepository.get();
    if (!profile) {
      return false;
    }
    return profile.id === businessId;
  } catch (error) {
    console.error('Error checking repository business match:', error);
    return false;
  }
};
```

**Returns:**
- `true` if `profile.id === businessId`
- `false` if profile doesn't exist or IDs don't match

### 4. `getCurrentRepositoryBusinessId()` - localRepository.ts

**Purpose:** Get the businessId that the current primary repository belongs to

**Implementation:**
```typescript
export const getCurrentRepositoryBusinessId = async (): Promise<string | null> => {
  try {
    const businessId = await AsyncStorage.getItem(REPOSITORY_KEYS.CURRENT_BUSINESS_ID);
    return businessId;
  } catch (error) {
    console.error('Error getting current repository business ID:', error);
    return null;
  }
};
```

**Storage Key:** `local_repo:current_business_id`

### 5. `archiveRepository(businessId)` - localRepository.ts

**Purpose:** Archive the current primary repository for a specific businessId

**Implementation:**
```typescript
export const archiveRepository = async (businessId: string): Promise<void> => {
  try {
    console.log(`📦 [ARCHIVE] Archiving repository for business: ${businessId}`);
    
    // Get all current repository data
    const profile = await businessRepository.get();
    const rewards = await rewardsRepository.getAll();
    const campaigns = await campaignsRepository.getAll();
    const customers = await customersRepository.getAll();
    const syncMetadata = await getSyncMetadata();
    
    if (!profile) {
      console.log('⚠️ [ARCHIVE] No repository to archive');
      return;
    }
    
    // Store each piece in archived location
    await AsyncStorage.setItem(getArchivedKey(businessId, 'business_profile'), JSON.stringify(profile));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'rewards'), JSON.stringify(rewards));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'campaigns'), JSON.stringify(campaigns));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'customers'), JSON.stringify(customers));
    await AsyncStorage.setItem(getArchivedKey(businessId, 'sync_metadata'), JSON.stringify(syncMetadata));
    
    // Clear primary repository after archiving (to make room for new primary)
    await AsyncStorage.multiRemove([
      REPOSITORY_KEYS.BUSINESS_PROFILE,
      REPOSITORY_KEYS.REWARDS,
      REPOSITORY_KEYS.CAMPAIGNS,
      REPOSITORY_KEYS.CUSTOMERS,
      REPOSITORY_KEYS.SYNC_METADATA,
      REPOSITORY_KEYS.LAST_SYNC,
      REPOSITORY_KEYS.CURRENT_BUSINESS_ID,
    ]);
    
    console.log(`✅ [ARCHIVE] Repository archived for business: ${businessId} and primary repository cleared`);
  } catch (error) {
    console.error('❌ [ARCHIVE] Error archiving repository:', error);
    throw error;
  }
};
```

**Storage Keys (Archived):**
- `archived_repo:{businessId}:business_profile`
- `archived_repo:{businessId}:rewards`
- `archived_repo:{businessId}:campaigns`
- `archived_repo:{businessId}:customers`
- `archived_repo:{businessId}:sync_metadata`

**Actions:**
1. Copies all primary repository data to archived location
2. Clears primary repository (makes room for new primary)

### 6. `archivedRepositoryExists(businessId)` - localRepository.ts

**Purpose:** Check if archived repository exists for a specific businessId

**Implementation:**
```typescript
export const archivedRepositoryExists = async (businessId: string): Promise<boolean> => {
  try {
    const archivedProfile = await AsyncStorage.getItem(getArchivedKey(businessId, 'business_profile'));
    return archivedProfile !== null;
  } catch (error) {
    console.error('Error checking archived repository existence:', error);
    return false;
  }
};
```

**Storage Key Checked:** `archived_repo:{businessId}:business_profile`

### 7. `restoreArchivedRepository(businessId)` - localRepository.ts

**Purpose:** Restore archived repository for a specific businessId to primary repository

**Implementation:**
```typescript
export const restoreArchivedRepository = async (businessId: string): Promise<void> => {
  try {
    console.log(`📥 [RESTORE] Restoring archived repository for business: ${businessId}`);
    
    // Check if archived repository exists
    const hasArchived = await archivedRepositoryExists(businessId);
    if (!hasArchived) {
      throw new Error(`No archived repository found for business: ${businessId}`);
    }
    
    // Get archived data
    const archivedProfile = await AsyncStorage.getItem(getArchivedKey(businessId, 'business_profile'));
    const archivedRewards = await AsyncStorage.getItem(getArchivedKey(businessId, 'rewards'));
    const archivedCampaigns = await AsyncStorage.getItem(getArchivedKey(businessId, 'campaigns'));
    const archivedCustomers = await AsyncStorage.getItem(getArchivedKey(businessId, 'customers'));
    const archivedSyncMetadata = await AsyncStorage.getItem(getArchivedKey(businessId, 'sync_metadata'));
    
    // Restore to primary repository
    if (archivedProfile) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.BUSINESS_PROFILE, archivedProfile);
    }
    if (archivedRewards) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.REWARDS, archivedRewards);
    }
    if (archivedCampaigns) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CAMPAIGNS, archivedCampaigns);
    }
    if (archivedCustomers) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.CUSTOMERS, archivedCustomers);
    }
    if (archivedSyncMetadata) {
      await AsyncStorage.setItem(REPOSITORY_KEYS.SYNC_METADATA, archivedSyncMetadata);
    }
    
    // Set current business ID
    await setCurrentRepositoryBusinessId(businessId);
    
    console.log(`✅ [RESTORE] Repository restored for business: ${businessId}`);
  } catch (error) {
    console.error('❌ [RESTORE] Error restoring archived repository:', error);
    throw error;
  }
};
```

**Actions:**
1. Checks if archived repository exists
2. Copies all archived data to primary repository keys
3. Sets current business ID to match restored repository

### 8. `getLocalRepositoryTimestamp()` - localRepository.ts

**Purpose:** Get last update timestamp from local repository

**Implementation:**
```typescript
export const getLocalRepositoryTimestamp = async (): Promise<string | null> => {
  try {
    const profile = await businessRepository.get();
    return profile?.updatedAt || null;
  } catch (error) {
    console.error('Error getting local repository timestamp:', error);
    return null;
  }
};
```

**Returns:**
- `profile.updatedAt` (ISO timestamp string) if exists
- `null` if no profile or no `updatedAt` field

### 9. `getDatabaseRecordTimestamp(businessId, apiBaseUrl)` - localRepository.ts

**Purpose:** Get last update timestamp from Redis database via API

**Implementation:**
```typescript
export const getDatabaseRecordTimestamp = async (
  businessId: string, 
  apiBaseUrl: string = 'https://api.cannycarrot.com'
): Promise<string | null> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const businessData = result.data;
        // Check both updatedAt locations
        return businessData.updatedAt || 
               businessData.profile?.updatedAt || 
               null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting database record timestamp:', error);
    return null;
  }
};
```

**API Endpoint:** `GET /api/v1/businesses/{businessId}`

**Returns:**
- `businessData.updatedAt` (first priority)
- `businessData.profile.updatedAt` (fallback)
- `null` if not found or API error

### 10. `isLocalOlderThanDatabase(localTimestamp, dbTimestamp)` - localRepository.ts

**Purpose:** Compare timestamps to determine if local repository needs refresh

**Implementation:**
```typescript
export const isLocalOlderThanDatabase = (
  localTimestamp: string | null, 
  dbTimestamp: string | null
): boolean => {
  if (!localTimestamp || !dbTimestamp) {
    // If either is missing, consider local as older to trigger refresh
    return true;
  }
  
  try {
    const localDate = new Date(localTimestamp);
    const dbDate = new Date(dbTimestamp);
    return localDate < dbDate;
  } catch (error) {
    console.error('Error comparing timestamps:', error);
    // On error, assume local is older to trigger refresh
    return true;
  }
};
```

**Logic:**
- If either timestamp is `null` → Return `true` (refresh needed)
- Convert both to `Date` objects
- Return `localDate < dbDate` (true if local is older)
- On error → Return `true` (safe default: refresh)

### 11. `downloadAllData(businessId, apiBaseUrl)` - localRepository.ts

**Purpose:** Download all business data from Redis database and store in local repository

**Implementation:**
```typescript
export const downloadAllData = async (
  businessId: string, 
  apiBaseUrl: string = 'https://api.cannycarrot.com'
): Promise<void> => {
  console.log('📥 [REPOSITORY] Starting data download from Redis for business:', businessId);
  
  try {
    // 1. Download business profile
    const businessResponse = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}`);
    if (businessResponse.ok) {
      const businessResult = await businessResponse.json();
      if (businessResult.success && businessResult.data) {
        const businessData = businessResult.data;
        const profile: BusinessProfile = {
          id: businessData.id || businessId,
          name: businessData.name || businessData.profile?.name || '',
          email: businessData.email || businessData.profile?.email || '',
          // ... map all fields
          updatedAt: businessData.updatedAt || businessData.profile?.updatedAt,
        };
        await businessRepository.save(profile);
        console.log('✅ Business profile downloaded');
      }
    }

    // 2. Download rewards
    const rewardsResponse = await fetch(`${apiBaseUrl}/api/v1/rewards?businessId=${businessId}`);
    if (rewardsResponse.ok) {
      const rewardsResult = await rewardsResponse.json();
      if (rewardsResult.success && Array.isArray(rewardsResult.data)) {
        await rewardsRepository.saveAll(rewardsResult.data);
        console.log(`✅ ${rewardsResult.data.length} rewards downloaded`);
      }
    }

    // 3. Download campaigns
    const campaignsResponse = await fetch(`${apiBaseUrl}/api/v1/campaigns?businessId=${businessId}`);
    if (campaignsResponse.ok) {
      const campaignsResult = await campaignsResponse.json();
      if (campaignsResult.success && Array.isArray(campaignsResult.data)) {
        await campaignsRepository.saveAll(campaignsResult.data);
        console.log(`✅ ${campaignsResult.data.length} campaigns downloaded`);
      }
    }

    // 4. Download customers (members)
    const customersResponse = await fetch(`${apiBaseUrl}/api/v1/businesses/${businessId}/members`);
    if (customersResponse.ok) {
      const customersResult = await customersResponse.json();
      if (customersResult.success && Array.isArray(customersResult.data)) {
        await customersRepository.saveAll(customersResult.data);
        console.log(`✅ ${customersResult.data.length} customers downloaded`);
      }
    }

    // Update sync metadata
    await updateSyncMetadata({
      lastDownloadedAt: new Date().toISOString(),
      hasUnsyncedChanges: false,
    });

    // Set current business ID for this repository
    await setCurrentRepositoryBusinessId(businessId);

    console.log('✅ [REPOSITORY] All data downloaded successfully');
  } catch (error) {
    console.error('❌ [REPOSITORY] Error downloading data:', error);
    throw error;
  }
};
```

**Downloads:**
1. **Business Profile** - `GET /api/v1/businesses/{businessId}`
2. **Rewards** - `GET /api/v1/rewards?businessId={businessId}`
3. **Campaigns** - `GET /api/v1/campaigns?businessId={businessId}`
4. **Customers (Members)** - `GET /api/v1/businesses/{businessId}/members`

**Updates:**
- Sync metadata: `lastDownloadedAt`, `hasUnsyncedChanges: false`
- Current business ID: Sets `local_repo:current_business_id` to match downloaded business

---

## LOCAL REPOSITORY STRUCTURE

### Storage Keys (AsyncStorage)

**Primary Repository Keys:**
```typescript
const REPOSITORY_KEYS = {
  BUSINESS_PROFILE: 'local_repo:business_profile',
  REWARDS: 'local_repo:rewards',
  CAMPAIGNS: 'local_repo:campaigns',
  CUSTOMERS: 'local_repo:customers',
  SYNC_METADATA: 'local_repo:sync_metadata',
  LAST_SYNC: 'local_repo:last_sync',
  CURRENT_BUSINESS_ID: 'local_repo:current_business_id',  // Track which business owns primary repo
};
```

**Archived Repository Key Pattern:**
```typescript
archived_repo:{businessId}:business_profile
archived_repo:{businessId}:rewards
archived_repo:{businessId}:campaigns
archived_repo:{businessId}:customers
archived_repo:{businessId}:sync_metadata
```

### Repository Matching Logic

**Primary Repository:**
- Single primary repository at any time
- Identified by `local_repo:current_business_id`
- All operations work on primary repository

**Archived Repositories:**
- One archived repository per businessId
- Keyed by `archived_repo:{businessId}:*`
- Restored to primary when business logs in again
- Preserves data when switching between businesses

### Multi-Account Support

**Scenario 1: User logs into Business A, then Business B**
```
Login Business A:
  - No repository exists
  - Download Business A data → Primary repository
  - Set current_business_id = "businessA"

Login Business B:
  - Repository exists but doesn't match (Business A)
  - Archive Business A repository → archived_repo:businessA:*
  - Clear primary repository
  - No archived repo for Business B
  - Download Business B data → Primary repository
  - Set current_business_id = "businessB"

Login Business A again:
  - Repository exists but doesn't match (Business B)
  - Archive Business B repository → archived_repo:businessB:*
  - Clear primary repository
  - Archived repo for Business A exists
  - Restore Business A repository → Primary repository
  - Set current_business_id = "businessA"
```

---

## COMPLETE LOGIN LOGIC FLOW

### Decision Tree

```
LOGIN
  │
  ├─> [Repository Exists?]
  │   │
  │   ├─> NO
  │   │   │
  │   │   ├─> [Archived Repo Exists for Login BusinessId?]
  │   │   │   │
  │   │   │   ├─> YES
  │   │   │   │   └─> Restore Archived Repo
  │   │   │   │       └─> [Timestamps Check] → Refresh if older → Complete
  │   │   │   │
  │   │   │   └─> NO
  │   │   │       └─> Download All Data from DB → Complete
  │   │   │
  │   └─> YES
  │       │
  │       ├─> [Repository Matches Login BusinessId?]
  │       │   │
  │       │   ├─> YES
  │       │   │   └─> [Check Timestamps]
  │       │   │       │
  │       │   │       ├─> Local is Older
  │       │   │       │   └─> Download All Data from DB → Complete
  │       │   │       │
  │       │   │       └─> Local is Up to Date
  │       │   │           └─> Complete (no refresh needed)
  │       │   │
  │       │   └─> NO (Repository belongs to different business)
  │       │       │
  │       │       ├─> Archive Current Repository
  │       │       │   (Saves to archived_repo:{currentBusinessId}:*)
  │       │       │   (Clears primary repository)
  │       │       │
  │       │       ├─> [Archived Repo Exists for Login BusinessId?]
  │       │       │   │
  │       │       │   ├─> YES
  │       │       │   │   └─> Restore Archived Repo
  │       │       │   │       └─> [Timestamps Check] → Refresh if older → Complete
  │       │       │   │
  │       │       │   └─> NO
  │       │       │       └─> Download All Data from DB → Complete
```

---

## KEY FUNCTIONS & IMPLEMENTATIONS (Updated)

### Repository Management Functions

#### `repositoryMatchesBusiness(businessId: string): Promise<boolean>`
- **Purpose:** Check if primary repository matches login businessId
- **Implementation:** Compares `profile.id === businessId`
- **Used in:** Both first and subsequent login paths

#### `archiveRepository(businessId: string): Promise<void>`
- **Purpose:** Archive primary repository for a business
- **Actions:**
  1. Copies all primary data to `archived_repo:{businessId}:*` keys
  2. Clears primary repository
  3. Removes `current_business_id`
- **Used when:** Repository exists but doesn't match login credentials

#### `archivedRepositoryExists(businessId: string): Promise<boolean>`
- **Purpose:** Check if archived repository exists for businessId
- **Implementation:** Checks `archived_repo:{businessId}:business_profile`
- **Used when:** Checking if we can restore instead of downloading

#### `restoreArchivedRepository(businessId: string): Promise<void>`
- **Purpose:** Restore archived repository to primary
- **Actions:**
  1. Copies all archived data to primary keys
  2. Sets `current_business_id` to businessId
- **Used when:** Archived repository exists for login businessId

#### `getCurrentRepositoryBusinessId(): Promise<string | null>`
- **Purpose:** Get businessId of current primary repository
- **Returns:** `local_repo:current_business_id` value or `null`
- **Used when:** Determining which business owns current repository

---

## TIMESTAMP SYNCHRONIZATION LOGIC

### How It Works

1. **On Login** (After repository is matched/restored/created):
   - Get local repository timestamp: `profile.updatedAt`
   - Get database timestamp: `GET /api/v1/businesses/{id}` → `data.updatedAt`
   - Compare: `new Date(localTimestamp) < new Date(dbTimestamp)`
   - If local is older: Download all data from database

2. **Timestamp Comparison**:
   - **Local Timestamp**: `businessRepository.get().updatedAt`
   - **Database Timestamp**: `GET /api/v1/businesses/{id}` → `data.updatedAt || data.profile.updatedAt`
   - **Comparison**: `isLocalOlderThanDatabase(localTimestamp, dbTimestamp)`

3. **Refresh Trigger**:
   - If `localTimestamp < dbTimestamp` → Download all data
   - If either timestamp is `null` → Download all data (safe default)
   - On comparison error → Download all data (safe default)

### Example Scenarios

**Scenario 1: Repository Matches - Local is Up to Date**
```
Login: businessId = "biz_123"
Repository exists: profile.id = "biz_123" ✅ MATCHES
Local timestamp: 2025-01-05T14:30:00.000Z
Database timestamp: 2025-01-05T12:00:00.000Z
Result: Local is newer → No refresh needed → Complete
```

**Scenario 2: Repository Matches - Local is Older**
```
Login: businessId = "biz_123"
Repository exists: profile.id = "biz_123" ✅ MATCHES
Local timestamp: 2025-01-05T10:00:00.000Z
Database timestamp: 2025-01-05T14:30:00.000Z
Result: Local is older → Refresh from database → Complete
```

**Scenario 3: Repository Doesn't Match - Archive and Restore**
```
Login: businessId = "biz_456"
Repository exists: profile.id = "biz_123" ❌ DOESN'T MATCH
Actions:
  1. Archive current repo → archived_repo:biz_123:*
  2. Clear primary repository
  3. Check archived repo for biz_456 → EXISTS
  4. Restore archived repo → Primary repository
  5. Check timestamps → Refresh if older → Complete
```

**Scenario 4: Repository Doesn't Match - Archive and Download**
```
Login: businessId = "biz_456"
Repository exists: profile.id = "biz_123" ❌ DOESN'T MATCH
Actions:
  1. Archive current repo → archived_repo:biz_123:*
  2. Clear primary repository
  3. Check archived repo for biz_456 → NOT EXISTS
  4. Download all data from database → Primary repository
  5. Complete
```

---

## CONSOLE LOGS (Debugging)

### Repository Matching Scenarios

**Scenario 1: Repository Matches - Up to Date**
```
✅ Subsequent login successful - using local credentials
📊 [LOGIN] Repository exists and matches business biz_123 - checking timestamps
   Local: 2025-01-05T14:30:00.000Z
   Database: 2025-01-05T12:00:00.000Z
✅ [LOGIN] Local repository is up to date - no refresh needed
```

**Scenario 2: Repository Matches - Needs Refresh**
```
✅ Subsequent login successful - using local credentials
📊 [LOGIN] Repository exists and matches business biz_123 - checking timestamps
   Local: 2025-01-05T10:00:00.000Z
   Database: 2025-01-05T14:30:00.000Z
🔄 [LOGIN] Local repository is older than database - refreshing from database
✅ [LOGIN] Local repository refreshed from database
```

**Scenario 3: Repository Doesn't Match - Restore Archived**
```
✅ Subsequent login successful - using local credentials
🔄 [LOGIN] Repository exists but doesn't match business biz_456 - switching repositories
📦 [LOGIN] Archiving current repository for business: biz_123
✅ [ARCHIVE] Repository archived for business: biz_123 and primary repository cleared
✅ [LOGIN] Current repository archived for business: biz_123
📥 [LOGIN] Restoring archived repository for business: biz_456
✅ [RESTORE] Repository restored for business: biz_456
✅ [LOGIN] Restored repository is up to date
```

**Scenario 4: Repository Doesn't Match - Download New**
```
✅ Subsequent login successful - using local credentials
🔄 [LOGIN] Repository exists but doesn't match business biz_456 - switching repositories
📦 [LOGIN] Archiving current repository for business: biz_123
✅ [ARCHIVE] Repository archived for business: biz_123 and primary repository cleared
✅ [LOGIN] Current repository archived for business: biz_123
📥 [LOGIN] No archived repository found - downloading from database for business: biz_456
📥 [REPOSITORY] Starting data download from Redis for business: biz_456
✅ Business profile downloaded
✅ 5 rewards downloaded
✅ 3 campaigns downloaded
✅ 12 customers downloaded
✅ [REPOSITORY] All data downloaded successfully
✅ [LOGIN] Repository created and populated from database
```

**Scenario 5: No Repository - Restore Archived**
```
✅ Subsequent login successful - using local credentials
📥 [LOGIN] No primary repository - restoring archived repository for business: biz_456
✅ [RESTORE] Repository restored for business: biz_456
✅ [LOGIN] Restored repository is up to date
```

**Scenario 6: No Repository - Download Fresh**
```
✅ Subsequent login successful - using local credentials
📥 [LOGIN] No repository found - downloading from database for business: biz_456
📥 [REPOSITORY] Starting data download from Redis for business: biz_456
✅ Business profile downloaded
✅ 5 rewards downloaded
✅ 3 campaigns downloaded
✅ 12 customers downloaded
✅ [REPOSITORY] All data downloaded successfully
✅ [LOGIN] Repository created and populated from database
```

---

## SUMMARY

### Complete Login Flow

**Step 1: Authentication**
- First login: Verify against Redis
- Subsequent login: Verify password via API (using stored businessId)

**Step 2: Repository Management**
1. **Check if repository exists**
   - NO → Check archived repo → Restore OR Download
   - YES → Check if matches login credentials

2. **If repository exists:**
   - **MATCHES**: Check timestamps → Refresh if older → Complete
   - **DOESN'T MATCH**: Archive current → Check archived repo → Restore OR Download → Check timestamps → Complete

**Step 3: Post-Login**
- Load data from local repository to UI
- Start daily sync service
- Show HomeScreen

### Key Points
- **Redis is single source of truth** - All data originates from Redis
- **Offline-first design** - App works without network using local repository
- **Multi-account support** - Archives repositories when switching businesses
- **Repository matching** - Checks if repository belongs to login credentials
- **Timestamp-based sync** - Only refreshes when local is older than database
- **Non-blocking sync** - Login succeeds even if sync fails (retries later)
- **Automatic repository management** - Archives/restores repositories automatically

---

**End of Comprehensive Guide**
