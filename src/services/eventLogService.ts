/**
 * Business app event log — same behaviour as customer app transaction log.
 * Stored in AsyncStorage under local_repo:event_log; client cap 300.
 * Synced to Redis as business.transactionLog (merge on commit, returned on GET). Cap 300.
 * Sync manifest: inbound counts at login/download + create/delete tally for 100% accurate dump at sync/logout.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransactionLogEntry, SyncManifest } from '../types/eventLog';
import { TRANSACTION_LOG_MAX } from '../types/eventLog';

const EVENT_LOG_KEY = 'local_repo:event_log';
const SYNC_MANIFEST_KEY = 'local_repo:sync_manifest';

const DEFAULT_MANIFEST: SyncManifest = {
  rewardsAtLogin: 0,
  campaignsAtLogin: 0,
  rewardCreates: 0,
  rewardDeletes: 0,
  campaignCreates: 0,
  campaignDeletes: 0,
};

export async function getEventLog(): Promise<TransactionLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Replace local event log with server log (e.g. after download). Same cap as append. */
export async function setEventLog(entries: TransactionLogEntry[]): Promise<void> {
  try {
    const log = Array.isArray(entries) ? entries : [];
    const capped = log.length > TRANSACTION_LOG_MAX ? log.slice(-TRANSACTION_LOG_MAX) : log;
    await AsyncStorage.setItem(EVENT_LOG_KEY, JSON.stringify(capped));
  } catch (err: unknown) {
    console.error('[EVENT LOG] Failed to set event log:', err);
    throw err;
  }
}

export async function appendEventLog(entry: TransactionLogEntry): Promise<void> {
  try {
    const log = await getEventLog();
    log.push(entry);
    if (log.length > TRANSACTION_LOG_MAX) {
      log.splice(0, log.length - TRANSACTION_LOG_MAX);
    }
    await AsyncStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log));
  } catch (err: unknown) {
    console.error('[EVENT LOG] Failed to append entry:', err);
    throw err;
  }
}

/** Log login with inbound reward/campaign counts (from download or local state after login). */
export async function appendLoginEvent(data: { rewardCount?: number; campaignCount?: number } = {}): Promise<void> {
  await appendEventLog({
    timestamp: new Date().toISOString(),
    action: 'EVENT:LOGIN',
    data: { rewardCount: data.rewardCount ?? 0, campaignCount: data.campaignCount ?? 0 },
  });
}

export async function appendLogoutEvent(): Promise<void> {
  await appendEventLog({
    timestamp: new Date().toISOString(),
    action: 'EVENT:LOGOUT',
    data: {},
  });
}

/** Log a create (entityType: reward | campaign | customer | business_profile). */
export async function appendCreateEvent(
  entityType: 'reward' | 'campaign' | 'customer' | 'business_profile',
  entityId: string,
  name?: string,
): Promise<void> {
  await appendEventLog({
    timestamp: new Date().toISOString(),
    action: 'CREATE',
    data: { entityType, entityId, name: name ?? '' },
  });
}

/** Log an edit (entityType: reward | campaign | customer | business_profile). */
export async function appendEditEvent(
  entityType: 'reward' | 'campaign' | 'customer' | 'business_profile',
  entityId: string,
  name?: string,
): Promise<void> {
  await appendEventLog({
    timestamp: new Date().toISOString(),
    action: 'EDIT',
    data: { entityType, entityId, name: name ?? '' },
  });
}

/** Log a delete (entityType: reward | campaign | customer | business_profile). */
export async function appendDeleteEvent(
  entityType: 'reward' | 'campaign' | 'customer' | 'business_profile',
  entityId: string,
  name?: string,
): Promise<void> {
  await appendEventLog({
    timestamp: new Date().toISOString(),
    action: 'DELETE',
    data: { entityType, entityId, name: name ?? '' },
  });
}

// --- Sync manifest (tally for 100% accurate dump at sync/logout) ---

export async function getSyncManifest(): Promise<SyncManifest> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_MANIFEST_KEY);
    if (!raw) return { ...DEFAULT_MANIFEST };
    const parsed = JSON.parse(raw) as Partial<SyncManifest>;
    return { ...DEFAULT_MANIFEST, ...parsed };
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

/** Set baseline counts (e.g. after login or after sync download). Resets create/delete deltas to 0. */
export async function setSyncManifestBaseline(params: { rewardsAtLogin: number; campaignsAtLogin: number }): Promise<void> {
  const m: SyncManifest = {
    ...DEFAULT_MANIFEST,
    rewardsAtLogin: params.rewardsAtLogin,
    campaignsAtLogin: params.campaignsAtLogin,
  };
  await AsyncStorage.setItem(SYNC_MANIFEST_KEY, JSON.stringify(m));
}

/** Increment create/delete tally when user creates or deletes a reward/campaign. */
export async function updateSyncManifestTally(updates: {
  rewardCreate?: number;
  rewardDelete?: number;
  campaignCreate?: number;
  campaignDelete?: number;
}): Promise<void> {
  const m = await getSyncManifest();
  if (updates.rewardCreate != null) m.rewardCreates += updates.rewardCreate;
  if (updates.rewardDelete != null) m.rewardDeletes += updates.rewardDelete;
  if (updates.campaignCreate != null) m.campaignCreates += updates.campaignCreate;
  if (updates.campaignDelete != null) m.campaignDeletes += updates.campaignDelete;
  await AsyncStorage.setItem(SYNC_MANIFEST_KEY, JSON.stringify(m));
}

/** Expected counts from tally: baseline + creates - deletes. */
export function getExpectedCounts(manifest: SyncManifest): { expectedRewards: number; expectedCampaigns: number } {
  return {
    expectedRewards: Math.max(0, manifest.rewardsAtLogin + manifest.rewardCreates - manifest.rewardDeletes),
    expectedCampaigns: Math.max(0, manifest.campaignsAtLogin + manifest.campaignCreates - manifest.campaignDeletes),
  };
}

/** Validate dump counts against manifest tally. If mismatch, dump is not 100% accurate. */
export async function validateDumpCounts(
  actualRewards: number,
  actualCampaigns: number,
): Promise<{ ok: boolean; expectedRewards: number; expectedCampaigns: number; message?: string }> {
  const manifest = await getSyncManifest();
  const { expectedRewards, expectedCampaigns } = getExpectedCounts(manifest);
  const rewardsOk = actualRewards === expectedRewards;
  const campaignsOk = actualCampaigns === expectedCampaigns;
  if (rewardsOk && campaignsOk) {
    return { ok: true, expectedRewards, expectedCampaigns };
  }
  const parts: string[] = [];
  if (!rewardsOk) parts.push(`rewards: expected ${expectedRewards}, got ${actualRewards}`);
  if (!campaignsOk) parts.push(`campaigns: expected ${expectedCampaigns}, got ${actualCampaigns}`);
  return {
    ok: false,
    expectedRewards,
    expectedCampaigns,
    message: `Dump tally mismatch: ${parts.join('; ')}. No data was sent or changed.`,
  };
}

/** Log a sync error to the event log (e.g. dump tally mismatch). No state change — user is notified and we wait for instruction. */
export async function appendSyncErrorEvent(
  message: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await appendEventLog({
    timestamp: new Date().toISOString(),
    action: 'SYNC_ERROR',
    data: { message, ...details },
  });
}
