import { CloudError, NOT_INVITED, type Cloud, type CloudUser } from './cloudTypes';
import type { State } from './store';

export { CloudError, NOT_INVITED, type Cloud, type CloudUser };

// The app's only view of the backend. Real builds use Supabase when both env vars are
// set; without them `cloud` is null and the app runs local-only, exactly as before.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloud: Cloud | null =
  import.meta.env.VITE_FAKE_CLOUD === '1'
    ? (await import('./cloud.fake')).createFakeCloud()
    : url && anonKey
      ? await createSupabaseCloud(url, anonKey)
      : null;

async function createSupabaseCloud(url: string, anonKey: string): Promise<Cloud> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const toUser = (u: { id: string; email?: string } | null | undefined): CloudUser | null =>
    u ? { id: u.id, email: u.email ?? '' } : null;

  const friendly = (message: string): string => {
    // The invite-list trigger rejects the insert into auth.users; Supabase reports that as a database error.
    if (/database error|not on the invite list|signups not allowed/i.test(message)) return NOT_INVITED;
    if (/rate limit|too many/i.test(message)) return 'Too many sign-in emails just now. Wait a minute and try again.';
    if (/expired|invalid/i.test(message)) return "That code didn't work. Check it, or send a new one.";
    if (/fetch|network/i.test(message)) return "Can't reach the server. Check your connection and try again.";
    return message;
  };

  return {
    async getUser() {
      const { data } = await sb.auth.getSession();
      return toUser(data.session?.user);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    async sendCode(email) {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw new CloudError(friendly(error.message));
    },
    async verifyCode(email, code) {
      const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error || !data.user) throw new CloudError(friendly(error?.message ?? 'invalid'));
      return toUser(data.user)!;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async pull(userId) {
      const { data, error } = await sb.from('user_state').select('state').eq('user_id', userId).maybeSingle();
      if (error) throw new CloudError(friendly(error.message));
      return (data?.state as State | undefined) ?? null;
    },
    async push(userId, state) {
      const { error } = await sb
        .from('user_state')
        .upsert({ user_id: userId, state, updated_at: state.updatedAt || new Date().toISOString() });
      if (error) throw new CloudError(friendly(error.message));
    },
  };
}
