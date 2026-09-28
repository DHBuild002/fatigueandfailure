import { CloudError, NOT_INVITED, type Cloud, type CloudUser } from './cloudTypes';
import type { State } from './store';

// In-memory stand-in for Supabase, used only by builds with VITE_FAKE_CLOUD=1 (browser
// tests). Its "server" lives in localStorage under fakecloud:* so it survives reloads, and
// it mimics the real rules: invite list, one code for everyone, one row per user.

const INVITED = ['owner@example.com', 'friend@example.com'];
export const FAKE_CODE = '123456';

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
    async getUser() {
      return read<CloudUser | null>('fakecloud:session', null);
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async sendCode(email) {
      guard();
      if (!INVITED.includes(email.trim().toLowerCase())) throw new CloudError(NOT_INVITED);
    },
    async verifyCode(email, code) {
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
      guard();
      return read<Record<string, State>>('fakecloud:rows', {})[userId] ?? null;
    },
    async push(userId, state) {
      guard();
      const rows = read<Record<string, State>>('fakecloud:rows', {});
      rows[userId] = state;
      write('fakecloud:rows', rows);
    },
  };
}
