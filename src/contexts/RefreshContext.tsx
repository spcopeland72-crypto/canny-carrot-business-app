import React, { createContext, useContext, useCallback } from 'react';

export type RefreshAfterSyncFn = () => Promise<void>;

const RefreshContext = createContext<{ refreshAfterSync: RefreshAfterSyncFn } | null>(null);

export function RefreshProvider({
  children,
  refreshAfterSync,
}: {
  children: React.ReactNode;
  refreshAfterSync: RefreshAfterSyncFn;
}) {
  const value = { refreshAfterSync: useCallback(refreshAfterSync, [refreshAfterSync]) };
  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh(): { refreshAfterSync: RefreshAfterSyncFn } {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    return {
      refreshAfterSync: async () => {},
    };
  }
  return ctx;
}
