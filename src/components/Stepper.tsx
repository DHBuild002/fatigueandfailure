import { useState } from 'react';
import { formatNumber } from '../store';

function parse(text: string): number | undefined {
  const n = parseFloat(text.replace(',', '.'));
  return text.trim() === '' || Number.isNaN(n) ? undefined : n;
}

interface Props {
  value: number | undefined; // in display units
  step: number;
  label: string;
  onChange: (value: number | undefined) => void;
}

// −/+ steppers around a typed number. Text is kept locally so partial input like "62." survives.
export function Stepper({ value, step, label, onChange }: Props) {
  const [text, setText] = useState(value === undefined ? '' : formatNumber(value));

  // Resync the text only when the value changes from outside (stepper, unit switch),
  // so partial input like "62." isn't overwritten while typing.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (parse(text) !== value) setText(value === undefined ? '' : formatNumber(value));
  }

  // Snap to the step grid, so 61.3 + 2.5 lands on 62.5 rather than 63.8.
  const bump = (dir: 1 | -1) => {
    const n = (value ?? 0) / step;
    const next = dir === 1 ? (Math.floor(n + 1e-9) + 1) * step : (Math.ceil(n - 1e-9) - 1) * step;
    onChange(Math.max(0, next));
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => bump(-1)} aria-label={`Decrease ${label}`} className="h-12 min-w-12 rounded-xl bg-zinc-800 text-2xl active:bg-zinc-700">
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const n = parse(t);
          onChange(n === undefined ? undefined : Math.max(0, n));
        }}
        onFocus={(e) => e.target.select()}
        className="h-12 w-full min-w-0 flex-1 rounded-xl bg-zinc-900 border border-zinc-700 text-2xl text-center focus:outline-none focus:border-emerald-500"
      />
      <button type="button" onClick={() => bump(1)} aria-label={`Increase ${label}`} className="h-12 min-w-12 rounded-xl bg-zinc-800 text-2xl active:bg-zinc-700">
        +
      </button>
    </div>
  );
}
