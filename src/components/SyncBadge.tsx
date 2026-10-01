import type { SyncPhase } from '../sync';

// Coloured dot for the sync state, shared by the Home header and Settings.
const SYNC_DOT: Record<SyncPhase, string> = {
  synced: 'bg-green-600',
  syncing: 'bg-amber-500',
  offline: 'bg-amber-500',
  error: 'bg-red-600',
};

export function StatusDot({ phase, className = '' }: { phase: SyncPhase; className?: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white ${SYNC_DOT[phase]} ${className}`} aria-hidden="true" />;
}
