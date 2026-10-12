import { daysFor, exercisesFor, isDeload, type Day, type Exercise, type Focus, type ProgramId, PROGRAMS } from './routine';

// Travel Mode: when the usual gym isn't available, each lifting day swaps its plan for two
// exercises that fit the kit to hand, keeping the day's focus (legs day stays legs).
// One pick always needs no kit at all, so there is always a workout.

export type Kit = 'weights' | 'cable' | 'treadmill' | 'rower';
export const KIT_OPTIONS: { value: Kit; label: string }[] = [
  { value: 'weights', label: 'Free weights' },
  { value: 'cable', label: 'Cable machine' },
  { value: 'treadmill', label: 'Treadmill' },
  { value: 'rower', label: 'Rower' },
];

type Source = 'weights' | 'cable' | 'bodyweight' | 'treadmill' | 'rower';

interface TravelExercise {
  id: string; // shared with the main routines where it's the same exercise, so history carries over
  name: string;
  focus: Focus[];
  source: Source;
  prescription?: string; // when reps mean something else (seconds, rounds)
  perSide?: 'leg' | 'arm';
}

const ALL: Focus[] = ['legs', 'arms', 'chest', 'back', 'full'];

export const TRAVEL_POOL: TravelExercise[] = [
  // Legs
  { id: 'goblet-squat', name: 'Goblet squat', focus: ['legs', 'full'], source: 'weights' },
  { id: 'db-romanian-deadlift', name: 'Dumbbell Romanian deadlift', focus: ['legs', 'full'], source: 'weights' },
  { id: 'walking-lunge', name: 'Walking lunge', focus: ['legs'], source: 'weights', perSide: 'leg' },
  { id: 'db-step-up', name: 'Dumbbell step-up', focus: ['legs'], source: 'weights', perSide: 'leg' },
  { id: 'cable-pull-through', name: 'Cable pull-through', focus: ['legs'], source: 'cable' },
  { id: 'cable-kickback', name: 'Cable glute kickback', focus: ['legs'], source: 'cable', perSide: 'leg' },
  { id: 'bodyweight-squat', name: 'Bodyweight squat', focus: ['legs', 'full'], source: 'bodyweight' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian split squat', focus: ['legs'], source: 'bodyweight', perSide: 'leg' },
  { id: 'glute-bridge', name: 'Glute bridge', focus: ['legs'], source: 'bodyweight' },
  { id: 'wall-sit', name: 'Wall sit', focus: ['legs'], source: 'bodyweight', prescription: 'Hold to failure · log seconds' },
  // Arms
  { id: 'db-curl', name: 'Dumbbell curl', focus: ['arms'], source: 'weights' },
  { id: 'hammer-curl', name: 'Hammer curl', focus: ['arms'], source: 'weights' },
  { id: 'overhead-db-triceps-extension', name: 'Overhead dumbbell triceps extension', focus: ['arms'], source: 'weights' },
  { id: 'cable-curl', name: 'Cable curl', focus: ['arms'], source: 'cable' },
  { id: 'cable-triceps-pushdown', name: 'Cable triceps pushdown', focus: ['arms'], source: 'cable' },
  { id: 'diamond-push-up', name: 'Diamond push-up', focus: ['arms'], source: 'bodyweight' },
  { id: 'bench-dip', name: 'Bench dip', focus: ['arms'], source: 'bodyweight' },
  { id: 'chin-up-hold', name: 'Chin-up hold', focus: ['arms'], source: 'bodyweight', prescription: 'Hold at the top to failure · log seconds' },
  // Chest & shoulders
  { id: 'db-bench-press', name: 'Dumbbell bench press', focus: ['chest', 'full'], source: 'weights' },
  { id: 'db-floor-press', name: 'Dumbbell floor press', focus: ['chest'], source: 'weights' },
  { id: 'db-shoulder-press', name: 'Dumbbell shoulder press', focus: ['chest', 'full'], source: 'weights' },
  { id: 'db-lateral-raise', name: 'Dumbbell lateral raise', focus: ['chest'], source: 'weights' },
  { id: 'cable-fly', name: 'Cable fly', focus: ['chest'], source: 'cable' },
  { id: 'cable-chest-press', name: 'Cable chest press', focus: ['chest'], source: 'cable' },
  { id: 'push-up', name: 'Push-up', focus: ['chest', 'full'], source: 'bodyweight' },
  { id: 'decline-push-up', name: 'Decline push-up', focus: ['chest'], source: 'bodyweight' },
  { id: 'pike-push-up', name: 'Pike push-up', focus: ['chest'], source: 'bodyweight' },
  // Back
  { id: 'single-arm-db-row', name: 'Single-arm dumbbell row', focus: ['back', 'full'], source: 'weights', perSide: 'arm' },
  { id: 'db-pullover', name: 'Dumbbell pullover', focus: ['back'], source: 'weights' },
  { id: 'seated-cable-row', name: 'Seated cable row', focus: ['back', 'full'], source: 'cable' },
  { id: 'lat-pulldown', name: 'Lat pulldown', focus: ['back', 'full'], source: 'cable' },
  { id: 'face-pull', name: 'Face pull', focus: ['back'], source: 'cable' },
  { id: 'inverted-row', name: 'Inverted row (under a sturdy table)', focus: ['back', 'full'], source: 'bodyweight' },
  { id: 'superman-hold', name: 'Superman hold', focus: ['back'], source: 'bodyweight', prescription: 'Hold to failure · log seconds' },
  { id: 'prone-y-raise', name: 'Prone Y-raise', focus: ['back'], source: 'bodyweight' },
  // Finishers, when the only kit is cardio kit
  { id: 'rower-sprints', name: 'Rower sprints', focus: ALL, source: 'rower', prescription: '8 rounds: 30 s all-out, 30 s easy · log rounds completed' },
  { id: 'treadmill-incline-sprints', name: 'Treadmill incline sprints', focus: ALL, source: 'treadmill', prescription: '8 rounds: 30 s hard uphill, 30 s walk · log rounds completed' },
];

const byId = new Map(TRAVEL_POOL.map((e) => [e.id, e]));

// Small seeded generator, so the same seed always gives the same picks.
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
const pick = <T,>(items: T[], rand: () => number) => items[Math.floor(rand() * items.length)];

// Two exercise ids for a day: one using the lifting kit to hand (or a cardio finisher when
// there's only cardio kit), plus one bodyweight move for the same muscles. With no kit at
// all, both are bodyweight.
export function pickTravel(focus: Focus, kit: Kit[], seed: string): string[] {
  const rand = seeded(seed);
  const pool = TRAVEL_POOL.filter((e) => e.focus.includes(focus));
  const bodyweight = pool.filter((e) => e.source === 'bodyweight');
  const lifting = pool.filter((e) => (e.source === 'weights' || e.source === 'cable') && kit.includes(e.source));
  const cardio = pool.filter((e) => (e.source === 'treadmill' || e.source === 'rower') && kit.includes(e.source));

  const second = pick(bodyweight, rand);
  const firstFrom = lifting.length ? lifting : cardio.length ? cardio : bodyweight.filter((e) => e.id !== second.id);
  const first = pick(firstFrom, rand);
  return [first.id, second.id];
}

export const travelSeed = (week: number, day: Day, program: ProgramId, kit: Kit[], shuffle = '') =>
  `${program}:${week}:${day}:${[...kit].sort().join(',')}:${shuffle}`;

// A travel pick as an exercise for the day screen: sets to failure, or 3×12 on deload weeks.
export function travelExercise(id: string, day: Day, week: number): Exercise | undefined {
  const t = byId.get(id);
  if (!t) return undefined;
  const load = t.source === 'weights' || t.source === 'cable' ? 'weight' : 'bodyweight';
  if (isDeload(week)) {
    return { id, day, role: 'B', name: t.name, prescription: t.prescription ?? `3×12${t.perSide ? ` per ${t.perSide}` : ''}`, load, perSide: t.perSide, scheme: { sets: 3, reps: 12 } };
  }
  const prescription = t.prescription ?? (t.perSide ? `Sets to failure per ${t.perSide}` : 'Sets to failure');
  return { id, day, role: 'A', name: t.name, prescription, load, perSide: t.perSide };
}

export interface TravelState {
  program: ProgramId;
  travel: boolean;
  kit: Kit[];
  travelPicks: Record<string, string[]>;
}

// The exercises for a day: the routine's own, or in Travel Mode the saved picks for that
// week (or fresh ones from the kit, until a set is logged or they're shuffled).
export function dayExercises(s: TravelState, day: Day, week: number, key: string): Exercise[] {
  const plan = daysFor(s.program).find((d) => d.day === day);
  if (!s.travel || plan?.kind !== 'lifts' || !plan.focus) return exercisesFor(day, week, s.program);
  const ids = s.travelPicks[key] ?? pickTravel(plan.focus, s.kit, travelSeed(week, day, s.program, s.kit));
  return ids.map((id) => travelExercise(id, day, week)).filter((e): e is Exercise => !!e);
}

// Any exercise by id: the person's routine first, then the travel pool.
export function findExercise(id: string, program: ProgramId, day: Day = 1): Exercise | undefined {
  return PROGRAMS[program].exercises.find((e) => e.id === id) ?? travelExercise(id, day, 1);
}

// A cardio suggestion for the kit, shown on cardio days in Travel Mode.
export function cardioSuggestion(kit: Kit[]): string {
  if (kit.includes('rower') && kit.includes('treadmill')) return 'Rower 5 × 500 m hard (1 min rest), then 10 min incline walk.';
  if (kit.includes('rower')) return 'Rower: 5 × 500 m hard, 1 min easy between.';
  if (kit.includes('treadmill')) return 'Treadmill: 10 × 1 min hard / 1 min easy.';
  return 'No cardio kit: brisk walk or run outside, or 20 min of burpees, jumping jacks and mountain climbers (40 s on / 20 s off).';
}
