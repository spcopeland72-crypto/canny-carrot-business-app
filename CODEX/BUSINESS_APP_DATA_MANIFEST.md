# Business App — Full Data Manifest by Page

Definitive list of every field, data item, and asset that comprises the business user's identity and working data. Use for tracking, in-app state, and sync to/from Redis.

---

## 0. Auth & session (not a page; underpins all)

| Item | Source / store | Redis / API |
|------|----------------|-------------|
| businessId | auth storage (AsyncStorage) | Used in all API calls and repo scope |
| email | auth storage | business auth |
| token | auth storage | Auth header |
| isAuthenticated | auth storage | — |

---

## 1. Login

| Item | Type | Notes |
|------|------|--------|
| email | input | Login credential |
| password | input | Not stored |
| invitationToken | input (optional) | For invite flow |

---

## 2. Home

| Item | Source | Sync / Redis |
|------|--------|--------------|
| businessName | businessRepository.get() → profile.name | business.profile.name |
| businessLogo | businessRepository.get() → profile.logoIcon or profile.logo | business.profile.logoIcon / logo |
| rewards (list) | rewardsRepository.getActive() or props | business rewards (reward:*), business:{id}:rewards set |
| campaigns (list) | campaignsRepository.getAll() or props | business campaigns (campaign:*), business:{id}:campaigns set |
| recentNotifications (messages) | MessageStoreContext (conversations slice 0..10) | API GET /businesses/:id/notifications; read state in Redis/inbox |
| selectedNotification | local state | — |
| deleteConfirmId | local state | — |
| rewardCards (derived) | rewards + campaigns → buildRewardCard | From rewards/campaigns |
| chatMessages (mock) | hardcoded list | Not synced (UI placeholder) |
| analyticsBoxes (mock) | hardcoded | Not synced |

---

## 3. Business Profile (page title: Business Profile)

| Field / asset | Stored in | Redis / API |
|---------------|-----------|-------------|
| name | businessRepository | business.profile.name |
| email | businessRepository | business.profile.email |
| phone | businessRepository | business.profile.phone |
| addressLine1 | businessRepository | business.profile.addressLine1 |
| addressLine2 | businessRepository | business.profile.addressLine2 |
| city | businessRepository | business.profile.city |
| postcode | businessRepository | business.profile.postcode |
| region | businessRepository | business.profile.region |
| country | businessRepository | business.profile.country |
| logo | businessRepository | business.profile.logo (full logo image, base64) |
| logoIcon | businessRepository | business.profile.logoIcon (circular avatar 128px) |
| banner | businessRepository | business.profile.banner |
| website | businessRepository | business.profile.website |
| socialMedia | businessRepository | business.profile.socialMedia |
| category | businessRepository | business.profile.category |
| description | businessRepository | business.profile.description |
| products | businessRepository | business.profile.products (array of product names) |
| actions | businessRepository | business.profile.actions (array of action names) |
| companyQRCode | businessRepository | business.profile.companyQRCode |
| companyNumber | businessRepository | business.profile.companyNumber |
| createdAt | businessRepository | business.profile.createdAt |
| updatedAt | businessRepository | business.profile.updatedAt |

---

## 4. More

| Item | Notes |
|------|------|
| Menu items | Nav only; no identity data stored here. Links: Business, Settings, Analytics, Products, Reports, About, Event Log, Messages. |
| Messaging dashboard URL | EXPO_PUBLIC_DITTOFEED_DASHBOARD_URL (external link) |

---

## 5. Event Log (page title: Event Log)

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| transactionLog (entries) | eventLogService (local_repo:event_log) | business.transactionLog (merge on sync) |
| Sync manifest | eventLogService (local_repo:sync_manifest) | Used for dump validation only (not stored in Redis as separate key) |

**TransactionLogEntry shape:** timestamp, action, data.  
Actions: EVENT:LOGIN, EVENT:LOGOUT, CREATE, EDIT, DELETE, SYNC_ERROR, etc.

---

## 6. Messages (page title: Messages — inbox)

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| conversations | MessageStoreContext (from API + local merge) | GET /businesses/:id/notifications |
| inbox event log (deletes) | AsyncStorage: canny_carrot:message_inbox_events_business_{businessId} | — (local only; drives which convos to hide) |
| read IDs | AsyncStorage: canny_carrot:message_inbox_read_business_{businessId} | POST mark-read; can persist read state |
| deleteConfirmId | local state | — |

