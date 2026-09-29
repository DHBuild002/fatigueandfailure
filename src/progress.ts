import { TOTAL_WEEKS, isDeload } from './routine';
import { fromDisplay, logKey, roundTo, toDisplay, weightStep, type SetLog, type State, type Unit } from './store';

// Estimated one-rep max (Epley): a common way to compare sets with different reps.
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

export interface WeekBest {
  week: number;
  e1rmKg: number;
  set: SetLog; // the set that gave the best estimate that week
}

// The best set (by estimated 1RM) of each week that has weighted sets for this exercise.
export function weeklyBests(logs: State['logs'], exId: string): WeekBest[] {
  const out: WeekBest[] = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    let best: WeekBest | undefined;
    for (const set of logs[logKey(week, exId)] ?? []) {
      if (set.weightKg === undefined || set.reps < 1) continue;
      const est = e1rm(set.weightKg, set.reps);
      if (!best || est > best.e1rmKg) best = { week, e1rmKg: est, set };
    }
    if (best) out.push(best);
  }
  return out;
}

export interface Projection {
  e1rmKg: number; // projected estimated 1RM at week 12
  fromWeek: number; // last logged week, where the projected line starts
  fromKg: number;
  perWeekKg: number; // trend per week, after capping
}

// Early weeks often jump while working weights are found; a straight line through
// those would promise the impossible, so the trend is capped at 1.5% of the best per week
// (a strong but realistic rate for a 12-week block).
export const MAX_WEEKLY_GAIN = 0.015;

// A straight-line (least-squares) trend through the non-deload weeks, extended to week 12.
// Needs two weeks of data, and never projects below the best already achieved.
export function projection(bests: WeekBest[]): Projection | null {
  const pts = bests.filter((b) => !isDeload(b.week));
  if (pts.length < 2) return null;
  const last = bests[bests.length - 1];
  if (last.week >= TOTAL_WEEKS) return null;

  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.week, 0) / n;
  const my = pts.reduce((s, p) => s + p.e1rmKg, 0) / n;
  const sxx = pts.reduce((s, p) => s + (p.week - mx) ** 2, 0);
  const sxy = pts.reduce((s, p) => s + (p.week - mx) * (p.e1rmKg - my), 0);
  const peak = Math.max(...bests.map((b) => b.e1rmKg));
  const slope = Math.min(sxx === 0 ? 0 : sxy / sxx, peak * MAX_WEEKLY_GAIN);

  // Continue from the last logged week at the trend's pace.
  const fromKg = last.e1rmKg;
  const e1rmKg = Math.max(fromKg + slope * (TOTAL_WEEKS - last.week), peak);
  return { e1rmKg, fromWeek: last.week, fromKg, perWeekKg: slope };
}

// What a projected 1RM means as a working set at the reps usually done:
// the median reps of the weekly bests, rounded down to the plate step.
export function workingSet(e1rmKg: number, bests: WeekBest[], unit: Unit): { weightKg: number; reps: number } {
  const reps = [...bests.map((b) => b.set.reps)].sort((a, b) => a - b)[Math.floor((bests.length - 1) / 2)] ?? 8;
  const raw = toDisplay(e1rmKg / (1 + reps / 30), unit);
  const step = weightStep(unit);
  return { weightKg: fromDisplay(Math.floor(raw / step) * step, unit), reps };
}

// Round a kg value for display in the user's unit (to 0.5).
export const displayKg = (kg: number, unit: Unit) => roundTo(toDisplay(kg, unit), 0.5);
