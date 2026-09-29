import { useSyncExternalStore } from 'react';
import { DEFAULT_PROGRAM, TOTAL_WEEKS, isCardioDay, isDeload, type Day, type Exercise, type ProgramId } from './routine';

export type Unit = 'kg' | 'lb';
export type Band = 'light' | 'medium' | 'heavy';
export const BANDS: Band[] = ['light', 'medium', 'heavy'];

// How hard a set felt, 1 (easy) to 4 (max effort).
export type Effort = 1 | 2 | 3 | 4;
export const EFFORTS: { value: Effort; label: string }[] = [
  { value: 1, label: 'Easy' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Hard' },
  { value: 4, label: 'Max' },
];
export const effortLabel = (e?: Effort) => EFFORTS.find((x) => x.value === e)?.label;

export interface SetLog {
  weightKg?: number;
  band?: Band;
  reps: number;
  effort?: Effort;
  at: string;
}

export interface Cardio {
  type: string;
  minutes: number;
  distanceKm?: number;
}

export interface State {
  startDate: string; // ISO date (YYYY-MM-DD) of week 1, day 1. Empty until first launch is done.
  unit: Unit;
  logs: Record<string, SetLog[]>; // key: `${week}:${exerciseId}`
  program: ProgramId; // the routine this person follows
  daysDone: Record<string, boolean>; // key: dayKey(week, day, program)
  cardio: Record<string, Cardio>; // key: dayKey(week, day, program) of a cardio day
  restSeconds: RestSeconds; // rest timer length
  autoRest: boolean; // start the rest timer automatically after each logged set
  updatedAt: string; // ISO time of the last local change ('' = never), used to sync with the cloud
  routineVersion: number; // day numbering in daysDone (see migrateState)
}

// 1: Glutes, Legs, Arms, Chest, Back. 2: Legs, Arms, Chest, Back, Cardio.
// 3: cardio keyed per day (dayKey) instead of per week, for routines with several cardio days.
export const ROUTINE_VERSION = 3;

export type RestSeconds = 30 | 60 | 90;
export const REST_OPTIONS: RestSeconds[] = [30, 60, 90];

export const STORAGE_KEY = 'overload:v1';
export const KG_PER_LB = 1 / 2.20462;

export const emptyState = (): State => ({
  startDate: '',
  unit: 'kg',
  program: DEFAULT_PROGRAM,
  logs: {},
  daysDone: {},
  cardio: {},
  restSeconds: 60,
  autoRest: false,
  updatedAt: '',
  routineVersion: ROUTINE_VERSION,
});

// Bring saved data up to the current format, one version at a time. Idempotent.
// v1 → v2: Glutes (1) and Legs (2) merge into Legs (1); Arms, Chest and Back move from
//   days 3–5 to 2–4. Day 5 is now cardio, whose done state comes from the cardio log.
// v2 → v3: the weekly cardio entry becomes Day 5's entry (all v2 data is the Overload routine).
export function migrateState(s: State): State {
  const version = s.routineVersion ?? 1;
  if (version >= ROUTINE_VERSION) return s;
  let next = s;
  if (version < 2) {
    const toV2: Record<string, number> = { '1': 1, '2': 1, '3': 2, '4': 3, '5': 4 };
    const daysDone: Record<string, boolean> = {};
    for (const [key, done] of Object.entries(next.daysDone)) {
      const [week, day] = key.split(':');
      const moved = toV2[day];
      if (done && moved) daysDone[`${week}:${moved}`] = true;
    }
    next = { ...next, daysDone };
  }
  if (version < 3) {
    const cardio: Record<string, Cardio> = {};
    for (const [key, entry] of Object.entries(next.cardio)) cardio[key.includes(':') ? key : `${key}:5`] = entry;
    next = { ...next, cardio };
  }
  return { ...next, routineVersion: ROUTINE_VERSION };
}

// Fill in fields added since the data was saved, then migrate it. Used for both
// localStorage and cloud copies. No routineVersion means the original (v1) day order.
export const fromSaved = (saved: Partial<State>): State =>
  migrateState({ ...emptyState(), routineVersion: 1, ...saved });

// ---------- persistence ----------

// Local-only mode uses one key. Signed in, each user gets their own slot so two
// people sharing a phone never see each other's data.
export const userStorageKey = (userId: string) => `${STORAGE_KEY}:${userId}`;
let storageKey = STORAGE_KEY;

export function load(key = storageKey): State {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyState();
    return fromSaved(JSON.parse(raw) as Partial<State>);
  } catch {
    return emptyState();
  }
}

