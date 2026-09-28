import { CloudError, NOT_INVITED, type Cloud, type CloudUser } from './cloudTypes';
import type { State } from './store';

// Pretend backend for TEST MODE (builds with VITE_FAKE_CLOUD=1: PR previews and
// `npm run dev:test`). Nothing leaves the browser: its "server" lives in localStorage
// under fakecloud:* so it survives reloads. It follows the real rules: invite list,
// a code to sign in, one private copy of data per person. No emails are sent; every
// test account uses the same code.

export const TEST_ACCOUNTS = ['test@overload.app', 'owner@example.com', 'friend@example.com'];
export const FAKE_CODE = '123456';
const INVITED = TEST_ACCOUNTS;

// A short pause, like a real network, so loading and syncing states can be seen.
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 600;
const network = () => new Promise((r) => setTimeout(r, LATENCY_MS));

const read = <T>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const idFor = (email: string) => `user-${email.split('@')[0]}`;

export function createFakeCloud(): Cloud {
  const listeners = new Set<(u: CloudUser | null) => void>();
  const setSession = (u: CloudUser | null) => {
    write('fakecloud:session', u);
    listeners.forEach((l) => l(u));
  };
  const offline = () => read<boolean>('fakecloud:offline', false);
  const guard = () => {
    if (offline()) throw new CloudError("Can't reach the server. Check your connection and try again.");
  };

  return {
    isTest: true,
    testAccounts: TEST_ACCOUNTS,
    testCode: FAKE_CODE,
    async getUser() {
      return read<CloudUser | null>('fakecloud:session', null);
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async sendCode(email) {
      await network();
      guard();
      if (!INVITED.includes(email.trim().toLowerCase())) throw new CloudError(NOT_INVITED);
    },
    async verifyCode(email, code) {
      await network();
      guard();
      if (code !== FAKE_CODE) throw new CloudError("That code didn't work. Check it, or send a new one.");
      const user = { id: idFor(email.trim().toLowerCase()), email: email.trim().toLowerCase() };
      setSession(user);
      return user;
    },
    async signOut() {
      setSession(null);
    },
    async pull(userId) {
      await network();
      guard();
      return read<Record<string, State>>('fakecloud:rows', {})[userId] ?? null;
    },
    async push(userId, state) {
      await network();
      guard();
      const rows = read<Record<string, State>>('fakecloud:rows', {});
      rows[userId] = state;
      write('fakecloud:rows', rows);
    },
  };
}
