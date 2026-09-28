import { DAYS, TOTAL_WEEKS, exercisesFor, isDeload, type Day } from '../routine';
import { distanceToDisplay, distanceUnit, formatNumber, isDayDone, type State } from '../store';
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
  const cardioSummary = cardio
    ? `${cardio.type} · ${cardio.minutes} min${
        cardio.distanceKm !== undefined ? ` · ${formatNumber(distanceToDisplay(cardio.distanceKm, state.unit))} ${distanceUnit(state.unit)}` : ''
      }`
    : null;
  const doneCount = DAYS.filter((d) => isDayDone(state, week, d.day)).length;

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
          <button type="button" onClick={() => onWeek(current)} className="text-red-700 underline underline-offset-2">
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
        {DAYS.map(({ day, name, kind }) => {
          const done = isDayDone(state, week, day);
          const exercises = exercisesFor(day, week);
          const cardioDay = kind === 'cardio';
          return (
            <li key={day}>
              <button
                type="button"
                onClick={() => (cardioDay ? onCardio() : onDay(day))}
                aria-label={`Day ${day}, ${name}${done ? ', done' : ''}`}
                className="w-full rounded-2xl bg-white border border-zinc-200 shadow-sm p-4 space-y-3 text-left active:bg-zinc-100"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-11 w-11 shrink-0 rounded-xl grid place-content-center text-center leading-none ${done ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                  >
                    <span className="block text-[9px] font-medium tracking-widest">DAY</span>
                    <span className="block text-base font-medium tabular-nums">{day}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-lg font-semibold">
                      Day {day} · {name}
                    </span>
                    <span className={`block text-sm ${done ? 'text-red-700 font-medium' : 'text-zinc-600'}`}>
                      {done ? 'Done' : cardioDay ? 'Log this week\'s cardio' : `${exercises.length} exercises`}
                    </span>
                  </span>
                  {done ? <Check className="text-red-700 shrink-0" /> : <ChevronRight className="text-zinc-500 shrink-0" />}
                </span>
                <span className="block border-t border-zinc-100 pt-3 space-y-1.5">
                  {cardioDay && <span className="block text-sm text-zinc-700">{cardioSummary ?? 'Not logged yet'}</span>}
                  {exercises.map((e) => (
                    <span key={e.id} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span
                        className={`shrink-0 w-6 text-center rounded-full text-xs font-semibold py-0.5 ${e.role === 'A' ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-700'}`}
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

    </Screen>
  );
}
