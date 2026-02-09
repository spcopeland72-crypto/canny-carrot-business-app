# Business User Data Manifest

Definitive list of all data that constitutes the **business user's** identity and working data. Use for privacy, sync, and API/Redis mapping. For a page-by-page breakdown, see [BUSINESS_APP_DATA_MANIFEST.md](./BUSINESS_APP_DATA_MANIFEST.md).

---

## 1. User identity & auth (business user)

| Field | Stored in | Redis / API |
|-------|-----------|-------------|
| businessId | AsyncStorage: `business_auth` | Used in all API calls; repo scope |
| email | AsyncStorage: `business_auth` | Business auth / identity |
| token | AsyncStorage: `business_auth` | Auth header |
| isAuthenticated | Derived from auth | — |
| invitationToken / invitation state | AsyncStorage: `business_invitation` | Invite flow only |

---

## 2. Business profile (identity & public info)

| Field | Stored in | Redis / API |
|-------|-----------|-------------|
| name | local_repo:business_profile | business.profile.name |
| email | local_repo:business_profile | business.profile.email |
| phone | local_repo:business_profile | business.profile.phone |
| addressLine1, addressLine2 | local_repo:business_profile | business.profile.addressLine1, addressLine2 |
| city, postcode, region, country | local_repo:business_profile | business.profile.* |
| logo | local_repo:business_profile | business.profile.logo |
| logoIcon | local_repo:business_profile | business.profile.logoIcon |
| banner | local_repo:business_profile | business.profile.banner |
| website | local_repo:business_profile | business.profile.website |
| socialMedia | local_repo:business_profile | business.profile.socialMedia |
| category | local_repo:business_profile | business.profile.category |
| description | local_repo:business_profile | business.profile.description |
| products | local_repo:business_profile | business.profile.products |
| actions | local_repo:business_profile | business.profile.actions |
| companyQRCode | local_repo:business_profile | business.profile.companyQRCode |
| companyNumber | local_repo:business_profile | business.profile.companyNumber |
| createdAt, updatedAt | local_repo:business_profile | business.profile.createdAt, updatedAt |

---

## 3. Working data — rewards

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| rewards (list) | local_repo:rewards | reward:{id}, business:{id}:rewards |
| Per reward: id, businessId, name, description, stampsRequired, costStamps, type, value, discountPercent, isActive, validFrom, validTo, maxRedemptions, currentRedemptions, createdAt, updatedAt, qrCode, pinCode, selectedProducts, selectedActions, pointsPerPurchase | local_repo:rewards | reward:{id} |
| rewards_trash (deleted IDs) | local_repo:rewards_trash | Not re-downloaded; local only |

---

## 4. Working data — campaigns

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| campaigns (list) | local_repo:campaigns | campaign:{id}, business:{id}:campaigns |
| Per campaign: id, businessId, name, description, type, objective, startDate, endDate, status, targetAudience, conditions (rewardData, selectedProducts, selectedActions, stampsRequired, etc.), stats, qrCode, pinCode, createdAt, updatedAt | local_repo:campaigns | campaign:{id} |

---

## 5. Working data — customers (business’s customer list)

| Field | Stored in | Redis / API |
|-------|-----------|-------------|
| id, name, email, phone, stamps, lastVisit (per customer) | local_repo:customers | POST businesses/:id/customers; customer records |

---

## 6. Working data — event log

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| transactionLog (entries) | local_repo:event_log | business.transactionLog (merge on sync; cap 300) |
| sync_manifest | local_repo:sync_manifest | Validation only (not a Redis key) |

---

## 7. Working data — messages (inbox)

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| conversations (list) | MessageStoreContext + API | GET /businesses/:id/notifications |
| inbox event log (deletes) | canny_carrot:message_inbox_events_business_{businessId} | Local only (hide deleted) |
| read IDs | canny_carrot:message_inbox_read_business_{businessId} | POST mark-read |

---

## 8. Sync metadata (not user content)

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| lastSyncedAt, lastModified, hasUnsyncedChanges, version | local_repo:sync_metadata | Used for sync flow |
| current_business_id | local_repo:current_business_id | Repo scope |
| last_sync | local_repo:last_sync | — |

---

## Local storage keys (AsyncStorage) — summary

| Key | Purpose |
|-----|---------|
| business_auth | Auth (businessId, email, token) |
| business_invitation | Invitation state |
| local_repo:business_profile | Business profile |
| local_repo:rewards | Rewards list |
| local_repo:campaigns | Campaigns list |
| local_repo:customers | Customers list |
| local_repo:sync_metadata | Sync metadata |
| local_repo:current_business_id | Current business id |
| local_repo:rewards_trash | Trashed reward IDs |
| local_repo:event_log | Transaction log |
| local_repo:sync_manifest | Sync manifest |
| local_repo:last_sync | Last sync |
| canny_carrot:message_inbox_events_business_{businessId} | Inbox delete events |
| canny_carrot:message_inbox_read_business_{businessId} | Read notification IDs |

---

## Redis / API entities (business user data)

| Entity | Redis / API | Notes |
|--------|-------------|--------|
| Business | business:{businessId} | Profile + transactionLog |
| Rewards | reward:{id}, business:{id}:rewards | Per reward |
| Campaigns | campaign:{id}, business:{id}:campaigns | Per campaign |
| Customers | POST businesses/:id/customers | Business’s customer list |
| Notifications | GET/POST businesses/:id/notifications, mark-read | Inbox & read state |
| Token-link index | business:{id}:customers, token:{id}:customers, etc. | API-maintained |