**Conversation (per item):** id, name, lastMessage, lastTimestamp, unreadCount, read, avatarEmoji, identityId, messages, createdAt, priority.

---

## 7. Message Chat (page title: per conversation)

| Item | Source | Redis / API |
|------|--------|-------------|
| conversationId | navigation param (ref) | — |
| conversation (messages, name, etc.) | MessageStoreContext.getConversation(id) | Same as inbox source |
| input (draft) | local state | — |
| addMessage (optimistic) | MessageStoreContext | Optional: could sync sent messages to API later |

---

## 8. Customers (page title: Manage Customers — list)

| Item | Source | Redis / API |
|------|--------|-------------|
| tokens (rewards + campaigns with customers) | fetchManageCustomersData(businessId) — API | GET /businesses/:id/tokens/with-customers (token-link index + analytics) |
| TokenWithCustomers per row | API response | tokenId, type, name, customers[] (customerId, customerName, pointsEarned, pointsRequired, lastScanAt, scansLast30/90, etc.) |

No local repository for this page; read-only from API.

---

## 9. Add Customer / Edit Customer (page title: Add Customer or Edit Customer)

| Field | Stored in | Redis / API |
|-------|-----------|-------------|
| id | customersRepository | customer:id (POST to businesses/:id/customers) |
| name | customersRepository | customer record |
| email | customersRepository | customer record |
| phone | customersRepository | customer record |
| stamps | customersRepository | customer record |
| lastVisit | customersRepository | customer record |

**Local:** customersRepository (local_repo:customers). **Sync:** uploaded as part of business dump (customers array).

---

## 10. All Rewards (page title: Rewards Management)

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| rewards (list) | rewardsRepository.getAll() | reward:* keys; business:{id}:rewards set |
| Reward fields (per item) | See Reward type below | reward:{id} |

**Reward (full shape):** id, businessId, name, description, stampsRequired, costStamps, type, value, discountPercent, isActive, validFrom, validTo, maxRedemptions, currentRedemptions, createdAt, updatedAt, customerProgress, qrCode, pinCode, selectedProducts, selectedActions, pointsPerPurchase.

---

## 11. Create Reward / Edit Reward (page title: Create Reward or Edit Reward)

| Field / asset | Stored in | Redis / API |
|---------------|-----------|-------------|
| name | rewardsRepository (reward object) | reward.name |
| description | rewardsRepository | reward.description |
| type | rewardsRepository | reward.type (product | discount | freebie | etc.) |
| stampsRequired | rewardsRepository | reward.stampsRequired |
| pointsPerPurchase | rewardsRepository | reward.pointsPerPurchase |
| selectedProducts | rewardsRepository | reward.selectedProducts |
| selectedActions | rewardsRepository | reward.selectedActions |
| pinCode | rewardsRepository | reward.pinCode |
| qrCode | rewardsRepository | reward.qrCode |
| validFrom / validTo | rewardsRepository | reward.validFrom, validTo |
| isActive | rewardsRepository | reward.isActive |
| value, discountPercent | rewardsRepository | reward.value, discountPercent |
| businessId | from auth | reward.businessId |
| id, createdAt, updatedAt | rewardsRepository | reward.id, createdAt, updatedAt |
| Products/actions options | businessRepository.profile.products, profile.actions | From business profile |

Rewards trash: local_repo:rewards_trash (deleted reward IDs; not re-downloaded).

---

## 12. All Campaigns (page title: Campaigns)

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| campaigns (list) | campaignsRepository.getAll() | campaign:* keys; business:{id}:campaigns set |
| Campaign fields (per item) | See Campaign type below | campaign:{id} |

**Campaign (full shape):** id, businessId, name, description, type, objective, startDate, endDate, status, targetAudience, conditions (rewardData: selectedProducts, selectedActions, stampsRequired, etc.), stats, qrCode, pinCode, selectedProducts, selectedActions, pointsPerPurchase, createdAt, updatedAt.

---

## 13. Create Campaign / Edit Campaign (page title: Create Campaign or Edit Campaign)

