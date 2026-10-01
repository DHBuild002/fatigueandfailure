import { TOTAL_WEEKS, daysFor, exercisesFor, isDeload, programOf, type Day } from '../routine';
import { cardioFor, distanceToDisplay, distanceUnit, formatNumber, isDayDone, type State } from '../store';
import { DeloadBadge, Screen } from '../components/Screen';
import { Check, ChevronLeft, ChevronRight, Cloud, Gear } from '../components/Icons';
import { useAccount } from '../account';
import { SYNC_LABEL, useSyncStatus } from '../sync';
import { StatusDot } from '../components/SyncBadge';
import { TestModeBar } from '../components/TestModeBar';

interface Props {
  state: State;
  week: number;
  current: number;
  onWeek: (week: number) => void;
  onDay: (day: Day) => void;
  onSettings: () => void;
}

export function Home({ state, week, current, onWeek, onDay, onSettings }: Props) {
  const days = daysFor(state.program);
  const cardioSummary = (day: Day) => {
    const cardio = cardioFor(state, week, day);
    if (!cardio) return 'Not logged yet';
    const distance = cardio.distanceKm !== undefined ? ` · ${formatNumber(distanceToDisplay(cardio.distanceKm, state.unit))} ${distanceUnit(state.unit)}` : '';
    return `${cardio.type} · ${cardio.minutes} min${distance}`;
  };
  const doneCount = days.filter((d) => isDayDone(state, week, d.day)).length;

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
          `${programOf(state.program).name} · ${doneCount} of ${days.length} days done`
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
          <SyncButton className={navBtn} onClick={onSettings} />
          <button type="button" className={navBtn} aria-label="Settings" onClick={onSettings}>
            <Gear />
          </button>
        </div>
      }
    >
      <SignedInTestBar />
      {isDeload(week) && (
        <p className="text-sm text-zinc-600">Deload week: only the B (steady) exercises are shown.</p>
      )}

      <ul className="space-y-3">
        {days.map(({ day, name, kind }) => {
          const done = isDayDone(state, week, day);
          const exercises = exercisesFor(day, week, state.program);
          const cardioDay = kind === 'cardio';
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
                      {done ? 'Done' : cardioDay ? 'Log your cardio' : `${exercises.length} exercises`}
                    </span>
                  </span>
                  {done ? <Check className="text-red-700 shrink-0" /> : <ChevronRight className="text-zinc-500 shrink-0" />}
                </span>
                <span className="block border-t border-zinc-100 pt-3 space-y-1.5">
                  {cardioDay && <span className="block text-sm text-zinc-700">{cardioSummary(day)}</span>}
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

function SignedInTestBar() {
  const account = useAccount();
  return account.status === 'signed-in' ? <TestModeBar email={account.user.email} /> : null;
}

// Cloud icon with a status dot, only when signed in. Tapping it opens Settings → Account.
function SyncButton({ className, onClick }: { className: string; onClick: () => void }) {
  const account = useAccount();
  const { phase } = useSyncStatus();
  if (account.status !== 'signed-in') return null;
  return (
    <button type="button" className={`relative ${className}`} aria-label={`Account: ${SYNC_LABEL[phase]}`} onClick={onClick}>
      <Cloud />
      <StatusDot phase={phase} className="absolute right-2.5 bottom-3" />
    </button>
  );
}
