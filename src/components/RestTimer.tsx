import { useEffect } from 'react';
import { REST_OPTIONS, setRestSeconds, type RestSeconds } from '../store';
import { formatClock, startRest, stopRest, useRest } from '../timer';

// Bottom-bar content for the day screen: [Rest] [Finish day] when idle,
// a countdown with Stop while resting, and a short "Rest over" state after.
export function RestBar({ seconds, finish }: { seconds: RestSeconds; finish: React.ReactNode }) {
  const { remaining, total } = useRest();

  // Clear the "Rest over" state a few seconds after it appears.
  useEffect(() => {
    if (remaining !== 0) return;
    const id = setTimeout(stopRest, 4000);
    return () => clearTimeout(id);
  }, [remaining]);

  if (remaining === null) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => startRest(seconds)}
          className="h-12 flex-[2] min-w-0 rounded-xl border-2 border-red-700 text-red-700 font-semibold text-lg active:bg-red-50"
        >
          Rest {seconds}s
        </button>
        <div className="flex-[3] min-w-0">{finish}</div>
      </div>
    );
  }

  if (remaining === 0) {
    return (
      <button
        type="button"
        onClick={stopRest}
        role="status"
        className="h-12 w-full rounded-xl bg-red-700 text-white font-semibold text-lg animate-pulse"
      >
        Rest over · next set
      </button>
    );
  }

  const pct = ((total - remaining) / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0" role="timer" aria-live="off" aria-label={`Rest, ${remaining} seconds left`}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-600">Resting</span>
          <span className="text-2xl font-semibold tabular-nums text-red-700">{formatClock(remaining)}</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
          <div className="h-full bg-red-700 transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button type="button" onClick={stopRest} className="h-12 px-5 rounded-xl bg-zinc-100 text-zinc-800 font-medium active:bg-zinc-300">
        Stop
      </button>
    </div>
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
