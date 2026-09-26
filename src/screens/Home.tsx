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

  const navBtn = 'h-12 min-w-12 grid place-items-center rounded-full text-zinc-300 active:bg-zinc-800 disabled:text-zinc-700';

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
          <button type="button" onClick={() => onWeek(current)} className="text-emerald-400 underline underline-offset-2">
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
        <p className="text-sm text-zinc-400">Deload week: only the B (steady) exercises are shown.</p>
      )}

      <ul className="space-y-3">
        {DAYS.map(({ day, name }) => {
          const done = !!state.daysDone[dayKey(week, day)];
          return (
            <li key={day}>
              <button
                type="button"
                onClick={() => onDay(day)}
                className="w-full min-h-12 rounded-2xl bg-zinc-900 p-4 flex items-center gap-4 text-left active:bg-zinc-800"
              >
                <span
                  className={`h-12 w-12 shrink-0 rounded-full grid place-items-center font-semibold ${done ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  {done ? <Check /> : day}
                  <span className="sr-only">{done ? `Day ${day}, done` : `Day ${day}, not done`}</span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-lg font-semibold">{name}</span>
                  <span className="block text-sm text-zinc-400 truncate">
                    {exercisesFor(day, week)
                      .map((e) => e.name)
                      .join(' · ')}
                  </span>
                </span>
                <ChevronRight className="text-zinc-500 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onCardio}
        className="w-full rounded-2xl bg-zinc-900 p-4 flex items-center gap-4 text-left active:bg-zinc-800"
      >
        <span className="flex-1">
          <span className="block text-lg font-semibold">Weekly cardio</span>
          <span className="block text-sm text-zinc-400">
            {cardio
              ? `${cardio.type} · ${cardio.minutes} min${
                  cardio.distanceKm !== undefined
                    ? ` · ${formatNumber(distanceToDisplay(cardio.distanceKm, state.unit))} ${distanceUnit(state.unit)}`
                    : ''
                }`
              : 'Not logged yet'}
          </span>
        </span>
        {cardio && <Check className="text-emerald-400" />}
        <ChevronRight className="text-zinc-500" />
      </button>
    </Screen>
  );
}
