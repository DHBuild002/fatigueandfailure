import { useRef, useState, type RefObject } from 'react';
import type { Exercise } from '../routine';
import { BANDS, bandRank, beats, effortLabel, formatNumber, fromDisplay, toDisplay, weightStep, type Band, type Effort, type SetLog, type Unit } from '../store';
import { EffortPicker, EffortPill } from './Effort';
import { Stepper } from './Stepper';
import { ArrowUp, Check, Close } from './Icons';

interface EditProps {
  index: number;
  exercise: Exercise;
  unit: Unit;
  initial: Partial<SetLog>;
  prev?: SetLog; // last week's matching set, shown for comparison
  repsRef?: RefObject<HTMLInputElement | null>;
  onSave: (set: SetLog) => void;
  onDiscard: () => void; // cancels a draft or deletes a saved set
  discardLabel: string;
}

// Inline editor for one set: weight (or band) + reps + ✓. No modals.
export function SetEditor({ index, exercise, unit, initial, prev, repsRef, onSave, onDiscard, discardLabel }: EditProps) {
  const [weightKg, setWeightKg] = useState(initial.weightKg);
  const [band, setBand] = useState<Band | undefined>(initial.band);
  const [reps, setReps] = useState(initial.reps ? String(initial.reps) : '');
  const [effort, setEffort] = useState<Effort | undefined>(initial.effort);
  const ownRepsRef = useRef<HTMLInputElement>(null);
  const repsInput = repsRef ?? ownRepsRef;

  const repsN = parseInt(reps, 10);
  const hasLoad = exercise.load === 'band' ? band !== undefined : weightKg !== undefined;
  const valid = hasLoad && Number.isInteger(repsN) && repsN > 0;
  const displayWeight = weightKg === undefined ? undefined : toDisplay(weightKg, unit);

  const submit = () => {
    if (!valid) return;
    const at = initial.at ?? new Date().toISOString();
    const base = exercise.load === 'band' ? { band } : { weightKg };
    onSave({ ...base, reps: repsN, ...(effort ? { effort } : {}), at });
  };

  return (
    <form
      className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-zinc-600">Set {index + 1}</span>
        {prev && (
          <span className="text-xs text-zinc-500 tabular-nums">
            Last week: {prev.band ?? `${formatNumber(toDisplay(prev.weightKg ?? 0, unit))} ${unit}`} × {prev.reps}
            {prev.effort && ` · ${effortLabel(prev.effort)}`}
          </span>
        )}
      </div>
      {exercise.load === 'band' ? (
        <div className="flex gap-2" role="radiogroup" aria-label="Band">
          {BANDS.map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={band === b}
              onClick={() => {
                setBand(b);
                if (!reps) repsInput.current?.focus(); // straight on to reps, as after "+ Add set"
              }}
              className={`h-12 flex-1 rounded-xl capitalize ${band === b ? 'bg-red-700 text-white font-semibold' : 'bg-zinc-100 text-zinc-700'}`}
            >
              {b}
            </button>
          ))}
        </div>
      ) : (
        <Stepper
          label={`Weight (${unit})`}
          value={displayWeight}
          step={weightStep(unit)}
          onChange={(v) => {
            // Keep the exact stored kg when the displayed value hasn't changed (avoids lb rounding drift).
            if (v === undefined) setWeightKg(undefined);
            else if (v !== displayWeight) setWeightKg(fromDisplay(v, unit));
          }}
        />
      )}
      <EffortPicker value={effort} onChange={setEffort} />
      <div className="flex items-center gap-2">
        <label className="flex-1 flex items-center gap-2 min-w-0">
          <input
            ref={repsInput}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            aria-label={exercise.perSide ? `Reps per ${exercise.perSide}` : 'Reps'}
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))}
            className="h-12 w-full min-w-0 rounded-xl bg-white border border-zinc-300 text-xl text-center placeholder:text-zinc-400 focus:outline-none focus:border-red-600"
          />
          <span className="text-sm text-zinc-600 shrink-0">{exercise.perSide ? `reps/${exercise.perSide}` : 'reps'}</span>
        </label>
        <button type="button" onClick={onDiscard} aria-label={discardLabel} className="h-12 min-w-12 grid place-items-center rounded-xl bg-zinc-100 text-zinc-700 active:bg-zinc-300">
          <Close />
        </button>
        <button type="submit" disabled={!valid} aria-label="Save set" className="h-12 min-w-12 grid place-items-center rounded-xl bg-red-700 text-white active:bg-red-800 disabled:bg-zinc-200 disabled:text-zinc-500">
          <Check />
        </button>
      </div>
    </form>
  );
}

interface ViewProps {
  index: number;
  set: SetLog;
  prev?: SetLog;
  unit: Unit;
  perSide?: 'leg' | 'arm';
  onEdit: () => void;
}

export function SetRow({ index, set, prev, unit, perSide, onEdit }: ViewProps) {
  const up = beats(set, prev, unit);
  const d = delta(set, prev, unit);
  // Flash once when a set that beats last week has just been logged (not on every screen open).
  const [flash] = useState(() => up && Date.now() - Date.parse(set.at) < 3000);
  const load = set.band ? <span className="capitalize">{set.band}</span> : `${formatNumber(toDisplay(set.weightKg ?? 0, unit))} ${unit}`;
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`h-12 w-full flex items-center gap-3 rounded-xl bg-zinc-100 px-3 text-left active:bg-zinc-200 ${flash ? 'set-beat' : ''}`}
    >
      <span className="text-xs text-zinc-500 w-10">Set {index + 1}</span>
      <span className="flex-1 text-base tabular-nums text-zinc-800">
        {load} × {set.reps}
        {perSide && <span className="text-sm text-zinc-600">/{perSide}</span>}
      </span>
      <EffortPill effort={set.effort} />
      {d && (
        <span className={`min-w-11 flex items-center justify-end gap-0.5 text-sm font-semibold tabular-nums ${up ? 'text-red-700' : 'text-zinc-500'}`}>
          {up && <ArrowUp className="w-4 h-4" />}
          <span aria-hidden>{d.text}</span>
          <span className="sr-only">{d.label}</span>
        </span>
      )}
    </button>
  );
}

// Change against last week's matching set: the load if it moved, otherwise the reps.
function delta(set: SetLog, prev: SetLog | undefined, unit: Unit): { text: string; label: string } | undefined {
  if (!prev) return undefined;
  const sign = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  if (set.band || prev.band) {
    const steps = bandRank(set.band) - bandRank(prev.band);
    if (steps !== 0) return { text: `${sign(steps)} band`, label: `${Math.abs(steps)} band ${steps > 0 ? 'heavier' : 'lighter'} than last week` };
  } else {
    const kg = Math.round((toDisplay(set.weightKg ?? 0, unit) - toDisplay(prev.weightKg ?? 0, unit)) * 100) / 100;
    if (kg !== 0) {
      const n = formatNumber(Math.abs(kg));
      return { text: `${kg > 0 ? '+' : '−'}${n} ${unit}`, label: `${n} ${unit} ${kg > 0 ? 'heavier' : 'lighter'} than last week` };
    }
  }
  const reps = set.reps - prev.reps;
  if (reps === 0) return { text: '=', label: 'Same as last week' };
  return { text: sign(reps), label: `${Math.abs(reps)} ${Math.abs(reps) === 1 ? 'rep' : 'reps'} ${reps > 0 ? 'more' : 'fewer'} than last week` };
}
