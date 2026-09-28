import { dayName, exercisesFor, isDeload, type Day } from '../routine';
import { isDayDone, setDayDone, type State } from '../store';
import { DeloadBadge, PrimaryButton, Screen } from '../components/Screen';
import { ExerciseCard } from '../components/ExerciseCard';
import { RestBar, RestPicker } from '../components/RestTimer';

interface Props {
  state: State;
  week: number;
  day: Day;
  onBack: () => void;
}

export function Session({ state, week, day, onBack }: Props) {
  const done = isDayDone(state, week, day);
  const exercises = exercisesFor(day, week, state.program);

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
                onBack();
              }}
            >
              {done ? 'Done · home' : 'Finish day'}
            </PrimaryButton>
          }
        />
      }
    >
      <p className="text-sm text-zinc-600">
        {isDeload(week)
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
        <ExerciseCard key={e.id} exercise={e} week={week} state={state} />
      ))}

      {done && (
        <button type="button" onClick={() => setDayDone(week, day, false)} className="h-12 w-full text-sm text-zinc-600 underline underline-offset-2">
          Mark day as not done
        </button>
      )}
    </Screen>
  );
}
