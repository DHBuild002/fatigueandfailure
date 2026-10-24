import { useEffect } from 'react';
import { dayName, daysFor, isDeload, type Day } from '../routine';
import { dayKey, isDayDone, logKey, saveTravelPicks, setDayDone, type State } from '../store';
import { dayExercises, pickTravel, travelSeed } from '../travel';
import { DeloadBadge, PrimaryButton, Screen } from '../components/Screen';
import { ExerciseCard } from '../components/ExerciseCard';
import { RestBar, RestPicker } from '../components/RestTimer';

interface Props {
  state: State;
  week: number;
  day: Day;
  onBack: () => void;
  onFinished: () => void; // the day was just finished (not re-opened)
  onProgress: (exerciseId: string) => void;
}

export function Session({ state, week, day, onBack, onFinished, onProgress }: Props) {
  const done = isDayDone(state, week, day);
  const key = dayKey(week, day, state.program);
  const exercises = dayExercises(state, day, week, key);
  const focus = daysFor(state.program).find((d) => d.day === day)?.focus;
  const travelDay = state.travel && !!focus;
  const logged = exercises.some((e) => (state.logs[logKey(week, e.id)]?.length ?? 0) > 0);

  // Once a set is logged on a travel day, keep that week's picks so the logs stay with them
  // (even if the kit changes later).
  useEffect(() => {
    if (travelDay && logged && !state.travelPicks[key]) saveTravelPicks(key, exercises.map((e) => e.id));
  }, [travelDay, logged, key, exercises, state.travelPicks]);

  const shuffle = () => {
    if (!focus) return;
    const current = exercises.map((e) => e.id).join();
    // A few tries, so a shuffle almost always shows something new.
    for (let i = 0; i < 8; i++) {
      const next = pickTravel(focus, state.kit, travelSeed(week, day, state.program, state.kit, `${Date.now()}:${i}`));
      if (next.join() !== current || i === 7) return saveTravelPicks(key, next);
    }
  };

  return (
    <Screen
      title={`Day ${day} · ${dayName(day, state.program)}`}
      subtitle={
        <span className="flex items-center gap-2">
          Week {week} {isDeload(week) && <DeloadBadge />}
        </span>
      }
      onBack={onBack}
      action={
        <RestBar
          seconds={state.restSeconds}
          finish={
            <PrimaryButton
              onClick={() => {
                setDayDone(week, day, true);
                if (done) onBack();
                else onFinished();
              }}
            >
              {done ? 'Done · home' : 'Finish day'}
            </PrimaryButton>
          }
        />
      }
    >
      {travelDay && (
        <section className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3" aria-label="Travel mode">
          <p className="flex-1 text-sm text-amber-950">
            <strong className="font-semibold">Travel mode.</strong> Two picks for your kit: one with equipment (or a cardio finisher), one bodyweight.
          </p>
          <button
            type="button"
            onClick={shuffle}
            disabled={logged}
            className="h-11 shrink-0 rounded-lg border border-amber-400 bg-white px-3 text-sm font-medium text-amber-950 active:bg-amber-100 disabled:opacity-50"
          >
            Shuffle
          </button>
        </section>
      )}

      <p className="text-sm text-zinc-600">
        {travelDay
          ? isDeload(week)
            ? 'Deload week: 3 easy sets of 12 each.'
            : 'Alternate the two. Take each set to failure; rest 60–90 s.'
          : isDeload(week)
          ? 'Deload week: B exercises only. 2–3 rounds.'
          : 'Superset A then B. Rest 90–120 s between rounds, 2–3 rounds.'}
      </p>

      <section className="space-y-2" aria-label="Rest timer">
        <div className="flex items-baseline justify-between">
          <h2 id="rest-label" className="text-sm font-medium text-zinc-700">
            Rest between sets
          </h2>
          <span className="text-xs text-zinc-500">{state.autoRest ? 'Starts after each set' : 'Tap Rest to start'}</span>
        </div>
        <RestPicker value={state.restSeconds} id="rest-label" />
      </section>

      {exercises.map((e) => (
        <ExerciseCard key={e.id} exercise={e} week={week} state={state} onProgress={() => onProgress(e.id)} />
      ))}

      {done && (
        <button type="button" onClick={() => setDayDone(week, day, false)} className="h-12 w-full text-sm text-zinc-600 underline underline-offset-2">
          Mark day as not done
        </button>
      )}
    </Screen>
  );
}