---

## Sync flow (business user)

- **Download (login):** GET business, rewards, campaigns, customers; populate local repo + event log from business.transactionLog.
- **Upload (sync/logout):** PUT business (profile + transactionLog), PUT rewards, PUT campaigns, POST customers.
- **Messages:** Load from API; read/delete state local + mark-read API.

---

## Tools that can access this data (Redis/API and debug)

The following **API routes**, **Redis proxy**, **debug endpoints**, and **scripts/tools** can read or write business user data in Redis/API. Use for debugging and operations; restrict in production.

### API routes (canny-carrot-api)

| Route | Method | Data accessed | Purpose |
|-------|--------|---------------|---------|
| /api/v1/businesses/:id | GET | business:{id} (profile, transactionLog) | Download business record |
| /api/v1/businesses/:id | PUT | business:{id} | Upload business (sync) |
| /api/v1/businesses/:id/timestamp | GET | business updatedAt | Timestamp check |
| /api/v1/businesses/:id/tokens, /tokens/with-customers | GET | business:{id}:customers, token:*:customers | Manage customers / token-link index |
| /api/v1/businesses/:id/notifications, mark-read | GET, POST | Business inbox | Messages |
| /api/v1/rewards?businessId=, POST, PUT, etc. | GET, POST, PUT | reward:*, business:{id}:rewards | Rewards CRUD / sync |
| /api/v1/campaigns?businessId=, POST, PUT, etc. | GET, POST, PUT | campaign:*, business:{id}:campaigns | Campaigns CRUD / sync |
| /api/v1/auth/business/login | POST | Auth / business lookup | Login |

### Redis proxy (HTTP → Redis)

| Route | Method | Data accessed | Purpose |
|-------|--------|---------------|---------|
| /api/v1/redis/health | GET | — | Redis connectivity |
| /api/v1/redis/index | GET | business:*:customers, token:*:customers, customer:*:businesses, customer:*:tokens | Token-link index read |
| /api/v1/redis/:command | POST | Any key (get, set, sadd, smembers, etc.) | Business app sync; admin app; scripts |

The business app uses the Redis proxy to GET/SET `business:*`, `reward:*`, `campaign:*`, and related sets. Logging on SET for `business:*` and `customer:*` can expose PII in server logs.

### Debug routes (development only; remove or guard in production)

| Route | Method | Data accessed | Purpose |
|-------|--------|---------------|---------|
| /api/v1/debug/local-storage | POST | In-memory + file | Receive app dump (businessId, campaigns, rewards, businessProfile, customers, eventLog) |
| /api/v1/debug/local-storage | GET | Last received dump | Inspect last dump |
| /api/v1/debug/last-event-log-upload | GET | /tmp file | Last event log uploaded (businessId, eventLog) |
| /api/v1/debug/commit | POST | Redis (business, rewards, campaigns) | Commit in-memory dump to Redis |
| /api/v1/debug/api-logs | GET | /tmp apiLogger files | Recent API logs by businessId or all |
| /api/v1/debug/sync-inbox-logs | GET | /tmp + in-memory | [SYNC_INBOX] flow entries (customer sync → business inbox) |

### Scripts (canny-carrot-api)

Run from `canny-carrot-api` unless noted. Many use `API_URL` (default `https://api.cannycarrot.com`) and call the API; some need `REDIS_URL` and `npm run build`.

| Script | Location | Data accessed | Purpose |
|--------|----------|---------------|---------|
| read-business-record-api.js | scripts/redis/ | business:{id}, rewards, campaigns via API | Formatted business profile + rewards + campaigns |
| read-business-event-log.js | scripts/redis/ | business:{id}.transactionLog | Formatted event log (timestamp, action, data) |
| read-business-redis-data.js | scripts/redis/ or tools/ | business:*, reward:*, campaign:* (direct Redis) | Business data by name; needs REDIS_URL |
| dump-redis-record.js | scripts/redis/ | business:* or customer:* | Full dump to console/file; --type business --email or --id |
| show-index.js | scripts/redis/ | GET /api/v1/redis/index | Token-link index (Key \| Members) |
| check-manage-customers-api.js | scripts/redis/ | GET businesses/:id/tokens/with-customers | Reward/campaign token counts, customer counts |
| inspect-business-clare-langle-redis.js | scripts/redis/ | Redis by business name "Clare's Cakes" | Inspect one business |
| get-business-inbox.js | scripts/redis/ | Business notifications/inbox | Business inbox contents |
| read-last-event-log-upload.js | scripts/redis/ | Last event log file | Last event log upload from app |
| clare-inbox-boundary.js | scripts/redis/ | Inbox boundary (Clare) | Inbox boundary check |
| read-business-api-data.js | tools/ | GET /businesses/:id + rewards + campaigns | Business data via API (no Redis locally) |

### Admin app (canny-carrot-admin-mobile-app)

- Uses **Redis proxy** (`/api/v1/redis/:command`) to read/write Redis. Can access any key allowed by the proxy (get, set, sadd, smembers, etc.), including `business:*`, `reward:*`, `campaign:*`, `customer:*`, and index sets. Effectively has full read/write to business (and customer) data in Redis when API is used.

---

*User data manifest for business users. Single source of truth for what constitutes business user identity and working data.*
