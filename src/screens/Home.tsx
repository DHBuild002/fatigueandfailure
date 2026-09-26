import { DAYS, TOTAL_WEEKS, exercisesFor, isDeload, type Day } from '../routine';
import { dayKey, distanceToDisplay, distanceUnit, formatNumber, type State } from '../store';
import { DeloadBadge, Screen } from '../components/Screen';
import { Check, ChevronLeft, ChevronRight, Gear } from '../components/Icons';

interface Props {
  state: State;
  week: number;
  current: number;
  onWeek: (week: number) => void;
  onDay: (day: Day) => void;
  onCardio: () => void;
  onSettings: () => void;
}

export function Home({ state, week, current, onWeek, onDay, onCardio, onSettings }: Props) {
  const cardio = state.cardio[week];
  const doneCount = DAYS.filter((d) => state.daysDone[dayKey(week, d.day)]).length;

  const navBtn = 'h-12 min-w-12 grid place-items-center rounded-full text-zinc-700 active:bg-zinc-100 disabled:text-zinc-300';

  return (
    <Screen
      title={
        <span className="flex items-center gap-2">
          Week {week} of {TOTAL_WEEKS} {isDeload(week) && <DeloadBadge />}
        </span>
      }
      subtitle={
        week === current ? (
          `${doneCount} of ${DAYS.length} days done`
        ) : (
          <button type="button" onClick={() => onWeek(current)} className="text-emerald-700 underline underline-offset-2">
            Back to this week (week {current})
          </button>
        )
      }
      right={
        <div className="flex items-center -mr-3">
          <button type="button" className={navBtn} aria-label="Previous week" disabled={week <= 1} onClick={() => onWeek(week - 1)}>
            <ChevronLeft />
          </button>
          <button type="button" className={navBtn} aria-label="Next week" disabled={week >= TOTAL_WEEKS} onClick={() => onWeek(week + 1)}>
            <ChevronRight />
          </button>
          <button type="button" className={navBtn} aria-label="Settings" onClick={onSettings}>
            <Gear />
          </button>
        </div>
      }
    >
      {isDeload(week) && (
        <p className="text-sm text-zinc-600">Deload week: only the B (steady) exercises are shown.</p>
      )}

      <ul className="space-y-3">
        {DAYS.map(({ day, name }) => {
          const done = !!state.daysDone[dayKey(week, day)];
          const exercises = exercisesFor(day, week);
          return (
            <li key={day}>
              <button
                type="button"
                onClick={() => onDay(day)}
                aria-label={`Day ${day}, ${name}${done ? ', done' : ''}`}
                className="w-full rounded-2xl bg-white border border-zinc-200 shadow-sm p-4 space-y-3 text-left active:bg-zinc-100"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-11 w-11 shrink-0 rounded-xl grid place-content-center text-center leading-none ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                  >
                    <span className="block text-[9px] font-medium tracking-widest">DAY</span>
                    <span className="block text-base font-medium tabular-nums">{day}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-lg font-semibold">
                      Day {day} · {name}
                    </span>
                    <span className={`block text-sm ${done ? 'text-emerald-700 font-medium' : 'text-zinc-600'}`}>
                      {done ? 'Done' : `${exercises.length} exercises`}
                    </span>
                  </span>
                  {done ? <Check className="text-emerald-700 shrink-0" /> : <ChevronRight className="text-zinc-500 shrink-0" />}
                </span>
                <span className="block border-t border-zinc-100 pt-3 space-y-1.5">
                  {exercises.map((e) => (
                    <span key={e.id} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span
                        className={`shrink-0 w-6 text-center rounded-full text-xs font-semibold py-0.5 ${e.role === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'}`}
                      >
                        {e.role}
                      </span>
                      <span>{e.name}</span>
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onCardio}
        className="w-full rounded-2xl bg-white border border-zinc-200 shadow-sm p-4 flex items-center gap-4 text-left active:bg-zinc-100"
      >
        <span className="flex-1">
          <span className="block text-lg font-semibold">Weekly cardio</span>
          <span className="block text-sm text-zinc-600">
            {cardio
              ? `${cardio.type} · ${cardio.minutes} min${
                  cardio.distanceKm !== undefined
                    ? ` · ${formatNumber(distanceToDisplay(cardio.distanceKm, state.unit))} ${distanceUnit(state.unit)}`
                    : ''
                }`
              : 'Not logged yet'}
          </span>
        </span>
        {cardio && <Check className="text-emerald-700" />}
        <ChevronRight className="text-zinc-500" />
      </button>
    </Screen>
  );
}
