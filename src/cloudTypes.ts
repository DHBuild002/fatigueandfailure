import type { State } from './store';

// Shared by the real and fake backends (kept separate so neither imports the other).

export interface CloudUser {
  id: string;
  email: string;
}

export interface Cloud {
  isTest?: boolean; // true only for the in-browser test backend
  testAccounts?: string[]; // emails that can sign in on the test backend
  testCode?: string;
  getUser(): Promise<CloudUser | null>;
  onAuthChange(cb: (user: CloudUser | null) => void): () => void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<CloudUser>;
  signOut(): Promise<void>;
  pull(userId: string): Promise<State | null>;
  push(userId: string, state: State): Promise<void>;
}

// Shown to the person signing in, so written for them rather than for developers.
export class CloudError extends Error {}

export const NOT_INVITED = "This email isn't on the invite list. Ask the app owner to add you.";
