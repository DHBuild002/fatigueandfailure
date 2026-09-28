import { describe, expect, it, vi } from 'vitest';
import { PROGRAM_LIST, PROGRAMS, daysFor, exercisesFor, isCardioDay, isDeload, type Exercise } from './routine';

const EXERCISES = PROGRAMS.overload.exercises;
import {
  beats,
  cardioFor,
  dayKey,
  isDayDone,
  migrateState,
  ROUTINE_VERSION,
  effortLabel,
  emptyState,
  load,
  STORAGE_KEY,
  nextTarget,
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
    for (const day of [1, 2, 3, 4] as const) {
      expect(exercisesFor(day, 4).every((e) => e.role === 'B')).toBe(true);
      expect(exercisesFor(day, 5).some((e) => e.role === 'A')).toBe(true);
    }
  });
  it('orders A before B', () => {
    for (const day of [1, 2, 3, 4] as const) {
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

describe('nextTarget', () => {
  const ex = (id: string) => EXERCISES.find((e) => e.id === id)!;
  const prev = (week: number, sets: SetLog[]) => ({ week, sets });
  const bandEx: Exercise = { id: 'band', day: 3, role: 'B', name: 'Band curl', prescription: '3×15', load: 'band', scheme: { sets: 3, reps: 15 } };

  it('is null with no history', () => {
    expect(nextTarget(ex('bench-press'), null, 1, 'kg')).toBeNull();
  });
  it('A: same weight as the best set, one more rep', () => {
    const t = nextTarget(ex('bench-press'), prev(1, [w(60, 11), w(62.5, 6), w(60, 8)]), 2, 'kg');
    expect(t).toMatchObject({ weightKg: 62.5, reps: 7, progressed: false });
  });
  it('B: adds 2.5 kg once every prescribed set hits its reps', () => {
    const t = nextTarget(ex('db-overhead-press'), prev(1, [w(50, 12), w(50, 12), w(50, 12)]), 2, 'kg');
    expect(t).toMatchObject({ reps: 12, progressed: true });
    expect(t!.weightKg).toBeCloseTo(52.5);
  });
  it('B: repeats the weight when a set fell short', () => {
    const t = nextTarget(ex('db-overhead-press'), prev(1, [w(50, 12), w(50, 12), w(50, 10)]), 2, 'kg');
    expect(t).toMatchObject({ weightKg: 50, reps: 12, progressed: false });
  });
  it('B: steps 5 lb in lb mode', () => {
    const t = nextTarget(ex('db-overhead-press'), prev(1, [w(fromDisplay(135, 'lb'), 12), w(fromDisplay(135, 'lb'), 12), w(fromDisplay(135, 'lb'), 12)]), 2, 'lb');
    expect(toDisplay(t!.weightKg!, 'lb')).toBe(140);
  });
  it('B band: moves to the next band, and adds reps once on heavy', () => {
    const b = (band: 'medium' | 'heavy', reps: number): SetLog => ({ band, reps, at });
    expect(nextTarget(bandEx, prev(1, [b('medium', 15), b('medium', 15), b('medium', 15)]), 2, 'kg')).toMatchObject({ band: 'heavy', reps: 15 });
    expect(nextTarget(bandEx, prev(1, [b('heavy', 15), b('heavy', 16), b('heavy', 15)]), 2, 'kg')).toMatchObject({ band: 'heavy', reps: 17 });
  });
  it('holds the load on deload weeks', () => {
    const t = nextTarget(ex('db-overhead-press'), prev(3, [w(50, 12), w(50, 12), w(50, 12)]), 4, 'kg');
    expect(t).toMatchObject({ weightKg: 50, reps: 12, progressed: false });
  });
});

describe('intensity and rest settings', () => {
  it("shows each set's intensity in last week's summary", () => {
    expect(formatSets([{ weightKg: 60, reps: 11, effort: 3, at }, w(60, 8)], 'kg')).toBe('60 kg × 11 (Hard), 60 × 8');
    expect(effortLabel(4)).toBe('Max');
    expect(effortLabel(undefined)).toBeUndefined();
  });
  it('defaults rest to 60 s, manual start', () => {
    expect(emptyState()).toMatchObject({ restSeconds: 60, autoRest: false });
  });
  it('fills in rest settings for data saved before they existed', () => {
    const store = new Map<string, string>([[STORAGE_KEY, JSON.stringify({ startDate: '2026-09-01', unit: 'lb', logs: {}, daysDone: {}, cardio: {} })]]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null });
    expect(load()).toMatchObject({ startDate: '2026-09-01', unit: 'lb', restSeconds: 60, autoRest: false });
    vi.unstubAllGlobals();
  });
});

describe('day order: Legs, Arms, Chest, Back, Cardio', () => {
  const names = (day: 1 | 2 | 3 | 4 | 5, week = 1) => exercisesFor(day, week).map((e) => e.name);
  it('puts all four squats on Leg Day, failure lifts first', () => {
    expect(names(1)).toEqual(['Barbell squat', 'Front squat', 'Tempo barbell squat', 'Tempo goblet squat']);
    expect(names(1, 4)).toEqual(['Tempo barbell squat', 'Tempo goblet squat']); // deload: B only
  });
  it('moves Arms, Chest and Back to days 2–4, and Day 5 has no lifts', () => {
    expect(names(2)[0]).toBe('Barbell curl');
    expect(names(3)[0]).toBe('Barbell bench press');
    expect(names(4)[0]).toBe('Barbell bent-over row');
    expect(names(5)).toEqual([]);
    expect(isCardioDay(5)).toBe(true);
    expect(isCardioDay(1)).toBe(false);
  });
});

describe('migrateState (v1 → v2 day order)', () => {
  const v1 = (daysDone: Record<string, boolean>) => ({ ...emptyState(), routineVersion: 1, daysDone });
  it('merges Glutes and Legs into Legs, and shifts Arms/Chest/Back down a day', () => {
    const m = migrateState(v1({ '1:1': true, '1:3': true, '2:2': true, '2:5': true, '3:4': true }));
    expect(m.daysDone).toEqual({ '1:1': true, '1:2': true, '2:1': true, '2:4': true, '3:3': true });
    expect(m.routineVersion).toBe(ROUTINE_VERSION);
  });
  it('leaves current data alone and is safe to run twice', () => {
    const current = { ...emptyState(), daysDone: { '1:1': true, '1:4': true } };
    expect(migrateState(current)).toBe(current);
    const once = migrateState(v1({ '1:2': true }));
    expect(migrateState(once)).toBe(once);
  });
  it('treats data saved before routineVersion existed as the old order', () => {
    const store = new Map<string, string>([[STORAGE_KEY, JSON.stringify({ startDate: '2026-09-01', daysDone: { '1:5': true } })]]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null });
    expect(load().daysDone).toEqual({ '1:4': true }); // old Back (5) → new Back (4)
    vi.unstubAllGlobals();
  });
  it('counts the cardio day as done once cardio is logged', () => {
    const s = { ...emptyState(), cardio: { '2:5': { type: 'Run', minutes: 30 } } };
    expect(isDayDone(s, 2, 5)).toBe(true);
    expect(isDayDone(s, 1, 5)).toBe(false);
    expect(isDayDone({ ...s, daysDone: { '2:1': true } }, 2, 1)).toBe(true);
  });
});

describe('migrateState (v2 → v3 cardio per day)', () => {
  it("turns each week's cardio entry into Day 5's entry", () => {
    const v2 = { ...emptyState(), routineVersion: 2, cardio: { 1: { type: 'Run', minutes: 30 }, 3: { type: 'Swim', minutes: 20 } } };
    const m = migrateState(v2 as never);
    expect(m.cardio).toEqual({ '1:5': { type: 'Run', minutes: 30 }, '3:5': { type: 'Swim', minutes: 20 } });
    expect(isDayDone(m, 1, 5)).toBe(true);
    expect(migrateState(m)).toBe(m);
  });
  it('runs every step for v1 data, and defaults the routine to Overload', () => {
    const store = new Map<string, string>([[STORAGE_KEY, JSON.stringify({ startDate: '2026-09-01', daysDone: { '1:2': true }, cardio: { 1: { type: 'Run', minutes: 30 } } })]]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null });
    const s = load();
    vi.unstubAllGlobals();
    expect(s.program).toBe('overload');
    expect(s.daysDone).toEqual({ '1:1': true });
    expect(cardioFor(s, 1, 5)).toEqual({ type: 'Run', minutes: 30 });
  });
});

