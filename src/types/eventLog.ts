/**
 * Event log types — same shape as customer app transaction log.
 * Used for EVENT:LOGIN (with reward/campaign counts), EVENT:LOGOUT, CREATE, EDIT, DELETE, SYNC.
 */

export type TransactionAction = 'EVENT:LOGIN' | 'EVENT:LOGOUT' | 'SCAN' | 'EDIT' | 'ACTION' | 'CREATE' | 'DELETE' | 'SYNC_ERROR';

export interface TransactionLogEntry {
  timestamp: string;
  action: TransactionAction;
  data: Record<string, unknown>;
}

export const TRANSACTION_LOG_MAX = 300;

/**
 * Sync manifest: baseline counts at login/download + create/delete deltas.
 * Used to ensure dump at sync/logout is 100% accurate (expected = baseline + creates - deletes).
 */
export interface SyncManifest {
  rewardsAtLogin: number;
  campaignsAtLogin: number;
  rewardCreates: number;
  rewardDeletes: number;
  campaignCreates: number;
  campaignDeletes: number;
}
