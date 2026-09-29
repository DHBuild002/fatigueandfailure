import { describe, expect, it } from 'vitest';
import { MAX_WEEKLY_GAIN, e1rm, projection, weeklyBests, workingSet } from './progress';
import { logKey, type SetLog } from './store';

const at = '2026-01-01T00:00:00.000Z';
const s = (weightKg: number, reps: number): SetLog => ({ weightKg, reps, at });
const logs = (weeks: Record<number, SetLog[]>) => Object.fromEntries(Object.entries(weeks).map(([w, sets]) => [logKey(Number(w), 'squat'), sets]));

describe('progress', () => {
  it('estimates a one-rep max with Epley', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(90, 10)).toBeCloseTo(120);
  });
  it('picks the best set of each logged week, skipping empty weeks and band sets', () => {
    const b = weeklyBests({ ...logs({ 1: [s(100, 5), s(90, 10)], 3: [s(100, 8)] }), [logKey(2, 'squat')]: [{ band: 'heavy', reps: 10, at }] }, 'squat');
    expect(b.map((x) => x.week)).toEqual([1, 3]);
    expect(b[0].set.weightKg).toBe(90); // 90×10 (120) beats 100×5 (116.7)
  });
  it('needs two non-deload weeks for a projection', () => {
    expect(projection(weeklyBests(logs({ 1: [s(100, 5)] }), 'squat'))).toBeNull();
    expect(projection(weeklyBests(logs({ 3: [s(100, 5)], 4: [s(80, 12)] }), 'squat'))).toBeNull(); // week 4 is a deload
  });
  it('extends a steady trend to week 12', () => {
    // e1rm 100, 101, 102 in weeks 1–3: +1 per week (under the cap) → 111 by week 12
    const bests = [1, 2, 3].map((week) => ({ week, e1rmKg: 99 + week, set: s(80, 8) }));
    const p = projection(bests)!;
    expect(p.perWeekKg).toBeCloseTo(1);
    expect(p.e1rmKg).toBeCloseTo(111);
    expect(p.fromWeek).toBe(3);
  });
  it('caps an unrealistic early jump, and never projects below the best so far', () => {
    const jump = projection([{ week: 1, e1rmKg: 50, set: s(40, 8) }, { week: 2, e1rmKg: 100, set: s(80, 8) }])!;
    expect(jump.perWeekKg).toBeCloseTo(100 * MAX_WEEKLY_GAIN);
    const falling = projection([{ week: 1, e1rmKg: 110, set: s(90, 7) }, { week: 2, e1rmKg: 100, set: s(80, 8) }])!;
    expect(falling.e1rmKg).toBe(110);
  });
  it('turns a projected max into a working set at the usual reps, rounded down to the plate step', () => {
    const bests = [s(80, 8), s(82.5, 8), s(85, 6)].map((set, i) => ({ week: i + 1, e1rmKg: e1rm(set.weightKg!, set.reps), set }));
    const w = workingSet(120, bests, 'kg');
    expect(w.reps).toBe(8);
    expect(w.weightKg).toBe(92.5); // 120 / (1 + 8/30) = 94.7, rounded down to 2.5 kg
  });
});