Same form as Create/Edit Reward; campaign-specific:

| Field / asset | Stored in | Redis / API |
|---------------|-----------|-------------|
| name | campaignsRepository (campaign object) | campaign.name |
| type (campaign type) | campaignsRepository | campaign.type (double_stamps, bonus_reward, etc.) |
| startDate, endDate | campaignsRepository | campaign.startDate, endDate |
| status | campaignsRepository | campaign.status |
| conditions.rewardData | campaignsRepository | campaign.conditions.rewardData (selectedProducts, selectedActions, stampsRequired, pinCode, qrCode) |
| selectedProducts, selectedActions | campaignsRepository | campaign.selectedProducts, selectedActions |
| Campaign item QR codes | local state (campaignItemQRCodes Map) | Not persisted to Redis (generated per session) |

---

## 14. Products (page title: Products)

| Item | Stored in | Redis / API |
|------|-----------|-------------|
| products (list of names) | businessRepository.get() → profile.products | business.profile.products |

All product CRUD is via BusinessProfile.products array (add/rename/delete in ManageProductsPage).

---

## 15. Settings / Analytics / Reports / About

Rendered by MorePage with currentScreen; no separate identity data. Title reflects screen (Settings, Analytics, Reports, About). No repository fields specific to these screens.

---

## 16. Help (and Help sub-screens)

Static content / navigation. No business identity or working data.

---

## 17. Search

Search UI; may use business-scoped data from API. No dedicated repository entity; results from API.

---

## 18. Scan

Scan modal (barcode). No persistent identity data; scan result passed back to caller.

---

## 19. Online Admin (page title: Online Admin)

Online store admin; may use businessId for API. No separate manifest entity list in this audit.

---

## 20. Chat (page title: Chat)

Mock chat list (hardcoded). Not synced to Redis.

---

## Local storage keys (AsyncStorage)

| Key | Purpose |
|-----|---------|
| local_repo:business_profile | BusinessProfile |
| local_repo:rewards | Reward[] |
| local_repo:campaigns | Campaign[] |
| local_repo:customers | Customer[] |
| local_repo:sync_metadata | SyncMetadata (lastSyncedAt, lastModified, hasUnsyncedChanges, version) |
| local_repo:last_sync | — |
| local_repo:current_business_id | businessId for repo scope |
| local_repo:rewards_trash | Trashed reward IDs (deleted, not re-downloaded) |
| local_repo:event_log | TransactionLogEntry[] |
| local_repo:sync_manifest | SyncManifest (rewardsAtLogin, campaignsAtLogin, create/delete counts) |
| canny_carrot:message_inbox_events_business_{businessId} | InboxEvent[] (deletes) |
| canny_carrot:message_inbox_read_business_{businessId} | string[] (read notification IDs) |
| auth_* | Auth state (businessId, email, token, etc.) |

---

## Redis / API entities (business app → Redis)

| Entity | Redis key / API | Notes |
|--------|-----------------|--------|
| Business | business:{businessId} | Profile + transactionLog in body; rewards/campaigns in separate keys |
| Business profile | In business:{id} | name, email, phone, address*, logo, logoIcon, banner, products, actions, etc. |
| transactionLog | In business:{id} | Merged on PUT/sync; cap 300 |
| Rewards | reward:{id}, business:{id}:rewards (set) | Per reward document |
| Campaigns | campaign:{id}, business:{id}:campaigns (set) | Per campaign document |
| Customers | POST businesses/:id/customers | Customer records for this business |
| Notifications (inbox) | GET/POST businesses/:id/notifications, mark-read | Messages to business; read state |
| Token-link index | business:{id}:customers, token:{id}:customers, customer:{id}:businesses, customer:{id}:tokens | Updated by API on customer sync |

---

## Sync flow summary

- **Download (login):** GET business, rewards, campaigns, customers; event log from business.transactionLog. Populate local repository + event log.
- **Upload (sync/logout):** PUT business (profile + transactionLog), PUT rewards, PUT campaigns, POST customers. lastModified from sync metadata.
- **Messages:** Load from API (GET notifications); read/delete state local + mark-read API; inbox event log local only for delete visibility.

---

*Document generated from audit of canny-carrot-business-app. Use as single source of truth for what to track and sync.*
