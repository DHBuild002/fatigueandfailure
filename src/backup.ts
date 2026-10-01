import { PROGRAMS, type ProgramId } from './routine';
import { emptyState, migrateState, type State } from './store';

export type ParsedBackup = { ok: true; state: State; sets: number } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const validSet = (s: unknown) =>
  isObject(s) &&
  typeof s.reps === 'number' &&
  typeof s.at === 'string' &&
  (s.weightKg === undefined || typeof s.weightKg === 'number') &&
  (s.band === undefined || typeof s.band === 'string');

const validCardio = (c: unknown) =>
  isObject(c) && typeof c.type === 'string' && typeof c.minutes === 'number' && (c.distanceKm === undefined || typeof c.distanceKm === 'number');

// Read an Export JSON file back in. Anything that doesn't look like an Overload backup is
// rejected as a whole, so a wrong file can never half-overwrite the current data.
// Backups from older versions are migrated the same way saved data is on load. The sync
// timestamp is not restored: importing is a new local change, so it's uploaded to the account.
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  const notBackup = { ok: false as const, error: "This doesn't look like an Overload backup. Use a file made with Export JSON." };
  if (!isObject(raw) || typeof raw.startDate !== 'string' || !isObject(raw.logs)) return notBackup;

  const logs = raw.logs;
  if (!Object.values(logs).every((sets) => Array.isArray(sets) && sets.every(validSet))) return notBackup;
  if (raw.daysDone !== undefined && !(isObject(raw.daysDone) && Object.values(raw.daysDone).every((d) => typeof d === 'boolean'))) return notBackup;
  if (raw.cardio !== undefined && !(isObject(raw.cardio) && Object.values(raw.cardio).every(validCardio))) return notBackup;
  if (raw.unit !== undefined && raw.unit !== 'kg' && raw.unit !== 'lb') return notBackup;
  if (raw.program !== undefined && !(typeof raw.program === 'string' && raw.program in PROGRAMS)) return notBackup;

  const base = emptyState();
  const state = migrateState({
    ...base,
    // No routineVersion means the original (v1) day order, as on load.
    routineVersion: typeof raw.routineVersion === 'number' ? raw.routineVersion : 1,
    startDate: raw.startDate,
    unit: (raw.unit as State['unit']) ?? base.unit,
    program: (raw.program as ProgramId) ?? base.program,
    logs: logs as State['logs'],
    daysDone: (raw.daysDone as State['daysDone']) ?? {},
    cardio: (raw.cardio as State['cardio']) ?? {},
    restSeconds: raw.restSeconds === 30 || raw.restSeconds === 60 || raw.restSeconds === 90 ? raw.restSeconds : base.restSeconds,
    autoRest: typeof raw.autoRest === 'boolean' ? raw.autoRest : base.autoRest,
  });
  const sets = Object.values(state.logs).reduce((n, s) => n + s.length, 0);
  return { ok: true, state, sets };
}
