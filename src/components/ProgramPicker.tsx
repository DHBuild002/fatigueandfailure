import { PROGRAM_LIST, type ProgramId } from '../routine';
import { Check } from './Icons';

interface Props {
  value: ProgramId;
  onChange: (program: ProgramId) => void;
  labelledBy: string;
}

// One card per routine: name, a one-line description and its days.
export function ProgramPicker({ value, onChange, labelledBy }: Props) {
  return (
    <div className="space-y-2" role="radiogroup" aria-labelledby={labelledBy}>
      {PROGRAM_LIST.map((p) => {
        const selected = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={p.name}
            onClick={() => onChange(p.id)}
            className={`w-full rounded-xl border p-3 text-left flex items-start gap-3 ${
              selected ? 'border-red-700 bg-red-50' : 'border-zinc-200 bg-white active:bg-zinc-100'
            }`}
          >
            <span className="flex-1 min-w-0 space-y-0.5">
              <span className="block font-semibold">{p.name}</span>
              <span className="block text-sm text-zinc-700">{p.blurb}</span>
              <span className="block text-xs text-zinc-500">{p.days.map((d) => d.name).join(' · ')}</span>
            </span>
            <span
              className={`mt-0.5 h-6 w-6 shrink-0 rounded-full grid place-items-center border ${
                selected ? 'bg-red-700 border-red-700 text-white' : 'border-zinc-300'
              }`}
            >
              {selected && <Check className="h-4 w-4" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
