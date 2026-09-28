import { useSyncExternalStore } from 'react';
import { cloud, type CloudUser } from './cloud';
import { switchUser } from './store';
import { createSync, type Sync } from './sync';

// Who is signed in, and wiring between that and the store + sync.
// Local-only builds (no Supabase keys) never leave 'local'.

export type Account =
  | { status: 'local' } // no backend configured: the app works as before
  | { status: 'checking' } // looking for a saved session
  | { status: 'signed-out' }
  | { status: 'loading'; user: CloudUser } // signed in, fetching their data
  | { status: 'signed-in'; user: CloudUser };

let account: Account = cloud ? { status: 'checking' } : { status: 'local' };
const listeners = new Set<() => void>();
const set = (next: Account) => {
  account = next;
  listeners.forEach((l) => l());
};
export const getAccount = () => account;
export function useAccount(): Account {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getAccount,
    getAccount,
  );
}

let sync: Sync | null = null;
let started = false;

// How long to wait for the first sync before showing whatever is on the device.
const FIRST_SYNC_TIMEOUT_MS = 6000;

async function enter(user: CloudUser) {
  if ((account.status === 'signed-in' || account.status === 'loading') && account.user.id === user.id) return;
  sync?.stop();
  switchUser(user.id);
  set({ status: 'loading', user });
  sync = createSync(cloud!, user.id);
  await Promise.race([sync.start(), new Promise((r) => setTimeout(r, FIRST_SYNC_TIMEOUT_MS))]);
  if (account.status === 'loading' && account.user.id === user.id) set({ status: 'signed-in', user });
}

function leave() {
  sync?.stop();
  sync = null;
  switchUser(null);
  set({ status: 'signed-out' });
}

// Call once at startup. Restores a saved session (works offline) and follows sign-ins
// that arrive from a magic link opened in this browser.
export async function initAccount() {
  if (!cloud || started) return;
  started = true;
  cloud.onAuthChange((user) => {
    if (user) void enter(user);
    else if (account.status !== 'signed-out' && account.status !== 'checking') leave();
  });
  const user = await cloud.getUser().catch(() => null);
  if (user) await enter(user);
  else if (account.status === 'checking') set({ status: 'signed-out' });
}

export async function sendCode(email: string) {
  await cloud!.sendCode(email.trim().toLowerCase());
}

export async function verifyCode(email: string, code: string) {
  const user = await cloud!.verifyCode(email.trim().toLowerCase(), code.trim());
  await enter(user);
}

// Run a sync straight away (Settings → Sync now).
export async function syncNow() {
  await sync?.syncNow();
}

export const isTestMode = () => cloud?.isTest === true;
export const testAccounts = () => ({ emails: cloud?.testAccounts ?? [], code: cloud?.testCode ?? '' });

// Try to get the latest changes up before signing out; they stay on this device either way.
export async function signOut() {
  if (!cloud) return;
  await Promise.race([sync?.syncNow(), new Promise((r) => setTimeout(r, 4000))]);
  leave();
  await cloud.signOut().catch(() => {});
}
