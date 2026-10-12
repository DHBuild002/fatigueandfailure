import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';
import { mergeStates } from './merge';
import { type Focus } from './routine';
import { emptyState, fromSaved, nextTarget, type SetLog } from './store';
import { TRAVEL_POOL, dayExercises, pickTravel, travelExercise, travelSeed, type Kit } from './travel';

const at = '2026-01-01T00:00:00.000Z';
const bw = (reps: number): SetLog => ({ reps, at });
const pool = new Map(TRAVEL_POOL.map((e) => [e.id, e]));
const FOCUSES: Focus[] = ['legs', 'arms', 'chest', 'back', 'full'];
const KITS: Kit[][] = [[], ['weights'], ['cable'], ['weights', 'cable'], ['treadmill'], ['rower'], ['weights', 'cable', 'treadmill', 'rower']];

describe('travel picks', () => {
  it('always gives 2 different exercises for the day, at least one bodyweight', () => {
    for (const focus of FOCUSES)
      for (const kit of KITS)
        for (let n = 0; n < 20; n++) {
          const ids = pickTravel(focus, kit, `seed-${n}`);
          expect(ids).toHaveLength(2);
          expect(new Set(ids).size).toBe(2);
          const picks = ids.map((id) => pool.get(id)!);
          expect(picks.every((p) => p.focus.includes(focus))).toBe(true);
          expect(picks.some((p) => p.source === 'bodyweight')).toBe(true);
          // Only kit that's ticked (bodyweight is always allowed).
          expect(picks.every((p) => p.source === 'bodyweight' || kit.includes(p.source as Kit))).toBe(true);
        }
  });
  it('uses lifting kit first, a cardio finisher when only cardio kit, and two bodyweight moves with none', () => {
    const sources = (kit: Kit[]) => pickTravel('legs', kit, 'x').map((id) => pool.get(id)!.source);
    expect(['weights', 'cable']).toContain(sources(['weights', 'cable', 'rower'])[0]);
    expect(sources(['rower'])).toEqual(['rower', 'bodyweight']);
    expect(sources(['treadmill'])).toEqual(['treadmill', 'bodyweight']);
    expect(sources([])).toEqual(['bodyweight', 'bodyweight']);
  });
  it('is the same for the same week and day, and changes with a shuffle', () => {
    const seed = travelSeed(3, 1, 'overload', ['weights']);
    expect(pickTravel('legs', ['weights'], seed)).toEqual(pickTravel('legs', ['weights'], seed));
    const shuffles = new Set(Array.from({ length: 10 }, (_, i) => pickTravel('legs', ['weights'], travelSeed(3, 1, 'overload', ['weights'], `s${i}`)).join()));
    expect(shuffles.size).toBeGreaterThan(1);
  });
  it('makes picks sets to failure, or B 3×12 on deload weeks', () => {
    expect(travelExercise('push-up', 3, 2)).toMatchObject({ role: 'A', load: 'bodyweight' });
    expect(travelExercise('goblet-squat', 1, 4)).toMatchObject({ role: 'B', load: 'weight', scheme: { sets: 3, reps: 12 } });
  });
  it('swaps only lifting days, keeps saved picks, and leaves cardio days alone', () => {
    const s = { ...emptyState(), travel: true, kit: [] as Kit[] };
    expect(dayExercises(s, 1, 1, '1:1').every((e) => e.load === 'bodyweight')).toBe(true);
    expect(dayExercises({ ...s, travelPicks: { '1:1': ['wall-sit', 'glute-bridge'] } }, 1, 1, '1:1').map((e) => e.id)).toEqual(['wall-sit', 'glute-bridge']);
    expect(dayExercises(s, 5, 1, '1:5')).toEqual([]);
    expect(dayExercises({ ...s, travel: false }, 1, 1, '1:1')[0].name).toBe('Barbell squat');
  });
});

describe('bodyweight targets', () => {
  const pushUp = travelExercise('push-up', 3, 2)!;
  it('A: one more rep than the best set', () => {
    expect(nextTarget(pushUp, { week: 1, sets: [bw(20), bw(15)] }, 2, 'kg')).toMatchObject({ reps: 21, progressed: false });
    expect(nextTarget(pushUp, { week: 1, sets: [{ ...bw(20), effort: 1 }] }, 2, 'kg')!.weightKg).toBeUndefined();
  });
  it('B: +2 reps once every set is hit', () => {
    const b = { ...pushUp, role: 'B' as const, scheme: { sets: 3, reps: 12 } };
    expect(nextTarget(b, { week: 1, sets: [bw(12), bw(13), bw(12)] }, 2, 'kg')).toMatchObject({ reps: 15, progressed: true });
    expect(nextTarget(b, { week: 1, sets: [bw(12), bw(10), bw(12)] }, 2, 'kg')).toMatchObject({ reps: 12, progressed: false });
  });
});

describe('travel data', () => {
  it('old data loads with travel off and free weights ticked', () => {
    const s = fromSaved({ startDate: '2026-09-01', logs: {} });
    expect(s).toMatchObject({ travel: false, kit: ['weights'], travelPicks: {} });
  });
  it('backups carry travel settings, and reject unknown kit', () => {
    const r = parseBackup(JSON.stringify({ startDate: '2026-09-01', logs: {}, travel: true, kit: ['rower'], travelPicks: { '1:1': ['push-up', 'wall-sit'] } }));
    expect(r.ok && r.state).toMatchObject({ travel: true, kit: ['rower'], travelPicks: { '1:1': ['push-up', 'wall-sit'] } });
    expect(parseBackup(JSON.stringify({ startDate: '2026-09-01', logs: {}, kit: ['spaceship'] })).ok).toBe(false);
  });
  it('sync keeps picks from both copies', () => {
    const a = { ...emptyState(), updatedAt: '2026-09-01T00:00:00Z', travelPicks: { '1:1': ['push-up', 'wall-sit'] } };
    const b = { ...emptyState(), updatedAt: '2026-09-02T00:00:00Z', travel: true, travelPicks: { '1:2': ['bench-dip', 'db-curl'] } };
    const m = mergeStates(a, b);
    expect(m.travelPicks).toEqual({ '1:1': ['push-up', 'wall-sit'], '1:2': ['bench-dip', 'db-curl'] });
    expect(m.travel).toBe(true);
  });
});
