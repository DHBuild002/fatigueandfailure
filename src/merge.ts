import { emptyState, type SetLog, type State } from './store';

export const stamp = (iso: string) => (iso ? Date.parse(iso) || 0 : 0);

// Combine two copies of a user's data that were both changed since they last synced
// (e.g. first sign-in on a phone that already had logs). Nothing logged on either side
// is dropped:
// - sets are unioned per week/exercise, matched by the time they were logged
// - a day is done if either copy says so
// - cardio entries are unioned per week (the newer copy wins a clash)
// - settings (start date, units, rest timer) come from the newer copy
// The trade-off: a set deleted on one side comes back if the other side still has it.
export function mergeStates(a: State, b: State): State {
  const [newer, older] = stamp(a.updatedAt) >= stamp(b.updatedAt) ? [a, b] : [b, a];

  const logs: Record<string, SetLog[]> = {};
  for (const key of new Set([...Object.keys(older.logs), ...Object.keys(newer.logs)])) {
    const byTime = new Map<string, SetLog>();
    for (const set of older.logs[key] ?? []) byTime.set(set.at, set);
    for (const set of newer.logs[key] ?? []) byTime.set(set.at, set);
    const sets = [...byTime.values()].sort((x, y) => x.at.localeCompare(y.at));
    if (sets.length) logs[key] = sets;
  }

  const daysDone: Record<string, boolean> = {};
  for (const key of new Set([...Object.keys(older.daysDone), ...Object.keys(newer.daysDone)])) {
    if (older.daysDone[key] || newer.daysDone[key]) daysDone[key] = true;
  }

  return {
    ...emptyState(),
    ...older,
    ...newer,
    startDate: newer.startDate || older.startDate,
    logs,
    daysDone,
    cardio: { ...older.cardio, ...newer.cardio },
    updatedAt: new Date(Math.max(stamp(a.updatedAt), stamp(b.updatedAt), Date.now())).toISOString(),
  };
}

export type Resolution = 'none' | 'push' | 'take-remote' | 'merge';

// Decide what to do after fetching the cloud copy.
// lastSynced is the updatedAt both sides agreed on at the last successful sync ('' = never on this device).
export function resolve(local: State, remote: State | null, lastSynced: string): Resolution {
  const hasContent = local.startDate !== '' || Object.keys(local.logs).length > 0;
  if (!remote) return hasContent || local.updatedAt !== '' ? 'push' : 'none';

  const l = stamp(local.updatedAt);
  const r = stamp(remote.updatedAt);
  if (l === r) return 'none';

  // Never synced on this device but it already has data (e.g. logs from before accounts
  // existed, which carry no timestamp): always merge, so nothing on either side is lost.
  if (!lastSynced && hasContent) return 'merge';

  const synced = stamp(lastSynced);
  const localChanged = l > synced;
  const remoteChanged = r > synced;
  if (localChanged && remoteChanged) return 'merge'; // includes first sign-in with data on both sides
  if (remoteChanged) return 'take-remote';
  return 'push';
}
