import type { ReactNode } from 'react';
import { ChevronLeft } from './Icons';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  action?: ReactNode; // primary action, fixed to the bottom
  children: ReactNode;
}

export function Screen({ title, subtitle, onBack, right, action, children }: Props) {
  return (
    <div className="min-h-dvh">
      <header className="max-w-md mx-auto px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back" className="h-12 min-w-12 -ml-3 grid place-items-center rounded-full text-zinc-300 active:bg-zinc-800">
            <ChevronLeft />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{title}</h1>
          {subtitle && <div className="text-sm text-zinc-400">{subtitle}</div>}
        </div>
        {right}
      </header>
      <main className={`max-w-md mx-auto px-5 pt-2 space-y-6 ${action ? 'pb-32' : 'pb-10'}`}>{children}</main>
      {action && (
        <div className="fixed bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-md mx-auto px-5 py-3">{action}</div>
        </div>
      )}
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-12 w-full rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-lg active:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 ${props.className ?? ''}`}
    />
  );
}

export function DeloadBadge() {
  return <span className="rounded-full px-2 text-xs py-0.5 bg-sky-500/15 text-sky-300 font-medium">Deload</span>;
}
