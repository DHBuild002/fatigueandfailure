import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { isDeload, type Exercise } from '../routine';
import {
  addSet,
  bestSet,
  formatNumber,
  toDisplay,
  formatSets,
  logKey,
  nextTarget,
  previous,
  removeSet,
  updateSet,
  weightStep,
  type SetLog,
  type State,
  type Target,
  type Unit,
} from '../store';
import { SetEditor, SetRow } from './SetRow';

interface Props {
  exercise: Exercise;
  week: number;
  state: State;
}

export function ExerciseCard({ exercise, week, state }: Props) {
  const sets = state.logs[logKey(week, exercise.id)] ?? [];
  const prev = previous(state.logs, week, exercise.id);
  const best = prev && bestSet(prev.sets, state.unit);
  const target = nextTarget(exercise, prev, week, state.unit);
  const [draft, setDraft] = useState<Partial<SetLog> | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const repsRef = useRef<HTMLInputElement>(null);

  const startDraft = () => {
    // Pre-fill with the target load; with no history, fall back to the last set logged this session.
    const last = sets[sets.length - 1];
    const initial: Partial<SetLog> =
      exercise.load === 'band' ? { band: target?.band ?? last?.band } : { weightKg: target?.weightKg ?? last?.weightKg };
    // Render synchronously so focusing the reps field stays inside the tap gesture
    // (iOS only opens the keypad for focus() calls made during a user gesture).
    flushSync(() => {
      setEditing(null);
      setDraft(initial);
    });
    repsRef.current?.focus();
  };

  const isA = exercise.role === 'A';

  return (
    <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-4 space-y-3" aria-labelledby={`ex-${exercise.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 id={`ex-${exercise.id}`} className="text-lg font-semibold leading-snug">
            {exercise.name}
          </h2>
          <p className="text-sm text-zinc-700">{exercise.prescription}</p>
        </div>
        <span
          className={`rounded-full px-2 text-xs py-0.5 font-medium shrink-0 ${isA ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'}`}
        >
          {isA ? 'A · Failure' : 'B · Steady'}
        </span>
      </div>

      {best && target ? (
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Last best</dt>
            <dd className="text-base font-semibold tabular-nums">
              <StatValue set={best} unit={state.unit} perLeg={exercise.perLeg} />
            </dd>
            <dd className="text-xs text-zinc-500">Week {prev!.week}</dd>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-emerald-800">Target</dt>
            <dd className="text-base font-semibold tabular-nums text-emerald-900">
              <StatValue set={target} unit={state.unit} perLeg={exercise.perLeg} />
            </dd>
            <dd className="text-xs text-emerald-800">{targetNote(exercise, target, week, state.unit)}</dd>
          </div>
        </dl>
      ) : (
        <p className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-sm text-zinc-600">
          No previous data. Today's sets set the baseline for next week.
        </p>
      )}

      {prev && (
        <p className="text-sm text-zinc-600">
          Last{prev.week !== week - 1 && ` (week ${prev.week})`}: {formatSets(prev.sets, state.unit)}
          {exercise.perLeg && ' per leg'}
        </p>
      )}

      {sets.length > 0 && (
        <ul className="space-y-2">
          {sets.map((s, i) => (
            <li key={s.at + i}>
              {editing === i ? (
                <SetEditor
                  index={i}
                  exercise={exercise}
                  unit={state.unit}
                  initial={s}
                  onSave={(set) => {
                    updateSet(week, exercise.id, i, set);
                    setEditing(null);
                  }}
                  onDiscard={() => {
                    removeSet(week, exercise.id, i);
                    setEditing(null);
                  }}
                  discardLabel="Delete set"
                />
              ) : (
                <SetRow
                  index={i}
                  set={s}
                  prev={prev?.sets[i]}
                  unit={state.unit}
                  perLeg={exercise.perLeg}
                  onEdit={() => {
                    setDraft(null);
                    setEditing(i);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <SetEditor
          index={sets.length}
          exercise={exercise}
          unit={state.unit}
          initial={draft}
          repsRef={repsRef}
          onSave={(set) => {
            addSet(week, exercise.id, set);
            setDraft(null);
          }}
          onDiscard={() => setDraft(null)}
          discardLabel="Cancel set"
        />
      ) : (
        <button
          type="button"
          onClick={startDraft}
          className="h-12 w-full rounded-xl border border-dashed border-zinc-300 text-zinc-800 font-medium active:bg-zinc-100"
        >
          + Add set
        </button>
      )}
    </section>
  );
}

function targetNote(ex: Exercise, t: Target, week: number, unit: Unit): string {
  if (isDeload(week)) return 'Deload: hold the load';
  if (ex.role === 'A' || !ex.scheme) return 'Same load, one more rep';
  if (t.progressed) return ex.load === 'band' ? 'Every set hit: next band' : `Every set hit: +${weightStep(unit)} ${unit}`;
  if (t.reps > ex.scheme.reps) return 'Heaviest band: one more rep';
  return `Hit ${ex.scheme.sets}×${ex.scheme.reps}, then go up`;
}

// "60 kg × 12/leg", breaking only between the load and the reps on narrow screens.
function StatValue({ set, unit, perLeg }: { set: Pick<SetLog, 'weightKg' | 'band' | 'reps'>; unit: Unit; perLeg?: boolean }) {
  const load = set.band ?? `${formatNumber(toDisplay(set.weightKg ?? 0, unit))} ${unit}`;
  return (
    <>
      <span className="whitespace-nowrap capitalize">{load}</span>{' '}
      <span className="whitespace-nowrap">
        × {set.reps}
        {perLeg && <span className="text-sm font-normal opacity-70">/leg</span>}
      </span>
    </>
  );
}
