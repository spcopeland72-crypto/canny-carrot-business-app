import React, {createContext, useContext, useState, useCallback, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { type BusinessMessage } from '../services/api';
import { getStoredAuth } from '../services/authService';

const INBOX_EVENTS_KEY_PREFIX = 'canny_carrot:message_inbox_events_business_';
const INBOX_READ_KEY_PREFIX = 'canny_carrot:message_inbox_read_business_';

export type InboxEvent = { type: 'delete'; conversationId: string; at: string };

async function getInboxEventLog(businessId: string): Promise<InboxEvent[]> {
  const key = INBOX_EVENTS_KEY_PREFIX + businessId;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendInboxEvent(businessId: string, event: InboxEvent): Promise<void> {
  const key = INBOX_EVENTS_KEY_PREFIX + businessId;
  const log = await getInboxEventLog(businessId);
  log.push(event);
  await AsyncStorage.setItem(key, JSON.stringify(log));
}

async function getInboxReadIds(businessId: string): Promise<string[]> {
  const key = INBOX_READ_KEY_PREFIX + businessId;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function addInboxReadId(businessId: string, conversationId: string): Promise<void> {
  const key = INBOX_READ_KEY_PREFIX + businessId;
  const ids = await getInboxReadIds(businessId);
  if (ids.includes(conversationId)) return;
  await AsyncStorage.setItem(key, JSON.stringify([...ids, conversationId]));
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: string;
  type?: 'text' | 'voice';
  voiceDuration?: string;
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  read: boolean;
  online: boolean;
  avatarEmoji: string;
  identityId?: string;
  messages: ChatMessage[];
  createdAt?: string;
  /** Priority for traffic light: important=red, update=amber, information=green */
  priority?: 'important' | 'update' | 'information';
}

function formatTimeAgo(iso: string): string {
  if (!iso || typeof iso !== 'string') return '';
  const date = new Date(iso);
  const ts = date.getTime();
  if (Number.isNaN(ts)) return '';
  const now = Date.now();
  const diffMs = now - ts;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day ago`;
  return date.toLocaleDateString();
}

function normalizePriority(raw: unknown): 'important' | 'update' | 'information' | undefined {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'important' || s === 'high') return 'important';
  if (s === 'update' || s === 'medium') return 'update';
  if (s === 'information' || s === 'low' || s === 'info') return 'information';
  return undefined;
}

function notificationToConversation(n: BusinessMessage): Conversation {
  const createdAt = n?.createdAt ?? '';
  const priority = normalizePriority((n as { data?: { priority?: unknown }; type?: string })?.data?.priority ?? (n as { type?: string })?.type);
  return {
    id: n?.id ?? '',
    name: n?.title || 'Notification',
    lastMessage: n?.message || '',
    lastTimestamp: formatTimeAgo(createdAt),
    unreadCount: n?.read ? 0 : 1,
    read: !!n?.read,
    online: false,
    avatarEmoji: '📬',
    identityId: 'the-stables',
    messages: [{ id: n?.id ?? '', text: n?.message || '', sender: 'them' as const, timestamp: formatTimeAgo(createdAt) }],
    createdAt,
    priority,
  };
}

interface MessageStoreValue {
  conversations: Conversation[];
  markConversationRead: (id: string) => void;
  addMessage: (conversationId: string, text: string, sender: 'me' | 'them') => void;
  getConversation: (id: string) => Conversation | undefined;
  loadInboxFromApi: (businessId: string) => Promise<void>;
  deleteConversation: (id: string) => void;
}

const MessageStoreContext = createContext<MessageStoreValue | null>(null);

export function MessageStoreProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const lastBusinessIdRef = useRef<string | null>(null);

  const loadInboxFromApi = useCallback(async (businessId: string) => {
    try {
      lastBusinessIdRef.current = businessId;
      const [eventLog, readIds] = await Promise.all([
        getInboxEventLog(businessId),
        getInboxReadIds(businessId),
      ]);
      const deletedSet = new Set(
        eventLog.filter((e) => e.type === 'delete').map((e) => e.conversationId)
      );
      const readSet = new Set(readIds);

      const res = await api.business.getNotifications(businessId, 50, 0);
      if (!res?.success || !Array.isArray(res.data)) {
        if (__DEV__) {
          console.warn('[MessageStore] Inbox load bailed:', {
            success: res?.success,
            hasData: !!res?.data,
            isArray: Array.isArray(res?.data),
            error: (res as { error?: string })?.error,
          });
        }
        return;
      }
      const list = res.data.filter((n): n is BusinessMessage => n != null && typeof n === 'object');
      const newConvs = list.map((n) => notificationToConversation(n));

      setConversations((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        for (const c of newConvs) {
          if (c.id != null && c.id !== '' && !deletedSet.has(c.id)) {
            byId.set(c.id, {
              ...c,
              read: readSet.has(c.id) || c.read,
              unreadCount: readSet.has(c.id) ? 0 : c.unreadCount,
            });
          }
        }
        const merged = [...byId.values()].filter((c) => !deletedSet.has(c.id));
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return merged;
      });
    } catch {
      // keep existing conversations on error
    }
  }, []);

  const markConversationRead = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, read: true, unreadCount: 0 } : c))
    );
    const businessId = lastBusinessIdRef.current;
    if (businessId) {
      addInboxReadId(businessId, id).catch(() => {});
    } else {
      getStoredAuth().then((a) => a?.businessId && addInboxReadId(a.businessId, id).catch(() => {}));
    }
  }, []);

  const addMessage = useCallback((conversationId: string, text: string, sender: 'me' | 'them') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === conversationId);
      if (!conv) return prev;
      const newMsg: ChatMessage = { id: `m${Date.now()}`, text, sender, timestamp: timeStr };
      const updated = prev.map((c) => {
        if (c.id !== conversationId) return c;
        const messages = [...(Array.isArray(c.messages) ? c.messages : []), newMsg];
        return {
          ...c,
          messages,
          lastMessage: text,
          lastTimestamp: '0 min',
          unreadCount: sender === 'them' ? c.unreadCount + 1 : c.unreadCount,
          read: sender === 'me',
        };
      });
      return updated;
    });
  }, []);

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    const businessId = lastBusinessIdRef.current;
    if (businessId) {
      appendInboxEvent(businessId, { type: 'delete', conversationId: id, at: new Date().toISOString() }).catch(() => {});
    } else {
      getStoredAuth().then((a) => {
        if (a?.businessId) {
          appendInboxEvent(a.businessId, { type: 'delete', conversationId: id, at: new Date().toISOString() }).catch(() => {});
        }
      });
    }
  }, []);

  return (
    <MessageStoreContext.Provider
      value={{ conversations, markConversationRead, addMessage, getConversation, loadInboxFromApi, deleteConversation }}>
      {children}
    </MessageStoreContext.Provider>
  );
}

export function useMessageStore() {
  const ctx = useContext(MessageStoreContext);
  if (!ctx) throw new Error('useMessageStore must be used within MessageStoreProvider');
  return ctx;
}
