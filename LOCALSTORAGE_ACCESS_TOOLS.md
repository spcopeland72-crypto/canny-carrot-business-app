# LocalStorage Access Tools

## Overview
The business app stores data in browser localStorage using AsyncStorage, which on web maps to the browser's localStorage API. The data is stored in LevelDB format in the browser's user data directory.

## Storage Location
**Windows Edge:**
```
%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb\
```

**Storage Keys:**
- `local_repo:rewards` - All rewards
- `local_repo:campaigns` - All campaigns  
- `local_repo:business_profile` - Business profile
- `local_repo:customers` - Customers
- `local_repo:sync_metadata` - Sync metadata
- `local_repo:last_sync` - Last sync timestamp
- `local_repo:current_business_id` - Current business ID

## Tools

### 1. Export LocalStorage to JSON
**File:** `export-localstorage-to-json.js`

**Usage:**
```bash
node export-localstorage-to-json.js
```

**What it does:**
- Reads LevelDB files from Edge's localStorage directory
- Exports all `local_repo:*` keys to readable JSON files
- Creates individual files for each key in `./localstorage-exports/`
- Creates a combined export in `all-localstorage-data.json`

**Requirements:**
- Edge browser should be closed (database locked while Edge is running)
- Requires `level` npm package: `npm install level`

**Output:**
- `local_repo_rewards.json`
- `local_repo_campaigns.json`
- `local_repo_business_profile.json`
- `local_repo_customers.json`
- `all-localstorage-data.json` (combined)

### 2. Parse LevelDB Binary Files
**File:** `parse-leveldb-binary.js`

**Usage:**
```bash
node parse-leveldb-binary.js
```

**What it does:**
- Reads LevelDB `.ldb` files directly as binary
- Searches for `local_repo:rewards` and `local_repo:campaigns` keys
- Attempts to extract and parse JSON data
- Can work while Edge is running (reads files, but LevelDB format is complex)

**Limitations:**
- LevelDB binary format is complex, may not parse correctly
- Best used when Edge is closed and proper LevelDB reading is available

### 3. Browser Console Script
**File:** `tools/extract-localstorage-direct.js`

**Usage:**
1. Open business.cannycarrot.com in browser
2. Open browser console (F12)
3. Copy and paste the script from the file
4. Execute - it will download a JSON file with all localStorage data

**What it does:**
- Reads localStorage directly via browser JavaScript
- Extracts all repository keys
- Creates downloadable JSON file
- Works while browser is running

## Recommended Approach

**For debugging:**
1. Run `export-localstorage-to-json.js` with Edge closed
2. This creates readable JSON files you can inspect
3. Keep these exports in `localstorage-exports/` for reference

**For quick checks:**
- Use browser console script (`tools/extract-localstorage-direct.js`)
- Works immediately without closing browser

## Notes

- LevelDB files are locked while Edge is running
- To read LevelDB properly, Edge must be closed OR use browser console script
- Repository uses AsyncStorage which maps to localStorage on web
- Data structure matches the TypeScript types in `src/types/index.ts`





