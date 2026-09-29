import { useRef, useState } from 'react';
import { currentWeek, getState, resetState, setAutoRest, setStartDate, setState, setUnit, todayISO, type State, type Unit } from '../store';
import { parseBackup, type ParsedBackup } from '../backup';
import { RestPicker } from '../components/RestTimer';
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
          Everything is stored on this device only. Export a copy to keep a backup, or import one to restore it (for example after reinstalling the app).
        </p>
        <PrimaryButton onClick={exportJSON}>Export JSON</PrimaryButton>
        <ImportBackup />
        {confirmReset ? (
          <div className="space-y-3 rounded-xl border border-red-300 p-3">
            <p className="text-sm text-zinc-800">Delete all logged sets, cardio and settings? This can't be undone.</p>
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

function ImportBackup() {
  const input = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<ParsedBackup | null>(null);
  const [imported, setImported] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setImported(false);
    setBackup(parseBackup(await file.text()));
    if (input.current) input.current.value = ''; // so choosing the same file again still fires
  };

  return (
    <>
      <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => void choose(e.target.files?.[0])} />
      {backup?.ok ? (
        <div className="space-y-3 rounded-xl border border-red-300 p-3" role="alertdialog" aria-label="Confirm import">
          <p className="text-sm text-zinc-800">
            Replace everything on this phone with this backup? It has {backup.sets} logged {backup.sets === 1 ? 'set' : 'sets'}
            {backup.state.startDate && `, starting ${formatDate(backup.state.startDate)}`}.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setBackup(null)} className="h-12 flex-1 rounded-xl bg-zinc-100 text-zinc-800 font-medium">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setState(() => backup.state);
                setBackup(null);
                setImported(true);
              }}
              className="h-12 flex-1 rounded-xl bg-red-700 text-white font-semibold"
            >
              Import
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="h-12 w-full rounded-xl border border-zinc-300 text-zinc-800 font-medium active:bg-zinc-100"
        >
          Import JSON
        </button>
      )}
      {backup && !backup.ok && (
        <p className="text-sm text-red-700" role="alert">
          {backup.error}
        </p>
      )}
      {imported && (
        <p className="text-sm text-zinc-700" role="status">
          Backup imported.
        </p>
      )}
    </>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