describe('routines', () => {
  it('each has 5 days, and lift days are A lifts then B lifts with unique ids', () => {
    for (const p of PROGRAM_LIST) {
      expect(p.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
      expect(new Set(p.exercises.map((e) => e.id)).size).toBe(p.exercises.length);
      for (const d of p.days) {
        const ex = exercisesFor(d.day, 1, p.id);
        if (d.kind === 'cardio') expect(ex).toEqual([]);
        else {
          expect(ex.map((e) => e.role).join('')).toMatch(/^A+B+$/);
          expect(exercisesFor(d.day, 4, p.id).every((e) => e.role === 'B')).toBe(true); // deload
          expect(ex.filter((e) => e.role === 'B').every((e) => e.scheme)).toBe(true);
        }
      }
    }
  });
  it('shares one id (and so one history) for an exercise used by several routines', () => {
    const byId = new Map<string, string>();
    for (const p of PROGRAM_LIST) for (const e of p.exercises) {
      const name = byId.get(e.id);
      if (name) expect(e.name).toBe(name);
      byId.set(e.id, e.name);
    }
  });
  it('Cardio focus has three cardio days and two full-body days', () => {
    expect(daysFor('cardio').filter((d) => d.kind === 'cardio').map((d) => d.day)).toEqual([1, 3, 5]);
    expect(exercisesFor(2, 1, 'cardio').map((e) => e.name)).toEqual(['Goblet squat', 'Dumbbell bench press', 'Seated cable row']);
    expect(isCardioDay(1, 'cardio')).toBe(true);
    expect(isCardioDay(1)).toBe(false);
  });
  it('Gym volume uses none of the Overload exercises', () => {
    const overload = new Set(EXERCISES.map((e) => e.id));
    expect(PROGRAMS.gym.exercises.filter((e) => overload.has(e.id))).toEqual([]);
  });
  it('keeps done days and cardio apart per routine', () => {
    const base = { ...emptyState(), daysDone: { '1:1': true }, cardio: { '1:5': { type: 'Run', minutes: 30 } } };
    expect(isDayDone(base, 1, 1)).toBe(true);
    const light = { ...base, program: 'light' as const };
    expect(isDayDone(light, 1, 1)).toBe(false);
    expect(isDayDone(light, 1, 5)).toBe(false);
    expect(dayKey(1, 3, 'cardio')).toBe('cardio:1:3');
    const cardio = { ...base, program: 'cardio' as const, cardio: { 'cardio:1:3': { type: 'Bike', minutes: 40 } } };
    expect(isDayDone(cardio, 1, 3)).toBe(true);
    expect(isDayDone(cardio, 1, 1)).toBe(false);
  });
});
