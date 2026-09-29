import { useState } from 'react';
import { isTestMode, signOut } from '../account';

// Test mode only (PR previews): a reminder that these are pretend accounts, who is signed
// in, and a quick way back to the sign-in screen, since the session is remembered.
export function TestModeBar({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  if (!isTestMode()) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-1 pl-3 pr-1 text-sm text-amber-950" role="note">
      <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">TEST MODE</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="sr-only">Signed in as </span>
        {email}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await signOut();
        }}
        className="h-11 shrink-0 rounded-lg px-3 font-medium text-amber-950 underline underline-offset-2 active:bg-amber-100 disabled:opacity-60"
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
