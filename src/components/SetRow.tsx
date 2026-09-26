import { useRef, useState, type RefObject } from 'react';
import type { Exercise } from '../routine';
import { BANDS, beats, formatNumber, fromDisplay, toDisplay, weightStep, type Band, type SetLog, type Unit } from '../store';
import { Stepper } from './Stepper';
import { ArrowUp, Check, Close } from './Icons';

interface EditProps {
  index: number;
  exercise: Exercise;
  unit: Unit;
  initial: Partial<SetLog>;
  repsRef?: RefObject<HTMLInputElement | null>;
  onSave: (set: SetLog) => void;
  onDiscard: () => void; // cancels a draft or deletes a saved set
  discardLabel: string;
}

// Inline editor for one set: weight (or band) + reps + ✓. No modals.
export function SetEditor({ index, exercise, unit, initial, repsRef, onSave, onDiscard, discardLabel }: EditProps) {
  const [weightKg, setWeightKg] = useState(initial.weightKg);
  const [band, setBand] = useState<Band | undefined>(initial.band);
  const [reps, setReps] = useState(initial.reps ? String(initial.reps) : '');
  const ownRepsRef = useRef<HTMLInputElement>(null);
  const repsInput = repsRef ?? ownRepsRef;

  const repsN = parseInt(reps, 10);
  const hasLoad = exercise.load === 'band' ? band !== undefined : weightKg !== undefined;
  const valid = hasLoad && Number.isInteger(repsN) && repsN > 0;
  const displayWeight = weightKg === undefined ? undefined : toDisplay(weightKg, unit);

  const submit = () => {
    if (!valid) return;
    const at = initial.at ?? new Date().toISOString();
    onSave(exercise.load === 'band' ? { band, reps: repsN, at } : { weightKg, reps: repsN, at });
  };

  return (
    <form
      className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="text-xs uppercase tracking-wide text-zinc-600">Set {index + 1}</div>
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
              className={`h-12 flex-1 rounded-xl capitalize ${band === b ? 'bg-white text-white font-semibold' : 'bg-zinc-100 text-zinc-700'}`}
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
            className="h-12 w-full min-w-0 rounded-xl bg-white border border-zinc-300 text-xl text-center placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600"
          />
          <span className="text-sm text-zinc-600 shrink-0">{exercise.perSide ? `reps/${exercise.perSide}` : 'reps'}</span>
        </label>
        <button type="button" onClick={onDiscard} aria-label={discardLabel} className="h-12 min-w-12 grid place-items-center rounded-xl bg-zinc-100 text-zinc-700 active:bg-zinc-300">
          <Close />
        </button>
        <button type="submit" disabled={!valid} aria-label="Save set" className="h-12 min-w-12 grid place-items-center rounded-xl bg-emerald-700 text-white active:bg-emerald-800 disabled:bg-zinc-200 disabled:text-zinc-500">
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
  const load = set.band ? <span className="capitalize">{set.band}</span> : `${formatNumber(toDisplay(set.weightKg ?? 0, unit))} ${unit}`;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="h-12 w-full flex items-center gap-3 rounded-xl bg-zinc-100 px-3 text-left active:bg-zinc-100"
    >
      <span className="text-xs text-zinc-500 w-10">Set {index + 1}</span>
      <span className="flex-1 text-base tabular-nums text-zinc-800">
        {load} × {set.reps}
        {perSide && <span className="text-sm text-zinc-600">/{perSide}</span>}
      </span>
      {up && (
        <span className="flex items-center gap-1 text-emerald-700 text-sm font-medium">
          <ArrowUp className="w-5 h-5" />
          <span className="sr-only">Beat last week</span>
        </span>
      )}
    </button>
  );
}
