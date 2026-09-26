import { EFFORTS, effortLabel, type Effort } from '../store';

// Lighter shades for the saved-set label, stronger ones for the selected picker button.
const PILL: Record<Effort, string> = {
  1: 'bg-zinc-200 text-zinc-800',
  2: 'bg-amber-100 text-amber-900',
  3: 'bg-orange-100 text-orange-900',
  4: 'bg-red-100 text-red-900',
};
const SELECTED: Record<Effort, string> = {
  1: 'bg-zinc-700 text-white',
  2: 'bg-amber-500 text-zinc-950',
  3: 'bg-orange-700 text-white',
  4: 'bg-red-800 text-white',
};

export function EffortPill({ effort }: { effort?: Effort }) {
  if (!effort) return null;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL[effort]}`}>{effortLabel(effort)}</span>;
}

// Optional: tap a level to set it, tap it again to clear.
export function EffortPicker({ value, onChange }: { value?: Effort; onChange: (e?: Effort) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Intensity">
      {EFFORTS.map((e) => (
        <button
          key={e.value}
          type="button"
          role="radio"
          aria-checked={value === e.value}
          onClick={() => onChange(value === e.value ? undefined : e.value)}
          className={`h-12 flex-1 min-w-0 rounded-xl text-sm font-medium ${value === e.value ? SELECTED[e.value] : 'bg-white border border-zinc-300 text-zinc-700'}`}
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}
