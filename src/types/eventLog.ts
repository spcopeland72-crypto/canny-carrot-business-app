/**
 * Event log types — same shape as customer app transaction log.
 * Used for EVENT:LOGIN, EVENT:LOGOUT, and future actions (e.g. SYNC).
 */

export type TransactionAction = 'EVENT:LOGIN' | 'EVENT:LOGOUT' | 'SCAN' | 'EDIT' | 'ACTION' | 'CREATE';

export interface TransactionLogEntry {
  timestamp: string;
  action: TransactionAction;
  data: Record<string, unknown>;
}

export const TRANSACTION_LOG_MAX = 300;
