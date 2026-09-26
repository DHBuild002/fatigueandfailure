import { useState } from 'react';
import { currentWeek, getState, resetState, setStartDate, setUnit, todayISO, type State, type Unit } from '../store';
import { PrimaryButton, Screen } from '../components/Screen';
import { TOTAL_WEEKS } from '../routine';

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
  return (
    <Screen title="Settings" onBack={onBack}>
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
            className="h-12 w-full rounded-xl bg-white border border-zinc-300 px-4 text-lg focus:outline-none focus:border-emerald-600"
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
              className={`h-12 flex-1 rounded-xl text-lg ${state.unit === u ? 'bg-emerald-700 text-white font-semibold' : 'bg-zinc-100 text-zinc-700'}`}
            >
              {u === 'kg' ? 'kg · km' : 'lb · mi'}
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-600">Weights are stored in kg and converted for display, so switching never loses data.</p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Data</h2>
        <p className="text-sm text-zinc-600">Everything is stored on this device only. Export a copy to keep a backup.</p>
        <PrimaryButton onClick={exportJSON}>Export JSON</PrimaryButton>
        {confirmReset ? (
          <div className="space-y-3 rounded-xl border border-red-300 p-3">
            <p className="text-sm text-zinc-800">Delete all logged sets, cardio and settings? This can't be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} className="h-12 flex-1 rounded-xl bg-zinc-100 text-zinc-800 font-medium">
                Cancel
              </button>
              <button type="button" onClick={resetState} className="h-12 flex-1 rounded-xl bg-red-600 text-white font-semibold">
                Delete everything
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
