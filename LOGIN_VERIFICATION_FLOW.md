# Login Verification Flow - Testing Guide

## Current Architecture

### Components:
1. **Mobile App** (localhost:8081) - React Native/Expo app running via Metro bundler
2. **Production API Server** (https://api.cannycarrot.com) - Express.js API server with Redis integration
3. **Production Redis Database** - Single source of truth for all business data and authentication

**Note:** Testing against production infrastructure ensures real-world compatibility.

---

## Login Verification Flow

### **FIRST LOGIN** (Credentials not stored locally)

```
┌─────────────────┐
│  Mobile App    │
│ localhost:8081 │
└────────┬───────┘
         │
         │ 1. User enters email/password
         │    LoginPage.tsx → handleLogin()
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()             │
└────────┬────────────────────┘
         │
         │ 2. Check local storage
         │    getStoredAuth() → null (first login)
         │
         ▼
┌─────────────────────────────┐
│  redis.ts                    │
│  redis.get()                  │
└────────┬────────────────────┘
         │
         │ 3. Query Redis via API
         │    GET business:email:{email} → businessId
         │    API: POST https://api.cannycarrot.com/api/v1/redis/get
         │    Body: { args: ["business:email:user@example.com"] }
         │
         ▼
┌─────────────────┐
│  Production     │
│  API Server     │
│ api.cannycarrot │
│     .com        │
└────────┬───────┘
         │
         │ 4. Proxy to Redis
         │    redisClient.get("business:email:user@example.com")
         │
         ▼
┌─────────────────┐
│  Redis DB       │
│  (Cloud/Remote) │
└────────┬───────┘
         │
         │ Returns: businessId (e.g., "biz_123")
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()             │
└────────┬────────────────────┘
         │
         │ 5. Verify business exists
         │    GET business:{businessId}
         │    API: POST /api/v1/redis/get
         │    Body: { args: ["business:biz_123"] }
         │
         ▼
┌─────────────────┐
│  API Server     │
│ localhost:3001 │
└────────┬───────┘
         │
         │ 6. Get business record from Redis
         │    Returns: Business JSON object
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()             │
└────────┬────────────────────┘
         │
         │ 7. Verify password via API
         │    POST https://api.cannycarrot.com/api/v1/auth/business/login
         │    Body: {
         │      email: "user@example.com",
         │      password: "userpassword",
         │      businessId: "biz_123"
         │    }
         │
         ▼
┌─────────────────┐
│  Production     │
│  API Server     │
│ auth.ts route   │
└────────┬───────┘
         │
         │ 8. Get auth data from Redis
         │    GET business:auth:{email}
         │    Returns: { passwordHash, businessId, ... }
         │
         │ 9. Verify password with bcrypt
         │    bcrypt.compare(password, passwordHash)
         │
         │ 10. Verify business exists
         │     GET business:{businessId}
         │
         │ 11. Generate JWT token
         │     jwt.sign({ email, businessId, type: 'business' })
         │
         │ 12. Return response
         │     { success: true, data: { token, businessId, email } }
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()             │
└────────┬────────────────────┘
         │
         │ 13. Store credentials locally
         │     AsyncStorage.setItem('business_auth', {
         │       businessId: "biz_123",
         │       email: "user@example.com",
         │       token: "jwt_token_here",
         │       isAuthenticated: true
         │     })
         │
         │ 14. Verify storage successful
         │     AsyncStorage.getItem('business_auth')
         │
         ▼
┌─────────────────┐
│  Mobile App    │
│  App.tsx        │
└─────────────────┘
         │
         │ 15. Show HomeScreen
         │     isAuthenticatedState = true
```

---

### **SUBSEQUENT LOGIN** (Credentials stored locally)

```
┌─────────────────┐
│  Mobile App    │
│ localhost:8081 │
└────────┬───────┘
         │
         │ 1. User enters email/password
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()             │
└────────┬────────────────────┘
         │
         │ 2. Check local storage
         │    getStoredAuth() → { businessId, email, token, ... }
         │
         │ 3. Email matches stored email?
         │    YES → Subsequent login
         │
         │ 4. Verify password via API (using stored businessId)
         │    POST https://api.cannycarrot.com/api/v1/auth/business/login
         │    Body: {
         │      email: "user@example.com",
         │      password: "userpassword",
         │      businessId: "biz_123"  ← From local storage
         │    }
         │
         ▼
┌─────────────────┐
│  Production     │
│  API Server     │
│ auth.ts route   │
└────────┬───────┘
         │
         │ 5. Verify password (same as first login)
         │    GET business:auth:{email}
         │    bcrypt.compare(password, passwordHash)
         │
         │ 6. Return JWT token
         │
         ▼
┌─────────────────────────────┐
│  authService.ts             │
│  loginBusiness()             │
└────────┬────────────────────┘
         │
         │ 7. Return existing local credentials
         │    (No need to update storage)
         │
         ▼
┌─────────────────┐
│  Mobile App    │
│  App.tsx        │
└─────────────────┘
         │
         │ 8. Show HomeScreen
```

---

## API Endpoints Used

### 1. Redis GET (via API proxy)
```
POST https://api.cannycarrot.com/api/v1/redis/get
Content-Type: application/json

{
  "args": ["business:email:user@example.com"]
}

Response:
{
  "data": "biz_123"  // businessId
}
```

### 2. Business Login
```
POST https://api.cannycarrot.com/api/v1/auth/business/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "userpassword",
  "businessId": "biz_123"  // Optional for subsequent logins
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "businessId": "biz_123",
    "email": "user@example.com"
  }
}
```

---

## Redis Keys Structure

### Authentication Keys:
- `business:email:{email}` → `businessId` (index)
- `business:auth:{email}` → `{ passwordHash, businessId, createdAt }` (auth data)
- `business:{businessId}` → Business record JSON

### Example Redis Data:
```json
// Key: business:email:user@example.com
"biz_123"

// Key: business:auth:user@example.com
{
  "email": "user@example.com",
  "passwordHash": "$2a$10$...",
  "businessId": "biz_123",
  "createdAt": "2025-01-04T12:00:00.000Z"
}

// Key: business:biz_123
{
  "profile": {
    "id": "biz_123",
    "name": "Cafe Maison",
    "email": "user@example.com",
    ...
  },
  ...
}
```

---

## Testing Setup

### Prerequisites:
1. **Production API Server** ✅
   - API server running at `https://api.cannycarrot.com`
   - Check: `GET https://api.cannycarrot.com/health`
   - Should return: `{ redis: "connected" }`
   - **Status:** Production API is accessible and connected to Redis

2. **Production Redis Connected** ✅
   - Production Redis database connected via API server
   - Verified: Production API health check shows Redis connected

3. **Business Account in Production Redis**
   - Business must exist in production Redis with:
     - `business:email:{email}` → `businessId`
     - `business:auth:{email}` → auth data with passwordHash
     - `business:{businessId}` → business record

4. **Mobile App Running**
   ```bash
   cd canny-carrot-business-app
   npm start
   # Metro bundler on http://localhost:8081
   # Uses production API: https://api.cannycarrot.com
   ```

### Test Credentials:
To test login, you need:
1. A business registered in Redis
2. Auth credentials created via `/api/v1/auth/business/register`
3. Email and password to test

### Testing Steps:
1. Open app on localhost:8081
2. Login screen should appear
3. Enter email and password
4. Check Metro console for logs:
   - "First login - verifying against Redis database"
   - "✅ First login successful - credentials stored locally"
5. Logout and login again
6. Check console for:
   - "Subsequent login - using local credentials, verifying password"
   - "✅ Subsequent login successful - using local credentials"

---

## Configuration

### API Base URL:
- **All Platforms**: `https://api.cannycarrot.com` (production API)
- **Configuration**: Set in `app.json` → `extra.apiUrl`
- **Fallback**: Environment variable `API_BASE_URL` (if not in app.json)

### Current Config (app.json):
```json
{
  "extra": {
    "apiUrl": "https://api.cannycarrot.com"
  }
}
```

**Testing against production infrastructure ensures:**
- Real Redis database connectivity
- Production API performance
- Real-world compatibility
- Actual production data access

---

## Error Handling

### Common Errors:

1. **"Invalid email or password"**
   - Business email not found in production Redis: `business:email:{email}`
   - Auth data not found: `business:auth:{email}`
   - Password hash doesn't match

2. **"Business account not found in database"**
   - Business record missing in production Redis: `business:{businessId}`

3. **"Redis API unavailable"**
   - Production API server not accessible at `https://api.cannycarrot.com`
   - Network connectivity issue
   - CORS issue (if testing from web)
   - DNS resolution issue

4. **"Failed to store authentication"**
   - AsyncStorage issue
   - Storage quota exceeded

---

## Debugging

### Enable Console Logs:
The code includes console.log statements:
- `"First login - verifying against Redis database"`
- `"Subsequent login - using local credentials, verifying password"`
- `"✅ First login successful - credentials stored locally"`
- `"✅ Subsequent login successful - using local credentials"`

### Check API Server Logs:
The API server logs all Redis commands:
```
🔵 [API SERVER] Redis command received: get
```

### Check Redis Directly:
```bash
# Using redis-cli or API
GET business:email:user@example.com
GET business:auth:user@example.com
GET business:biz_123
```

---

## Summary

**First Login:**
1. Query Redis for businessId via email index
2. Verify business exists in Redis
3. Verify password via API (bcrypt comparison)
4. Store credentials locally

**Subsequent Login:**
1. Check local storage for credentials
2. Use stored businessId
3. Verify password via API
4. Return local credentials (no storage update)

**All authentication verifies against Redis as the single source of truth.**

