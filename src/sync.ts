import { useSyncExternalStore } from 'react';
import type { Cloud } from './cloudTypes';
import { mergeStates, resolve } from './merge';
import { getState, replaceState, subscribe, type State } from './store';

// Keeps the signed-in user's local data and their cloud copy in step. The app stays
// offline-first: every change is saved locally at once (store.ts) and pushed here after a
// short pause, or as soon as the phone is back online.

export type SyncPhase = 'syncing' | 'synced' | 'offline' | 'error';
export interface SyncStatus {
  phase: SyncPhase;
  lastSyncedAt: string; // when the last successful sync finished ('' = not yet)
}

let status: SyncStatus = { phase: 'syncing', lastSyncedAt: '' };
const statusListeners = new Set<() => void>();
const setStatus = (next: Partial<SyncStatus>) => {
  status = { ...status, ...next };
  statusListeners.forEach((l) => l());
};
export const getSyncStatus = () => status;

// Short wording for the sync state (Home header button label).
export const SYNC_LABEL: Record<SyncPhase, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  offline: 'Offline',
  error: 'Sync problem',
};

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    getSyncStatus,
    getSyncStatus,
  );
}

// The updatedAt both copies agreed on at the last successful sync, per user and device.
const syncedKey = (userId: string) => `overload:synced:${userId}`;
const readSynced = (userId: string) => {
  try {
    return localStorage.getItem(syncedKey(userId)) ?? '';
  } catch {
    return '';
  }
};
const writeSynced = (userId: string, at: string) => {
  try {
    localStorage.setItem(syncedKey(userId), at);
  } catch {
    // Without storage we just re-check next time.
  }
};

export interface SyncOptions {
  debounceMs?: number;
  retryMs?: number;
  isOnline?: () => boolean;
}

export interface Sync {
  start(): Promise<void>; // resolves after the first sync attempt (success or failure)
  syncNow(): Promise<void>;
  stop(): void;
}

export function createSync(cloud: Cloud, userId: string, opts: SyncOptions = {}): Sync {
  const debounceMs = opts.debounceMs ?? 2000;
  const retryMs = opts.retryMs ?? 15000;
  // Only treat the phone as offline when it says so; if unknown, try and let errors decide.
  const isOnline = opts.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false);

  let running = false;
  let again = false;
  let stopped = false;
  let applying = false; // true while we write a synced copy into the store (not a user change)
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const cleanups: (() => void)[] = [];

  const apply = (s: State) => {
    applying = true;
    try {
      replaceState(s);
    } finally {
      applying = false;
    }
  };

  const done = (at: string) => {
    writeSynced(userId, at);
    setStatus({ phase: 'synced', lastSyncedAt: new Date().toISOString() });
  };

  async function syncNow(): Promise<void> {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    if (!isOnline()) {
      setStatus({ phase: 'offline' });
      return;
    }
    running = true;
    clearTimeout(retry);
    setStatus({ phase: 'syncing' });
    try {
      const remote = await cloud.pull(userId);
      let local = getState();
      const decision = resolve(local, remote, readSynced(userId));

      if (decision === 'none') {
        done(local.updatedAt);
      } else if (decision === 'push') {
        if (!local.updatedAt) {
          local = { ...local, updatedAt: new Date().toISOString() };
          apply(local);
        }
        await cloud.push(userId, local);
        done(local.updatedAt);
      } else {
        // Something may have been logged while we were fetching; if so, start over
        // rather than overwrite it.
        if (getState() !== local) {
          again = true;
        } else if (decision === 'take-remote') {
          apply(remote!);
          done(remote!.updatedAt);
        } else {
          const merged = mergeStates(local, remote!);
          apply(merged);
          await cloud.push(userId, merged);
          done(merged.updatedAt);
        }
      }
    } catch {
      setStatus({ phase: isOnline() ? 'error' : 'offline' });
      if (!stopped) retry = setTimeout(() => void syncNow(), retryMs);
    } finally {
      running = false;
    }
    if (again && !stopped) {
      again = false;
      await syncNow();
    }
  }

  const onChange = () => {
    if (applying || stopped) return;
    if (getState().updatedAt === readSynced(userId)) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => void syncNow(), debounceMs);
  };

  return {
    async start() {
      stopped = false;
      cleanups.push(subscribe(onChange));
      if (typeof window !== 'undefined') {
        const onOnline = () => void syncNow();
        const onVisible = () => document.visibilityState === 'visible' && void syncNow();
        window.addEventListener('online', onOnline);
        document.addEventListener('visibilitychange', onVisible);
        cleanups.push(() => window.removeEventListener('online', onOnline));
        cleanups.push(() => document.removeEventListener('visibilitychange', onVisible));
      }
      await syncNow();
    },
    syncNow,
    stop() {
      stopped = true;
      clearTimeout(debounce);
      clearTimeout(retry);
      cleanups.splice(0).forEach((c) => c());
    },
  };
}
