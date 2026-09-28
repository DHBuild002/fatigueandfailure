import { useState } from 'react';
import { currentWeek, getState, resetState, setAutoRest, setStartDate, setUnit, todayISO, type State, type Unit } from '../store';
import { RestPicker } from '../components/RestTimer';
import { PrimaryButton, Screen } from '../components/Screen';
import { TOTAL_WEEKS } from '../routine';
import { isTestMode, signOut, syncNow, useAccount } from '../account';
import { StatusDot } from '../components/SyncBadge';
import { useSyncStatus, type SyncStatus } from '../sync';

const syncText = ({ phase, lastSyncedAt }: SyncStatus) => {
  if (phase === 'syncing') return 'Syncing…';
  if (phase === 'offline') return "Offline. Changes are saved on this phone and will sync when you're back online.";
  if (phase === 'error') return "Couldn't sync just now. Your changes are safe on this phone; retrying shortly.";
  if (!lastSyncedAt) return 'Synced.';
  const t = new Date(lastSyncedAt);
  return `Synced at ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
};

interface Props {
  state: State;
  onBack: () => void;
}

const card = 'rounded-2xl bg-white border border-zinc-200 shadow-sm p-4 space-y-3';

function exportJSON() {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `overload-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Settings({ state, onBack }: Props) {
  // Inline confirmation: no modals, and window.confirm() is blocked in some embedded browsers.
  const [confirmReset, setConfirmReset] = useState(false);
  const account = useAccount();
  const signedIn = account.status === 'signed-in';
  return (
    <Screen title="Settings" onBack={onBack}>
      {signedIn && <AccountSection email={account.user.email} />}

      <section className={card}>
        <label className="block space-y-2">
          <span className="block text-lg font-semibold">Start date</span>
          <span className="block text-sm text-zinc-600">
            Week 1, day 1. Today is week {currentWeek(state.startDate)} of {TOTAL_WEEKS}.
          </span>
          <input
            type="date"
            value={state.startDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
            className="h-12 w-full rounded-xl bg-white border border-zinc-300 px-4 text-lg focus:outline-none focus:border-red-600"
          />
        </label>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold" id="unit-label">
          Units
        </h2>
        <div className="flex gap-2" role="radiogroup" aria-labelledby="unit-label">
          {(['kg', 'lb'] as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={state.unit === u}
              onClick={() => setUnit(u)}
              className={`h-12 flex-1 rounded-xl text-lg ${state.unit === u ? 'bg-red-700 text-white font-semibold' : 'bg-zinc-100 text-zinc-700'}`}
            >
              {u === 'kg' ? 'kg · km' : 'lb · mi'}
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-600">Weights are stored in kg and converted for display, so switching never loses data.</p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold" id="rest-settings-label">
          Rest timer
        </h2>
        <RestPicker value={state.restSeconds} id="rest-settings-label" />
        <label className="flex items-center justify-between gap-4 min-h-12">
          <span>
            <span className="block font-medium">Start automatically</span>
            <span className="block text-sm text-zinc-600">Begin the rest countdown each time you log a set.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={state.autoRest}
            onChange={(e) => setAutoRest(e.target.checked)}
            className="h-7 w-12 shrink-0 appearance-none rounded-full bg-zinc-300 relative cursor-pointer transition-colors checked:bg-red-700 before:absolute before:top-0.5 before:left-0.5 before:h-6 before:w-6 before:rounded-full before:bg-white before:shadow before:transition-transform checked:before:translate-x-5"
          />
        </label>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Data</h2>
        <p className="text-sm text-zinc-600">
          {signedIn
            ? 'Your data is saved on this phone and backed up to your account. Export a copy any time.'
            : 'Everything is stored on this device only. Export a copy to keep a backup.'}
        </p>
        <PrimaryButton onClick={exportJSON}>Export JSON</PrimaryButton>
        {confirmReset ? (
          <div className="space-y-3 rounded-xl border border-red-300 p-3">
            <p className="text-sm text-zinc-800">
              {signedIn
                ? "Delete all logged sets, cardio and settings, on this phone and in your account? This can't be undone."
                : "Delete all logged sets, cardio and settings? This can't be undone."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} className="h-12 flex-1 rounded-xl bg-zinc-100 text-zinc-800 font-medium">
                Cancel
              </button>
              <button type="button" onClick={resetState} className="h-12 flex-1 rounded-xl bg-red-600 text-white font-semibold">
                Delete all data
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="h-12 w-full rounded-xl border border-red-300 text-red-700 font-medium active:bg-red-50"
          >
            Reset all data
          </button>
        )}
      </section>

      <p className="text-center text-xs text-zinc-500">Overload v{__APP_VERSION__}</p>
    </Screen>
  );
}

function AccountSection({ email }: { email: string }) {
  const status = useSyncStatus();
  const [signingOut, setSigningOut] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const test = isTestMode();
  return (
    <section className={card} aria-labelledby="account-label">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" id="account-label">
          Account
        </h2>
        {test && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">TEST MODE</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-100 text-lg font-semibold text-red-800" aria-hidden="true">
          {(email[0] ?? '?').toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">Signed in as</p>
          <p className="font-medium text-zinc-900 break-all">{email}</p>
        </div>
      </div>
      <p role="status" className={`flex items-start gap-2 text-sm ${status.phase === 'error' ? 'text-red-800' : 'text-zinc-600'}`}>
        <StatusDot phase={status.phase} className="mt-1.5 shrink-0" />
        <span>{syncText(status)}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={syncing || status.phase === 'syncing'}
          onClick={async () => {
            setSyncing(true);
            await syncNow();
            setSyncing(false);
          }}
          className="h-12 flex-1 rounded-xl border border-zinc-300 bg-white text-zinc-800 font-medium active:bg-zinc-100 disabled:text-zinc-400"
        >
          {syncing || status.phase === 'syncing' ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await signOut();
          }}
          className="h-12 flex-1 rounded-xl bg-zinc-100 text-zinc-800 font-medium active:bg-zinc-300 disabled:text-zinc-500"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </section>
  );
}
