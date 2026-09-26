import { useSyncExternalStore } from 'react';
import { TOTAL_WEEKS, type Day } from './routine';

export type Unit = 'kg' | 'lb';
export type Band = 'light' | 'medium' | 'heavy';
export const BANDS: Band[] = ['light', 'medium', 'heavy'];

export interface SetLog {
  weightKg?: number;
  band?: Band;
  reps: number;
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
  daysDone: Record<string, boolean>; // key: `${week}:${day}`
  cardio: Record<number, Cardio>;
}

export const STORAGE_KEY = 'overload:v1';
export const KG_PER_LB = 1 / 2.20462;

export const emptyState = (): State => ({ startDate: '', unit: 'kg', logs: {}, daysDone: {}, cardio: {} });

// ---------- persistence ----------

export function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<State>;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

function save(s: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the in-memory state still works for this session.
  }
}

let state: State = load(); // load() falls back to empty state if storage is missing or blocked
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(update: (s: State) => State) {
  state = update(state);
  save(state);
  listeners.forEach((l) => l());
}

export function resetState() {
  setState(() => emptyState());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---------- keys ----------

export const logKey = (week: number, exId: string) => `${week}:${exId}`;
export const dayKey = (week: number, day: Day) => `${week}:${day}`;

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
      return `${load} × ${s.reps}`;
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
  setState((s) => ({ ...s, daysDone: { ...s.daysDone, [dayKey(week, day)]: done } }));
}

export function saveCardio(week: number, entry: Cardio) {
  setState((s) => ({ ...s, cardio: { ...s.cardio, [week]: entry } }));
}

export function setUnit(unit: Unit) {
  setState((s) => ({ ...s, unit }));
}

export function setStartDate(startDate: string) {
  setState((s) => ({ ...s, startDate }));
}
