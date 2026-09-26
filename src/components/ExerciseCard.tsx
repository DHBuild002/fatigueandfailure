import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Exercise } from '../routine';
import { addSet, formatSets, logKey, previous, removeSet, topBand, topWeightKg, updateSet, type SetLog, type State } from '../store';
import { SetEditor, SetRow } from './SetRow';

interface Props {
  exercise: Exercise;
  week: number;
  state: State;
}

export function ExerciseCard({ exercise, week, state }: Props) {
  const sets = state.logs[logKey(week, exercise.id)] ?? [];
  const prev = previous(state.logs, week, exercise.id);
  const [draft, setDraft] = useState<Partial<SetLog> | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const repsRef = useRef<HTMLInputElement>(null);

  const startDraft = () => {
    // Pre-fill from last week's top set; fall back to the last set logged this session.
    const last = sets[sets.length - 1];
    const initial: Partial<SetLog> =
      exercise.load === 'band'
        ? { band: (prev && topBand(prev.sets)) ?? last?.band }
        : { weightKg: (prev && topWeightKg(prev.sets)) ?? last?.weightKg };
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
    <section className="rounded-2xl bg-zinc-900 p-4 space-y-3" aria-labelledby={`ex-${exercise.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 id={`ex-${exercise.id}`} className="text-lg font-semibold leading-snug">
            {exercise.name}
          </h2>
          <p className="text-sm text-zinc-300">{exercise.prescription}</p>
        </div>
        <span
          className={`rounded-full px-2 text-xs py-0.5 font-medium shrink-0 ${isA ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-300'}`}
        >
          {isA ? 'A · Failure' : 'B · Steady'}
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        {prev ? (
          <>
            Last{prev.week !== week - 1 && ` (week ${prev.week})`}: {formatSets(prev.sets, state.unit)}
            {exercise.perLeg && ' per leg'}
          </>
        ) : (
          'No previous data'
        )}
      </p>

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
          className="h-12 w-full rounded-xl border border-dashed border-zinc-700 text-zinc-200 font-medium active:bg-zinc-800"
        >
          + Add set
        </button>
      )}
    </section>
  );
}
