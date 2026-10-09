// Built-in routines. Each person picks one; there's no routine builder.

export type Role = 'A' | 'B';
export type Day = 1 | 2 | 3 | 4 | 5;

export interface Exercise {
  id: string;
  day: Day;
  role: Role;
  name: string;
  prescription: string;
  load: 'weight' | 'band';
  perSide?: 'leg' | 'arm'; // reps are logged per leg / per arm
  // Prescribed sets × reps for steady (B) work. Failure (A) sets are open-ended.
  scheme?: { sets: number; reps: number };
}

export const TOTAL_WEEKS = 12;

export type ProgramId = 'overload' | 'cardio' | 'light' | 'gym';
export interface DayPlan {
  day: Day;
  name: string;
  kind: 'lifts' | 'cardio'; // a cardio day has no lifts and opens the cardio log instead
}
export interface Program {
  id: ProgramId;
  name: string;
  blurb: string;
  days: DayPlan[];
  exercises: Exercise[]; // listed in A→B order within each day
}

export const DEFAULT_PROGRAM: ProgramId = 'overload';

const A = (id: string, day: Day, name: string, extra: Partial<Exercise> = {}): Exercise => ({
  id, day, role: 'A', name, prescription: extra.perSide ? `Sets to failure per ${extra.perSide}` : 'Sets to failure', load: 'weight', ...extra,
});
const B = (id: string, day: Day, name: string, sets: number, reps: number, extra: Partial<Exercise> = {}): Exercise => ({
  id, day, role: 'B', name, prescription: `${sets}×${reps}${extra.perSide ? ` per ${extra.perSide}` : ''}`, load: 'weight', scheme: { sets, reps }, ...extra,
});

