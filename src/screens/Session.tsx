import { dayName, exercisesFor, isDeload, type Day } from '../routine';
import { dayKey, setDayDone, type State } from '../store';
import { DeloadBadge, PrimaryButton, Screen } from '../components/Screen';
import { ExerciseCard } from '../components/ExerciseCard';

interface Props {
  state: State;
  week: number;
  day: Day;
  onBack: () => void;
}

export function Session({ state, week, day, onBack }: Props) {
  const done = !!state.daysDone[dayKey(week, day)];
  const exercises = exercisesFor(day, week);

  return (
    <Screen
      title={`Day ${day} · ${dayName(day)}`}
      subtitle={
        <span className="flex items-center gap-2">
          Week {week} {isDeload(week) && <DeloadBadge />}
        </span>
      }
      onBack={onBack}
      action={
        <PrimaryButton
          onClick={() => {
            setDayDone(week, day, true);
            onBack();
          }}
        >
          {done ? 'Done · back to home' : 'Finish day'}
        </PrimaryButton>
      }
    >
      <p className="text-sm text-zinc-400">
        {isDeload(week)
          ? 'Deload week: B exercises only. 2–3 rounds.'
          : 'Superset A then B. Rest 90–120 s between rounds, 2–3 rounds.'}
      </p>

      {exercises.map((e) => (
        <ExerciseCard key={e.id} exercise={e} week={week} state={state} />
      ))}

      {done && (
        <button type="button" onClick={() => setDayDone(week, day, false)} className="h-12 w-full text-sm text-zinc-400 underline underline-offset-2">
          Mark day as not done
        </button>
      )}
    </Screen>
  );
}
