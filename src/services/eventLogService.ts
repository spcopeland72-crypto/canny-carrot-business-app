/**
 * Business app event log — same behaviour as customer app transaction log.
 * Stored in AsyncStorage under local_repo:event_log; client cap 300.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransactionLogEntry } from '../types/eventLog';
import { TRANSACTION_LOG_MAX } from '../types/eventLog';

const EVENT_LOG_KEY = 'local_repo:event_log';

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

export async function appendEventLog(entry: TransactionLogEntry): Promise<void> {
  const log = await getEventLog();
  log.push(entry);
  if (log.length > TRANSACTION_LOG_MAX) {
    log.splice(0, log.length - TRANSACTION_LOG_MAX);
  }
  await AsyncStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log));
}

export async function appendLoginEvent(): Promise<void> {
  await appendEventLog({
    timestamp: new Date().toISOString(),
    action: 'EVENT:LOGIN',
    data: {},
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
