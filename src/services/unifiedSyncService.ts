/**
 * Unified Sync Service
 *
 * 1 RULE, 3 USE CASES.
 * 1 rule: Newest overwrites oldest. Always. Timestamp decides.
 * 3 use cases: Sync occurs ONLY on (1) click Sync, (2) login, (3) logout. No other time.
 *
 * Used for: click Sync + Logout. (Login uses timestamp compare + downloadAllData; same rule.)
 * Local newer → upload. Remote newer → download. Equal + unsynced → upload. Else none.
 * Never overwrite Redis with older data. Timestamp changes only on create/edit.
 */

import { businessRepository, rewardsRepository, campaignsRepository, customersRepository, getSyncStatus, getLocalRepositoryTimestamp, updateSyncMetadata as updateLocalSyncMetadata } from './localRepository';
import type { BusinessProfile, Reward, Campaign, Customer } from '../types';

const API_BASE_URL = 'https://api.cannycarrot.com';

const SYNC_HEADERS = {
  'Content-Type': 'application/json',
  'X-Sync-Context': 'manual-sync' as const,
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

/**
 * Fetch with retries. Returns response or null if all retries failed.
 */
const fetchWithRetry = async (url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response | null> => {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      lastResponse = res;
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 408) {
        // Don't retry client errors (except Request Timeout)
        return res;
      }
      if (attempt < retries) {
        console.warn(`  ⚠️ [UNIFIED SYNC] Retry ${attempt + 1}/${retries} after ${res.status}...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    } catch (err: any) {
      if (attempt < retries) {
        console.warn(`  ⚠️ [UNIFIED SYNC] Retry ${attempt + 1}/${retries} after error: ${err?.message || err}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  return lastResponse;
};

/**
 * Request only the remote timestamp for sync decision. No full business fetch.
 */
const getRemoteRepositoryTimestamp = async (businessId: string): Promise<string | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/timestamp`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.updatedAt === 'string' ? json.updatedAt : null;
  } catch (_) {
    return null;
  }
};

/**
 * Download all data from Redis (account, rewards, products, campaigns)
 */
const downloadAllData = async (businessId: string): Promise<{
  success: boolean;
  profile: BusinessProfile | null;
  rewards: Reward[];
  campaigns: Campaign[];
  customers: Customer[];
  timestamp: string | null;
}> => {
  console.log('📥 [UNIFIED SYNC] Downloading all data from Redis...');
  
  const result = {
    success: false,
    profile: null as BusinessProfile | null,
    rewards: [] as Reward[],
    campaigns: [] as Campaign[],
    customers: [] as Customer[],
    timestamp: null as string | null,
  };

  try {
    // Download business profile (includes products)
    const profileResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      if (profileResult.success && profileResult.data) {
        const data = profileResult.data;
        result.timestamp = data.updatedAt || null;
        // Save only profile fields to business repo; rewards/campaigns come from separate GET and are saved to their repos
        const { rewards: _r, campaigns: _c, ...profileOnly } = data;
        result.profile = data.profile || profileOnly;
        console.log('  ✅ Downloaded business profile');
      }
    }

    // Download all rewards
    const rewardsResponse = await fetch(`${API_BASE_URL}/api/v1/rewards?businessId=${businessId}`);
    console.log('[SYNC] Command GET rewards?businessId=%s → status=%s', businessId, rewardsResponse.status);
    if (rewardsResponse.ok) {
      const rewardsResult = await rewardsResponse.json();
      if (rewardsResult.success && Array.isArray(rewardsResult.data)) {
        result.rewards = rewardsResult.data;
        console.log(`  ✅ Downloaded ${result.rewards.length} rewards`);
      }
    }

    // Download all campaigns (same pattern as rewards - use data as-is, no normalization)
    const campaignsResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns?businessId=${businessId}`);
    if (campaignsResponse.ok) {
      const campaignsResult = await campaignsResponse.json();
      if (campaignsResult.success && Array.isArray(campaignsResult.data)) {
        result.campaigns = campaignsResult.data.map((campaign: any) => ({
          ...campaign,
          businessId: campaign.businessId || businessId,
        }));
        console.log(`  ✅ Downloaded ${result.campaigns.length} campaigns`);
      }
    }

    // Download all customers
    const customersResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/customers`);
    console.log('[SYNC] Command GET customers businessId=%s → status=%s', businessId, customersResponse.status);
    if (customersResponse.ok) {
      const customersResult = await customersResponse.json();
      if (customersResult.success && Array.isArray(customersResult.data)) {
        result.customers = customersResult.data;
        console.log(`  ✅ Downloaded ${result.customers.length} customers`);
      }
    }

    result.success = true;
    console.log('✅ [UNIFIED SYNC] All data downloaded successfully');
  } catch (error: any) {
    console.error('❌ [UNIFIED SYNC] Error downloading data:', error.message || error);
  }

  return result;
};

/**
 * Upload all data to Redis (account, rewards, products, campaigns).
 * Last-known-good: we only update timestamp and delete obsolete items after all reward/campaign uploads succeed.
 * On any upload failure we abort, do not PUT business, and return errors so the user gets a clear failure and state stays consistent.
 */
const uploadAllData = async (businessId: string): Promise<{
  success: boolean;
  profile: boolean;
  rewards: number;
  campaigns: number;
  customers: number;
  errors: string[];
}> => {
  console.log('[SYNC WRITE] uploadAllData entered businessId=%s', businessId);
  const uploadErrors: string[] = [];
  const result = {
    success: false,
    profile: false,
    rewards: 0,
    campaigns: 0,
    customers: 0,
    errors: [] as string[],
  };

  try {
    const localTs = await getLocalRepositoryTimestamp();
    if (!localTs) {
      console.log('[SYNC WRITE] upload aborted: no local timestamp');
      result.errors.push('No local timestamp (save your changes first).');
      return result;
    }

    // 1. Get existing state from API (do not delete or update timestamp yet — last-known-good)
    const existingRewardsResponse = await fetch(`${API_BASE_URL}/api/v1/rewards?businessId=${businessId}`, { headers: SYNC_HEADERS });
    console.log('[SYNC] Command GET rewards?businessId=%s → status=%s', businessId, existingRewardsResponse.status);
    const existingRewardIds = new Set<string>();
    if (existingRewardsResponse.ok) {
      const rewardsResult = await existingRewardsResponse.json();
      if (rewardsResult.success && Array.isArray(rewardsResult.data)) {
        for (const r of rewardsResult.data) if (r?.id) existingRewardIds.add(r.id);
      }
    }

    const existingCampaignsResponse = await fetch(`${API_BASE_URL}/api/v1/campaigns?businessId=${businessId}`, { headers: SYNC_HEADERS });
    console.log('[SYNC] Command GET campaigns?businessId=%s → status=%s', businessId, existingCampaignsResponse.status);
    const existingCampaignIds = new Set<string>();
    if (existingCampaignsResponse.ok) {
      const campaignsResult = await existingCampaignsResponse.json();
      if (campaignsResult.success && Array.isArray(campaignsResult.data)) {
        for (const c of campaignsResult.data) if (c?.id) existingCampaignIds.add(c.id);
      }
    }

    // 2. Upload all rewards (PUT existing, POST new) with retry — abort on first failure
    const activeRewards = await rewardsRepository.getActive();
    for (const reward of activeRewards) {
      const body = JSON.stringify({ ...reward, businessId: reward.businessId || businessId });
      const exists = reward.id && existingRewardIds.has(reward.id);
      const url = exists
        ? `${API_BASE_URL}/api/v1/rewards/${reward.id}`
        : `${API_BASE_URL}/api/v1/rewards`;
      const method = exists ? 'PUT' : 'POST';
      const res = await fetchWithRetry(url, { method, headers: SYNC_HEADERS, body });
      const status = res?.status ?? 'network error';
      console.log('[SYNC] Write %s reward id=%s name=%s → status=%s', method, reward.id ?? 'new', reward.name ?? 'unnamed', status);
      if (res?.ok) {
        result.rewards++;
      } else {
        const msg = `Reward "${reward.name}": ${status}`;
        uploadErrors.push(msg);
        console.error(`  ❌ ${msg}`);
        result.errors = uploadErrors;
        return result; // Abort — do not delete, do not PUT business
      }
    }
    console.log(`  ✅ Uploaded ${result.rewards}/${activeRewards.length} rewards`);

    // 3. Upload all campaigns (PUT existing, POST new) with retry — abort on first failure
    const allCampaigns = await campaignsRepository.getAll();
    const localCampaignIds = new Set<string>();
    for (const campaign of allCampaigns) {
      if (!campaign.id) {
        uploadErrors.push(`Campaign "${campaign.name}" has no ID`);
        result.errors = uploadErrors;
        return result;
      }
      localCampaignIds.add(campaign.id);
      const campaignToSend = { ...campaign, businessId: campaign.businessId || businessId };
      const campaignExists = existingCampaignIds.has(campaign.id);
      const url = campaignExists
        ? `${API_BASE_URL}/api/v1/campaigns/${campaign.id}`
        : `${API_BASE_URL}/api/v1/campaigns`;
      const method = campaignExists ? 'PUT' : 'POST';
      const res = await fetchWithRetry(url, {
        method,
        headers: SYNC_HEADERS,
        body: JSON.stringify(campaignToSend),
      });
      const status = res?.status ?? 'network error';
      console.log('[SYNC] Write %s campaign id=%s name=%s → status=%s', method, campaign.id, campaign.name ?? 'unnamed', status);
      if (res?.ok) {
        result.campaigns++;
      } else {
        const msg = `Campaign "${campaign.name}": ${status}`;
        uploadErrors.push(msg);
        console.error(`  ❌ ${msg}`);
        result.errors = uploadErrors;
        return result;
      }
    }
    console.log(`  ✅ Uploaded ${result.campaigns}/${allCampaigns.length} campaigns`);

    // 4. Delete rewards no longer in local list
    for (const existingId of existingRewardIds) {
      const stillLocal = activeRewards.some(r => r.id === existingId);
      if (!stillLocal) {
        try {
          const delRes = await fetch(`${API_BASE_URL}/api/v1/rewards/${existingId}`, { method: 'DELETE', headers: SYNC_HEADERS });
          console.log('[SYNC] Write DELETE reward id=%s → status=%s', existingId, delRes.status);
        } catch (e: any) {
          console.log('[SYNC] Write DELETE reward id=%s → error=%s', existingId, e?.message ?? e);
        }
      }
    }

    // 5. Delete campaigns no longer in local list
    for (const existingId of existingCampaignIds) {
      if (!localCampaignIds.has(existingId)) {
        try {
          const delRes = await fetch(`${API_BASE_URL}/api/v1/campaigns/${existingId}`, { method: 'DELETE', headers: SYNC_HEADERS });
          console.log('[SYNC] Write DELETE campaign id=%s → status=%s', existingId, delRes.status);
        } catch (e: any) {
          console.log('[SYNC] Write DELETE campaign id=%s → error=%s', existingId, e?.message ?? e);
        }
      }
    }

    // 6. Only now update business (timestamp) — last-known-good preserved until here
    const profile = await businessRepository.get();
    if (profile) {
      const profileResponse = await fetchWithRetry(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
        method: 'PUT',
        headers: SYNC_HEADERS,
        body: JSON.stringify({ ...profile, updatedAt: localTs }),
      });
      const putStatus = profileResponse?.status ?? 'network error';
      console.log('[SYNC] Write PUT business id=%s updatedAt=%s → status=%s', businessId, localTs, putStatus);
      if (profileResponse?.ok) {
        result.profile = true;
        console.log('  ✅ Uploaded business profile (timestamp updated)');
      } else {
        uploadErrors.push(`Business profile: ${putStatus}`);
        result.errors = uploadErrors;
        return result;
      }
    }

    // 7. Customers (non-fatal)
    const allCustomers = await customersRepository.getAll();
    for (const customer of allCustomers) {
      try {
        const customerResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });
        if (customerResponse.ok) result.customers++;
      } catch (_) { /* skip */ }
    }
    console.log(`  ✅ Uploaded ${result.customers}/${allCustomers.length} customers`);

    result.success = true;
    result.errors = [];
    console.log('✅ [UNIFIED SYNC] All data uploaded successfully (last-known-good maintained)');
  } catch (error: any) {
    console.log('[SYNC WRITE] upload failed with exception: %s', error?.message || error);
    result.errors = uploadErrors.length ? uploadErrors : [error?.message || 'Upload failed'];
  }

  return result;
};

/**
 * Perform unified sync - treats all data as one logical unit
 * Compares timestamps to decide upload vs download
 */
export const performUnifiedSync = async (businessId: string): Promise<{
  success: boolean;
  direction: 'upload' | 'download' | 'none';
  synced: {
    profile: boolean;
    rewards: number;
    campaigns: number;
    customers: number;
  };
  errors: string[];
}> => {
  const errors: string[] = [];
  const result = {
    profile: false,
    rewards: 0,
    campaigns: 0,
    customers: 0,
  };

  try {
    console.log('🔄 [UNIFIED SYNC] Starting unified sync for business:', businessId);
    console.log('🔄 [UNIFIED SYNC] All data (account, rewards, products, campaigns) syncs as one unit');

    // ⚠️ DEBUG: Send local storage dump to API for debugging
    try {
      const [businessProfile, debugRewards, debugCampaigns, debugCustomers, syncStatus] = await Promise.all([
        businessRepository.get(),
        rewardsRepository.getAll(),
        campaignsRepository.getAll(),
        customersRepository.getAll(),
        getSyncStatus(),
      ]);
      
      await fetch(`${API_BASE_URL}/api/v1/debug/local-storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          campaigns: debugCampaigns,
          rewards: debugRewards,
          businessProfile,
          customers: debugCustomers,
          syncMetadata: syncStatus,
        }),
      }).catch(err => {
        // Silently fail - debug endpoint is optional
        console.log('⚠️ [DEBUG] Could not send local storage dump to API:', err.message);
      });
    } catch (debugError: any) {
      // Silently fail - debug endpoint is optional
      console.log('⚠️ [DEBUG] Error collecting local storage dump:', debugError.message);
    }

    // Decision: request remote timestamp only, compare with local, set direction.
    let localTimestamp = await getLocalRepositoryTimestamp();
    let remoteTimestamp = await getRemoteRepositoryTimestamp(businessId);
    let retryCount = 0;
    const maxRetries = 2;
    while (remoteTimestamp == null && retryCount < maxRetries) {
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      remoteTimestamp = await getRemoteRepositoryTimestamp(businessId);
    }

    // Decide direction. Newest overwrites oldest. Never upload when local is null.
    let direction: 'upload' | 'download' | 'none' = 'none';
    if (!localTimestamp && remoteTimestamp) {
      // No valid local timestamp (e.g. stale device, fresh restore) → take Redis as truth. Never overwrite.
      console.log('📥 [UNIFIED SYNC] Local timestamp null, remote exists → downloading (no upload)');
      direction = 'download';
    } else if (!localTimestamp && !remoteTimestamp) {
      console.log('✅ [UNIFIED SYNC] Both timestamps null → no sync');
      direction = 'none';
    } else if (localTimestamp && !remoteTimestamp) {
      console.log('📤 [UNIFIED SYNC] Local exists, remote null → uploading');
      direction = 'upload';
    } else {
      const localTime = new Date(localTimestamp!).getTime();
      const remoteTime = new Date(remoteTimestamp!).getTime();
      if (localTime > remoteTime) {
        console.log('📤 [UNIFIED SYNC] Local is newer → uploading');
        direction = 'upload';
      } else if (remoteTime > localTime) {
        console.log('📥 [UNIFIED SYNC] Remote is newer → downloading');
        direction = 'download';
      } else {
        // Timestamps equal: upload if we have local unsynced changes, else no sync
        const status = await getSyncStatus();
        if (status.hasUnsyncedChanges) {
          console.log('📤 [UNIFIED SYNC] Timestamps equal but hasUnsyncedChanges → uploading');
          direction = 'upload';
        } else {
          console.log('✅ [UNIFIED SYNC] Timestamps equal, no unsynced changes → no sync');
          direction = 'none';
        }
      }
    }

    console.log('[SYNC TIMESTAMP] decision=%s local=%s remote=%s', direction, localTimestamp ?? 'null', remoteTimestamp ?? 'null');

    // Perform sync based on direction (upload/download use the timestamp decision only).
    if (direction === 'upload') {
      console.log('[SYNC WRITE] firing upload path');
      const uploadResult = await uploadAllData(businessId);
      if (!uploadResult.success) {
        console.log('[SYNC WRITE] upload failed success=%s errors=%s', uploadResult.success, uploadResult.errors?.length ? uploadResult.errors.join('; ') : 'none');
      } else {
        console.log('[SYNC WRITE] upload completed success=true rewards=%s campaigns=%s', uploadResult.rewards, uploadResult.campaigns);
      }
      result.profile = uploadResult.profile;
      result.rewards = uploadResult.rewards;
      result.campaigns = uploadResult.campaigns;
      result.customers = uploadResult.customers;
      
      if (!uploadResult.success) {
        errors.push('Upload failed (last known good state preserved).');
        if (uploadResult.errors?.length) errors.push(...uploadResult.errors);
      } else {
        // DO NOT update timestamp on sync - timestamp only changes on user create/edit/submit
        // Just record that we synced, but preserve existing timestamp
        await updateSyncMetadata({
          lastSyncedAt: new Date().toISOString(),
          hasUnsyncedChanges: false,
          // DO NOT update lastModified - it only changes when user creates/edits/submits
        });
      }
    } else if (direction === 'download') {
      const downloadResult = await downloadAllData(businessId);
      
      if (downloadResult.success) {
        // Save all downloaded data to local repository
        // DO NOT update timestamp - downloads don't change timestamp
        if (downloadResult.profile) {
          await businessRepository.save(downloadResult.profile, true); // skipMarkDirty = true
          result.profile = true;
        }
        
        await rewardsRepository.saveAll(downloadResult.rewards, true); // skipMarkDirty - we'll update timestamp after all saves
        result.rewards = downloadResult.rewards.length;
        
        await campaignsRepository.saveAll(downloadResult.campaigns, true); // skipMarkDirty
        result.campaigns = downloadResult.campaigns.length;
        
        await customersRepository.saveAll(downloadResult.customers, true); // skipMarkDirty
        result.customers = downloadResult.customers.length;
        
        // Update sync metadata with remote timestamp
        if (downloadResult.timestamp) {
          await updateSyncMetadata({
            lastSyncedAt: new Date().toISOString(),
            lastModified: downloadResult.timestamp, // Use remote timestamp
            hasUnsyncedChanges: false,
          });
        }
      } else {
        errors.push('Failed to download all data');
      }
    }

    console.log('[SYNC] Sync completed: direction=%s profile=%s rewards=%s campaigns=%s customers=%s errors=%s', direction, result.profile, result.rewards, result.campaigns, result.customers, errors.length ? errors.join('; ') : 'none');
    console.log('\n✅ [UNIFIED SYNC] Unified sync completed');
    console.log(`   Direction: ${direction}`);
    console.log(`   Profile: ${result.profile ? '✅' : '❌'}`);
    console.log(`   Rewards: ${result.rewards}`);
    console.log(`   Campaigns: ${result.campaigns}`);
    console.log(`   Customers: ${result.customers}`);

    return {
      success: errors.length === 0,
      direction,
      synced: result,
      errors,
    };
  } catch (error: any) {
    console.error('❌ [UNIFIED SYNC] Unified sync error:', error);
    errors.push(error.message || 'Unknown sync error');
    return {
      success: false,
      direction: 'none',
      synced: result,
      errors,
    };
  }
};

const updateSyncMetadata = async (updates: Partial<{
  lastSyncedAt: string | null;
  lastModified: string | null;
  hasUnsyncedChanges: boolean;
}>): Promise<void> => {
  await updateLocalSyncMetadata(updates);
};

