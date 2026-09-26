import { describe, expect, it } from 'vitest';
import { exercisesFor, isDeload, EXERCISES } from './routine';
import {
  beats,
  currentWeek,
  formatSets,
  fromDisplay,
  logKey,
  previous,
  toDisplay,
  topBand,
  topWeightKg,
  type SetLog,
} from './store';

const at = '2026-01-01T00:00:00.000Z';
const w = (weightKg: number, reps: number): SetLog => ({ weightKg, reps, at });

describe('currentWeek', () => {
  it('is week 1 on the start date and for the first 7 days', () => {
    expect(currentWeek('2026-09-01', '2026-09-01')).toBe(1);
    expect(currentWeek('2026-09-01', '2026-09-07')).toBe(1);
    expect(currentWeek('2026-09-01', '2026-09-08')).toBe(2);
  });
  it('clamps to 1..12', () => {
    expect(currentWeek('2026-09-10', '2026-09-01')).toBe(1);
    expect(currentWeek('2026-01-01', '2026-12-31')).toBe(12);
  });
  it('is unaffected by DST changes', () => {
    // Spans the late-March and late-October clock changes.
    expect(currentWeek('2026-03-23', '2026-03-30')).toBe(2);
    expect(currentWeek('2026-10-19', '2026-10-26')).toBe(2);
  });
});

describe('deload', () => {
  it('is weeks 4, 8 and 12', () => {
    expect([...Array(12)].map((_, i) => i + 1).filter(isDeload)).toEqual([4, 8, 12]);
  });
  it('hides all A exercises on deload weeks', () => {
    for (const day of [1, 2, 3, 4, 5] as const) {
      expect(exercisesFor(day, 4).every((e) => e.role === 'B')).toBe(true);
      expect(exercisesFor(day, 5).some((e) => e.role === 'A')).toBe(true);
    }
  });
  it('orders A before B', () => {
    for (const day of [1, 2, 3, 4, 5] as const) {
      const roles = exercisesFor(day, 1).map((e) => e.role).join('');
      expect(roles).toMatch(/^A+B+$/);
    }
  });
  it('seeds 12 exercises with unique ids', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(12);
  });
});

describe('previous', () => {
  it('returns week N-1 when it has logs', () => {
    const logs = { [logKey(1, 'x')]: [w(60, 10)] };
    expect(previous(logs, 2, 'x')).toEqual({ week: 1, sets: [w(60, 10)] });
  });
  it('returns null in week 1 or with no history', () => {
    expect(previous({}, 1, 'x')).toBeNull();
    expect(previous({}, 5, 'x')).toBeNull();
  });
  it('skips a deload week back to the last week with logs', () => {
    const logs = { [logKey(3, 'a')]: [w(60, 8)] };
    expect(previous(logs, 5, 'a')?.week).toBe(3);
  });
  it('skips weeks with an empty set list', () => {
    const logs = { [logKey(2, 'a')]: [w(50, 8)], [logKey(3, 'a')]: [] };
    expect(previous(logs, 4, 'a')?.week).toBe(2);
  });
});

describe('beats', () => {
  it('is true for more weight, or equal weight with more reps', () => {
    expect(beats(w(62.5, 5), w(60, 10), 'kg')).toBe(true);
    expect(beats(w(60, 11), w(60, 10), 'kg')).toBe(true);
  });
  it('is false for equal or worse', () => {
    expect(beats(w(60, 10), w(60, 10), 'kg')).toBe(false);
    expect(beats(w(57.5, 20), w(60, 10), 'kg')).toBe(false);
    expect(beats(w(60, 10), undefined, 'kg')).toBe(false);
  });
  it('compares in display units so lb rounding does not create false wins', () => {
    // 60 kg shows as 132.5 lb; re-entering 132.5 lb must not count as heavier.
    const reentered = w(fromDisplay(132.5, 'lb'), 10);
    expect(beats(reentered, w(60, 10), 'lb')).toBe(false);
  });
  it('ranks bands light < medium < heavy', () => {
    expect(beats({ band: 'heavy', reps: 5, at }, { band: 'medium', reps: 15, at }, 'kg')).toBe(true);
    expect(beats({ band: 'medium', reps: 16, at }, { band: 'medium', reps: 15, at }, 'kg')).toBe(true);
    expect(beats({ band: 'light', reps: 30, at }, { band: 'medium', reps: 15, at }, 'kg')).toBe(false);
  });
});

describe('units', () => {
  it('converts kg to lb rounded to the nearest 0.5', () => {
    expect(toDisplay(60, 'lb')).toBe(132.5);
    expect(toDisplay(100, 'lb')).toBe(220.5);
    expect(toDisplay(60, 'kg')).toBe(60);
  });
  it('round-trips lb entries without drift', () => {
    expect(toDisplay(fromDisplay(135, 'lb'), 'lb')).toBe(135);
  });
});

describe('selectors and formatting', () => {
  it('finds the top weight and band', () => {
    expect(topWeightKg([w(60, 11), w(62.5, 6), w(60, 8)])).toBe(62.5);
    expect(topWeightKg([])).toBeUndefined();
    expect(topBand([{ band: 'light', reps: 1, at }, { band: 'heavy', reps: 1, at }])).toBe('heavy');
  });
  it('formats last week like the PRD example', () => {
    expect(formatSets([w(60, 11), w(60, 8)], 'kg')).toBe('60 kg × 11, 60 × 8');
    expect(formatSets([{ band: 'medium', reps: 15, at }], 'kg')).toBe('medium × 15');
  });
});
