# Redis Transactions and Timestamp Behavior Table

## Business App Events

| Event | Direction | Redis Operation | Endpoint/Method | Timestamp Behavior | Notes |
|-------|-----------|----------------|-----------------|-------------------|-------|
| **Login - First Login** | Redis → App | GET | `/api/v1/auth/business/login` | **READ ONLY** - No timestamp change | Verifies credentials, returns business data |
| **Login - Subsequent (Repository Matches)** | Redis → App | GET | `/api/v1/businesses/{id}` | **READ ONLY** - Compares timestamps, no modification | Compares local vs Redis timestamp, downloads if Redis newer |
| **Login - Subsequent (No Repository)** | Redis → App | GET | `/api/v1/businesses/{id}`, `/api/v1/rewards`, `/api/v1/campaigns`, `/api/v1/businesses/{id}/customers` | **READ ONLY** - Downloads all data, sets local timestamp to Redis timestamp | Downloads complete repository |
| **Login - Repository Restored** | Redis → App | GET | `/api/v1/businesses/{id}` | **READ ONLY** - Compares timestamps, downloads if Redis newer | Same as "Repository Matches" |
| **Logout** | App → Redis | DELETE + POST/PUT | `/api/v1/redis/smembers`, `/api/v1/redis/del`, `/api/v1/businesses/{id}`, `/api/v1/rewards`, etc. | **WRITE** - Redis `business.updatedAt` = Device's local timestamp | Full replacement sync, deletes all Redis data, writes local data, updates `business.updatedAt` to match device timestamp |
| **Manual Sync (Account Modal)** | App → Redis | DELETE + POST/PUT | Same as Logout | **WRITE** - Redis `business.updatedAt` = Device's local timestamp | Same as Logout - full replacement sync |
| **Create/Edit Reward** | App → Redis | POST | `/api/v1/rewards` | **WRITE** - Redis `business.updatedAt` = Device's local timestamp | Individual reward write, then updates `business.updatedAt` to match device timestamp |
| **Create/Edit Business Profile** | App → Redis | PUT | `/api/v1/businesses/{id}` | **WRITE** - Redis `business.updatedAt` = Device's local timestamp | Profile write, then updates `business.updatedAt` to match device timestamp |
| **Delete Reward** | App → Local Only | N/A | N/A | **NO REDIS** - Only marks inactive in local repo | Deleted rewards only sync on logout/manual sync |
| **Device Tracking on Login** | App → Redis | SET | `/api/v1/auth/business/login` (deviceId in body) | **WRITE** - No timestamp change on business record | Stores device login info, 30-day expiry |

## Customer App Events

| Event | Direction | Redis Operation | Endpoint/Method | Timestamp Behavior | Notes |
|-------|-----------|----------------|-----------------|-------------------|-------|
| **Login** | Redis → App | GET | `/api/v1/auth/customer/login` (assumed) | **READ ONLY** - Downloads customer data | Downloads customer profile and rewards |
| **Logout** | App → Redis | POST/PUT | Customer sync endpoints | **WRITE** - Customer timestamp updated | Syncs customer progress to Redis |
| **Scan QR Code (Reward)** | App → Local Only | N/A | N/A | **NO REDIS** - Only updates local customer progress | Customer progress syncs on logout |
| **Redeem Reward** | App → Local Only | N/A | N/A | **NO REDIS** - Only updates local customer data | Redemption syncs on logout |
| **Manual Sync (if exists)** | App → Redis | POST/PUT | Customer sync endpoints | **WRITE** - Customer timestamp updated | Syncs customer progress to Redis |

## Timestamp Rules

### Device Timestamps (Local Repository)
- **Updated on:** Create, Edit, Delete actions only
- **Never updated on:** Sync operations, login operations, read operations
- **Location:** Local repository sync metadata (`lastModified`)

### Redis Timestamps (Database)
- **`business.updatedAt`** - Top-level repository timestamp
- **Updated to match device timestamp** when:
  - Full replacement sync (logout/manual sync)
  - Individual reward save
  - Individual business profile save
- **Never generates new timestamp** - always copies device's local timestamp
- **Updated by admin** - When admin makes changes via admin app (separate mechanism)

### Timestamp Comparison Logic
1. **On Login:**
   - Get local timestamp from device repository
   - Get Redis timestamp from `business.updatedAt`
   - Compare timestamps
   - If local >= Redis: Load from local storage
   - If Redis > local: Download from Redis

2. **On Sync (Logout/Manual):**
   - Get device's local timestamp
   - Write all data to Redis
   - Set Redis `business.updatedAt` = Device's local timestamp (copy, not new)

## Key Principles

1. **Device owns its timestamp** - Created on create/edit/delete actions
2. **Redis reflects device timestamp** - When device syncs, Redis timestamp matches device timestamp
3. **No timestamp generation on sync** - Sync operations copy timestamps, never generate new ones
4. **Timestamp comparison determines sync direction** - Newer timestamp wins
5. **Admin changes have separate timestamp mechanism** - Admin app updates Redis timestamp directly



