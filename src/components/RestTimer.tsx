import { useEffect, useState } from 'react';
import { REST_OPTIONS, setRestSeconds, type RestSeconds } from '../store';
import { formatClock, startRest, stopRest, useRest } from '../timer';

// Bottom-bar content for the day screen: the Rest button stacked above Finish day.
// While resting, a red fill sweeps across the Rest button from left to right, led by a
// soft radial glow, and reaches the right edge as the countdown hits 0:00.
export function RestBar({ seconds, finish }: { seconds: RestSeconds; finish: React.ReactNode }) {
  const { remaining, total, endsAt } = useRest();

  // Clear the "Rest over" state a few seconds after it appears.
  useEffect(() => {
    if (remaining !== 0) return;
    const id = setTimeout(stopRest, 4000);
    return () => clearTimeout(id);
  }, [remaining]);

  const running = remaining !== null && remaining > 0;
  const over = remaining === 0;
  const label = over ? 'Rest over · next set' : running ? `Resting ${formatClock(remaining)}` : `Rest ${seconds}s`;
  const hint = running ? 'Tap to stop' : null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => (remaining === null ? startRest(seconds) : stopRest())}
        aria-label={running ? `Resting, ${remaining} seconds left. Tap to stop.` : label}
        className="relative h-12 w-full overflow-hidden rounded-xl border-2 border-red-700 bg-white text-red-700 font-semibold text-lg active:bg-red-50"
      >
        <ButtonLabel label={label} hint={hint} />
        {endsAt !== null && (
          // Re-keyed per rest so the sweep restarts from the left each time.
          <RestFill key={endsAt} endsAt={endsAt} total={total} over={over} label={label} hint={hint} />
        )}
      </button>
      {finish}
    </div>
  );
}

function ButtonLabel({ label, hint }: { label: string; hint: string | null }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center gap-2 tabular-nums">
      {label}
      {hint && <span className="text-xs font-medium opacity-80">· {hint}</span>}
    </span>
  );
}

// The filled part of the button: red with white text, revealed left to right by a
// clip-path animation. The animation runs in CSS for the rest's full length and is
// offset by the time already elapsed, so it stays in sync after re-renders or
// returning to the screen mid-rest.
function RestFill({ endsAt, total, over, label, hint }: { endsAt: number; total: number; over: boolean; label: string; hint: string | null }) {
  const [elapsed] = useState(() => Math.min(total, Math.max(0, total - (endsAt - Date.now()) / 1000)));
  const timing = { animationDuration: `${total}s`, animationDelay: `-${elapsed}s` };
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 bg-red-700 text-white ${over ? 'rest-done' : 'rest-reveal'}`}
      style={over ? undefined : timing}
    >
      <ButtonLabel label={label} hint={hint} />
      {!over && <span className="rest-glow" style={timing} />}
    </span>
  );
}

// 30 / 60 / 90 s choice, shared by the day screen and Settings.
export function RestPicker({ value, id }: { value: RestSeconds; id: string }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-labelledby={id}>
      {REST_OPTIONS.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => setRestSeconds(s)}
          className={`h-12 flex-1 rounded-xl text-base tabular-nums ${value === s ? 'bg-red-700 text-white font-semibold' : 'bg-zinc-100 text-zinc-700'}`}
        >
          {s}s
        </button>
      ))}
    </div>
  );
}