// An exercise shared by several routines keeps one id, so its history follows a person
// who switches. Ids never change once released.
export const PROGRAMS: Record<ProgramId, Program> = {
  overload: {
    id: 'overload',
    name: 'Overload',
    blurb: 'Heavy barbell lifts to failure, one muscle group a day, plus weekly cardio.',
    days: [
      { day: 1, name: 'Legs', kind: 'lifts' },
      { day: 2, name: 'Arms', kind: 'lifts' },
      { day: 3, name: 'Chest & shoulders', kind: 'lifts' },
      { day: 4, name: 'Back', kind: 'lifts' },
      { day: 5, name: 'Cardio', kind: 'cardio' },
    ],
    exercises: [
      A('barbell-squat', 1, 'Barbell squat'),
      A('front-squat', 1, 'Front squat'),
      B('tempo-barbell-squat', 1, 'Tempo barbell squat', 3, 8, { prescription: '3×8, 3 s lowering' }),
      B('tempo-goblet-squat', 1, 'Tempo goblet squat', 3, 10, { prescription: '3×10, 3 s lowering' }),

      A('barbell-curl', 2, 'Barbell curl'),
      A('single-arm-hammer-curl', 2, 'Single-arm hammer curl', { perSide: 'arm' }),
      B('zottman-curl', 2, 'Zottman curl', 3, 12),
      B('wrist-flexor-curl', 2, 'Wrist flexor curl', 3, 15),

      A('bench-press', 3, 'Barbell bench press'),
      B('db-overhead-press', 3, 'Seated dumbbell overhead press', 3, 12),

      A('bent-over-row', 4, 'Barbell bent-over row'),
      B('romanian-deadlift', 4, 'Barbell Romanian deadlift', 3, 12),
    ],
  },
  cardio: {
    id: 'cardio',
    name: 'Cardio focus',
    blurb: 'Three cardio days and two short full-body lifting days.',
    days: [
      { day: 1, name: 'Cardio', kind: 'cardio' },
      { day: 2, name: 'Full body A', kind: 'lifts' },
      { day: 3, name: 'Cardio', kind: 'cardio' },
      { day: 4, name: 'Full body B', kind: 'lifts' },
      { day: 5, name: 'Cardio', kind: 'cardio' },
    ],
    exercises: [
      A('goblet-squat', 2, 'Goblet squat'),
      B('db-bench-press', 2, 'Dumbbell bench press', 3, 12),
      B('seated-cable-row', 2, 'Seated cable row', 3, 12),

      A('db-romanian-deadlift', 4, 'Dumbbell Romanian deadlift'),
      B('lat-pulldown', 4, 'Lat pulldown', 3, 12),
      B('db-shoulder-press', 4, 'Dumbbell shoulder press', 3, 12),
    ],
  },
  light: {
    id: 'light',
    name: 'Light volume',
    blurb: 'Lighter weights and more reps: one light set to failure, then high-rep work.',
    days: [
      { day: 1, name: 'Legs', kind: 'lifts' },
      { day: 2, name: 'Arms', kind: 'lifts' },
      { day: 3, name: 'Chest', kind: 'lifts' },
      { day: 4, name: 'Back', kind: 'lifts' },
      { day: 5, name: 'Cardio', kind: 'cardio' },
    ],
    exercises: [
      A('goblet-squat', 1, 'Goblet squat'),
      B('walking-lunge', 1, 'Walking lunge', 4, 12, { perSide: 'leg' }),
      B('leg-press', 1, 'Leg press', 4, 15),
      B('standing-calf-raise', 1, 'Standing calf raise', 4, 20),

      A('db-curl', 2, 'Dumbbell curl'),
      B('cable-triceps-pushdown', 2, 'Cable triceps pushdown', 4, 15),
      B('hammer-curl', 2, 'Hammer curl', 4, 15),
      B('overhead-db-triceps-extension', 2, 'Overhead dumbbell triceps extension', 4, 15),

      A('db-bench-press', 3, 'Dumbbell bench press'),
      B('incline-db-press', 3, 'Incline dumbbell press', 4, 12),
      B('cable-fly', 3, 'Cable fly', 4, 15),

      A('lat-pulldown', 4, 'Lat pulldown'),
      B('seated-cable-row', 4, 'Seated cable row', 4, 15),
      B('face-pull', 4, 'Face pull', 4, 20),
    ],
  },
  gym: {
    id: 'gym',
    name: 'Gym volume',
    blurb: 'More volume on machines and cables, with a different exercise set.',
    days: [
      { day: 1, name: 'Legs', kind: 'lifts' },
      { day: 2, name: 'Arms', kind: 'lifts' },
      { day: 3, name: 'Chest & shoulders', kind: 'lifts' },
      { day: 4, name: 'Back', kind: 'lifts' },
      { day: 5, name: 'Cardio', kind: 'cardio' },
    ],
    exercises: [
      A('hack-squat', 1, 'Hack squat'),
      A('leg-press', 1, 'Leg press'),
      B('leg-extension', 1, 'Leg extension', 4, 12),
      B('lying-leg-curl', 1, 'Lying leg curl', 4, 12),

      A('ez-preacher-curl', 2, 'EZ-bar preacher curl'),
      A('close-grip-bench-press', 2, 'Close-grip bench press'),
      B('incline-db-curl', 2, 'Incline dumbbell curl', 4, 10),
      B('cable-overhead-triceps-extension', 2, 'Cable overhead triceps extension', 4, 12),

      A('incline-bench-press', 3, 'Incline barbell bench press'),
      B('machine-chest-press', 3, 'Machine chest press', 4, 10),
      B('pec-deck', 3, 'Pec deck', 4, 12),
      B('cable-lateral-raise', 3, 'Cable lateral raise', 4, 15),

      A('single-arm-db-row', 4, 'Single-arm dumbbell row', { perSide: 'arm' }),
      B('wide-grip-lat-pulldown', 4, 'Wide-grip lat pulldown', 4, 10),
      B('seated-cable-row', 4, 'Seated cable row', 4, 12),
      B('straight-arm-pulldown', 4, 'Straight-arm pulldown', 4, 12),
    ],
  },
};

export const PROGRAM_LIST: Program[] = [PROGRAMS.overload, PROGRAMS.cardio, PROGRAMS.light, PROGRAMS.gym];

// Unknown ids (e.g. from a newer app version) fall back to the default routine.
export const programOf = (id: ProgramId | undefined) => PROGRAMS[id ?? DEFAULT_PROGRAM] ?? PROGRAMS[DEFAULT_PROGRAM];
export const daysFor = (program?: ProgramId) => programOf(program).days;
export const isCardioDay = (day: Day, program?: ProgramId) => daysFor(program).find((d) => d.day === day)?.kind === 'cardio';
export const dayName = (day: Day, program?: ProgramId) => daysFor(program).find((d) => d.day === day)!.name;

export const isDeload = (week: number) => week % 4 === 0;

export function exercisesFor(day: Day, week: number, program?: ProgramId): Exercise[] {
  return programOf(program).exercises.filter((e) => e.day === day && (!isDeload(week) || e.role === 'B'));
}