function save(s: State) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the in-memory state still works for this session.
  }
}

let state: State = load(); // load() falls back to empty state if storage is missing or blocked
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getState() {
  return state;
}

// Every local change is stamped so sync can tell which copy is newer.
export function setState(update: (s: State) => State) {
  state = { ...update(state), updatedAt: new Date().toISOString() };
  save(state);
  notify();
}

// Replace the whole state as-is (keeping its updatedAt), e.g. with a copy pulled from the cloud.
export function replaceState(next: State) {
  state = fromSaved(next);
  save(state);
  notify();
}

export function resetState() {
  setState(() => emptyState());
}

export const hasData = (s: State) => s.startDate !== '' || Object.keys(s.logs).length > 0;

// Point the store at a user's slot (or back to local-only with null). The first time a
// user signs in on a device, data logged before accounts existed moves into their slot
// and the anonymous copy is removed, so it's only ever adopted once.
export function switchUser(userId: string | null) {
  storageKey = userId ? userStorageKey(userId) : STORAGE_KEY;
  if (userId) {
    try {
      const anon = localStorage.getItem(STORAGE_KEY);
      if (anon !== null) {
        if (localStorage.getItem(storageKey) === null) localStorage.setItem(storageKey, anon);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage blocked: carry on with whatever load() can read.
    }
  }
  state = load();
  notify();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---------- keys ----------

export const logKey = (week: number, exId: string) => `${week}:${exId}`;
// Overload keeps the original unprefixed keys; other routines get their own, so switching
// routine never shows another routine's days as done.
export const dayKey = (week: number, day: Day, program: ProgramId = DEFAULT_PROGRAM) =>
  program === DEFAULT_PROGRAM ? `${week}:${day}` : `${program}:${week}:${day}`;

// A cardio day is done once its cardio is logged; lifting days when finished.
export const isDayDone = (s: State, week: number, day: Day) =>
  isCardioDay(day, s.program) ? !!s.cardio[dayKey(week, day, s.program)] : !!s.daysDone[dayKey(week, day, s.program)];

export const cardioFor = (s: State, week: number, day: Day): Cardio | undefined => s.cardio[dayKey(week, day, s.program)];

// ---------- dates & weeks ----------

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Whole calendar days between two ISO dates, ignoring time zones and DST.
export function daysBetween(fromISO: string, toISO: string): number {
  const toUTC = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(toISO) - toUTC(fromISO)) / 86_400_000);
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function currentWeek(startDate: string, today = todayISO()): number {
  if (!startDate) return 1;
  return clamp(Math.floor(daysBetween(startDate, today) / 7) + 1, 1, TOTAL_WEEKS);
}

// ---------- previous performance ----------

export interface Previous {
  week: number;
  sets: SetLog[];
}

// Walks back from week - 1 to the first week that has logs for this exercise.
// This also skips deload weeks, where A exercises are hidden and so never logged.
export function previous(logs: State['logs'], week: number, exId: string): Previous | null {
  for (let w = week - 1; w >= 1; w--) {
    const sets = logs[logKey(w, exId)];
    if (sets && sets.length > 0) return { week: w, sets };
  }
  return null;
}

export const bandRank = (b?: Band) => (b ? BANDS.indexOf(b) : -1);

// Compared in the display unit so a value that looks equal on screen is equal.
export function beats(set: SetLog, prev: SetLog | undefined, unit: Unit): boolean {
  if (!prev) return false;
  if (set.band || prev.band) {
    const a = bandRank(set.band);
    const b = bandRank(prev.band);
    return a > b || (a === b && set.reps > prev.reps);
  }
  const a = toDisplay(set.weightKg ?? 0, unit);
  const b = toDisplay(prev.weightKg ?? 0, unit);
  return a > b || (a === b && set.reps > prev.reps);
}

export function topWeightKg(sets: SetLog[]): number | undefined {
  const ws = sets.map((s) => s.weightKg).filter((w): w is number => w !== undefined);
  return ws.length ? Math.max(...ws) : undefined;
}

export function topBand(sets: SetLog[]): Band | undefined {
  let best: Band | undefined;
  for (const s of sets) if (bandRank(s.band) > bandRank(best)) best = s.band;
  return best;
}

// The best set of a session: heaviest load (as displayed), then most reps.
export function bestSet(sets: SetLog[], unit: Unit): SetLog | undefined {
  let best: SetLog | undefined;
  for (const s of sets) if (!best || beats(s, best, unit)) best = s;
  return best;
}

export interface Target {
  weightKg?: number;
  band?: Band;
  reps: number;
  progressed: boolean; // load goes up from last time
  reason?: 'easy' | 'moderate'; // the load jumped because last time's sets were rated easy/moderate
}

// Next-attempt target, from the best set last time (double progression), pushed harder
// when the sets were rated as easy:
// - A (failure): same load, one more rep than the best set. If that set was rated Easy,
//   add two increments at the same reps; Moderate, one increment.
// - B (steady): if every prescribed set hit the prescribed reps at that load, add one
//   increment (2.5 kg / 5 lb, or the next band), or two if every one of those sets was
//   rated Easy; otherwise repeat the load for the prescribed reps.
// - Deload weeks hold the load.
export function nextTarget(ex: Exercise, prev: Previous | null, week: number, unit: Unit): Target | null {
  if (!prev) return null;
  const best = bestSet(prev.sets, unit);
  if (!best) return null;
  const same = { weightKg: best.weightKg, band: best.band };

  if (ex.role === 'A' || !ex.scheme) {
    const steps = best.effort === 1 ? 2 : best.effort === 2 ? 1 : 0;
    if (steps === 0 || isDeload(week)) return { ...same, reps: best.reps + 1, progressed: false };
    const heavier = increase(ex, best, steps, unit);
    const reason = best.effort === 1 ? 'easy' : 'moderate';
    return heavier ? { ...heavier, reps: best.reps, progressed: true, reason } : { ...same, reps: best.reps + 1, progressed: false };
  }

  const { sets, reps } = ex.scheme;
  if (isDeload(week)) return { ...same, reps, progressed: false };

  const sameLoad = (s: SetLog) =>
    s.band ? s.band === best.band : toDisplay(s.weightKg ?? 0, unit) === toDisplay(best.weightKg ?? 0, unit);
  const qualifying = prev.sets.filter((s) => sameLoad(s) && s.reps >= reps);
  if (qualifying.length < sets) return { ...same, reps, progressed: false };

  // Every set rated Easy earns a double step (when there's room for one, e.g. bands).
  const double = qualifying.every((s) => s.effort === 1) ? increase(ex, best, 2, unit) : undefined;
  if (double) return { ...double, reps, progressed: true, reason: 'easy' };
  const single = increase(ex, best, 1, unit);
  if (!single) return { ...same, reps: best.reps + 1, progressed: false }; // already on the heaviest band
  return { ...single, reps, progressed: true };
}

// The load `steps` increments above a set: 2.5 kg / 5 lb each, or the next band(s).
// Undefined when there is no heavier band.
function increase(ex: Exercise, set: SetLog, steps: number, unit: Unit): Pick<SetLog, 'weightKg' | 'band'> | undefined {
  if (ex.load === 'band') {
    const next = BANDS[bandRank(set.band) + steps];
    return next ? { band: next } : undefined;
  }
  const up = toDisplay(set.weightKg ?? 0, unit) + steps * weightStep(unit);
  return { weightKg: fromDisplay(up, unit) };
}

// ---------- units ----------

export const roundTo = (n: number, step: number) => Math.round(n / step) * step;

// kg is shown to 2 decimal places at most; lb is rounded to the nearest 0.5.
export function toDisplay(kg: number, unit: Unit): number {
  return unit === 'lb' ? roundTo(kg / KG_PER_LB, 0.5) : Math.round(kg * 100) / 100;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

export const weightStep = (unit: Unit) => (unit === 'lb' ? 5 : 2.5);

export const distanceUnit = (unit: Unit) => (unit === 'lb' ? 'mi' : 'km');
export const KM_PER_MI = 1.609344;

export function distanceToDisplay(km: number, unit: Unit): number {
  const v = unit === 'lb' ? km / KM_PER_MI : km;
  return Math.round(v * 100) / 100;
}

export function distanceFromDisplay(value: number, unit: Unit): number {
  return unit === 'lb' ? value * KM_PER_MI : value;
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

// "60 kg × 11, 60 × 8" — unit on the first set only.
export function formatSets(sets: SetLog[], unit: Unit): string {
  return sets
    .map((s, i) => {
      const load = s.band ?? `${formatNumber(toDisplay(s.weightKg ?? 0, unit))}${i === 0 ? ` ${unit}` : ''}`;
      const effort = effortLabel(s.effort);
      return `${load} × ${s.reps}${effort ? ` (${effort})` : ''}`;
    })
    .join(', ');
}

// ---------- actions ----------

export function addSet(week: number, exId: string, set: SetLog) {
  setState((s) => {
    const key = logKey(week, exId);
    return { ...s, logs: { ...s.logs, [key]: [...(s.logs[key] ?? []), set] } };
  });
}

export function updateSet(week: number, exId: string, index: number, set: SetLog) {
  setState((s) => {
    const key = logKey(week, exId);
    const sets = [...(s.logs[key] ?? [])];
    sets[index] = set;
    return { ...s, logs: { ...s.logs, [key]: sets } };
  });
}

export function removeSet(week: number, exId: string, index: number) {
  setState((s) => {
    const key = logKey(week, exId);
    const sets = (s.logs[key] ?? []).filter((_, i) => i !== index);
    const logs = { ...s.logs };
    if (sets.length) logs[key] = sets;
    else delete logs[key];
    return { ...s, logs };
  });
}

export function setDayDone(week: number, day: Day, done: boolean) {
  setState((s) => ({ ...s, daysDone: { ...s.daysDone, [dayKey(week, day, s.program)]: done } }));
}

export function saveCardio(week: number, day: Day, entry: Cardio) {
  setState((s) => ({ ...s, cardio: { ...s.cardio, [dayKey(week, day, s.program)]: entry } }));
}

export function deleteCardio(week: number, day: Day) {
  setState((s) => {
    const cardio = { ...s.cardio };
    delete cardio[dayKey(week, day, s.program)];
    return { ...s, cardio };
  });
}

export function setProgram(program: ProgramId) {
  setState((s) => ({ ...s, program }));
}

export function setUnit(unit: Unit) {
  setState((s) => ({ ...s, unit }));
}

export function setRestSeconds(restSeconds: RestSeconds) {
  setState((s) => ({ ...s, restSeconds }));
}

export function setAutoRest(autoRest: boolean) {
  setState((s) => ({ ...s, autoRest }));
}

export function setStartDate(startDate: string) {
  setState((s) => ({ ...s, startDate }));
}
