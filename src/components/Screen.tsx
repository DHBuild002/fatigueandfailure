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
          <button type="button" onClick={onBack} aria-label="Back" className="h-12 min-w-12 -ml-3 grid place-items-center rounded-full text-zinc-700 active:bg-zinc-100">
            <ChevronLeft />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{title}</h1>
          {subtitle && <div className="text-sm text-zinc-600">{subtitle}</div>}
        </div>
        {right}
      </header>
      <main className={`max-w-md mx-auto px-5 pt-2 space-y-6 ${action ? 'pb-[calc(8rem+var(--host-badge-offset))]' : 'pb-10'}`}>{children}</main>
      {action && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-zinc-200 pb-[calc(env(safe-area-inset-bottom)+var(--host-badge-offset))]">
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
      className={`h-12 w-full rounded-xl bg-red-700 text-white font-semibold text-lg active:bg-red-800 disabled:bg-zinc-200 disabled:text-zinc-500 ${props.className ?? ''}`}
    />
  );
}

export function DeloadBadge() {
  return <span className="rounded-full px-2 text-xs py-0.5 bg-sky-100 text-sky-800 font-medium">Deload</span>;
}
