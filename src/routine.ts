// Seed routine: Failure & Fatigue. Hard-coded for v1 (no routine builder).

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

export const DAYS: { day: Day; name: string }[] = [
  { day: 1, name: 'Glutes' },
  { day: 2, name: 'Legs' },
  { day: 3, name: 'Arms' },
  { day: 4, name: 'Chest' },
  { day: 5, name: 'Back' },
];

// Listed in A→B order within each day. Day 3 is two failure curls then two steady
// curls, each stored as its own exercise so it keeps its own log.
export const EXERCISES: Exercise[] = [
  { id: 'barbell-squat', day: 1, role: 'A', name: 'Barbell squat', prescription: 'Sets to failure', load: 'weight' },
  { id: 'tempo-barbell-squat', day: 1, role: 'B', name: 'Tempo barbell squat', prescription: '3×8, 3 s lowering', load: 'weight', scheme: { sets: 3, reps: 8 } },

  { id: 'front-squat', day: 2, role: 'A', name: 'Front squat', prescription: 'Sets to failure', load: 'weight' },
  { id: 'tempo-goblet-squat', day: 2, role: 'B', name: 'Tempo goblet squat', prescription: '3×10, 3 s lowering', load: 'weight', scheme: { sets: 3, reps: 10 } },

  { id: 'barbell-curl', day: 3, role: 'A', name: 'Barbell curl', prescription: 'Sets to failure', load: 'weight' },
  { id: 'single-arm-hammer-curl', day: 3, role: 'A', name: 'Single-arm hammer curl', prescription: 'Sets to failure per arm', load: 'weight', perSide: 'arm' },
  { id: 'zottman-curl', day: 3, role: 'B', name: 'Zottman curl', prescription: '3×12', load: 'weight', scheme: { sets: 3, reps: 12 } },
  { id: 'wrist-flexor-curl', day: 3, role: 'B', name: 'Wrist flexor curl', prescription: '3×15', load: 'weight', scheme: { sets: 3, reps: 15 } },

  { id: 'bench-press', day: 4, role: 'A', name: 'Barbell bench press', prescription: 'Sets to failure', load: 'weight' },
  { id: 'db-overhead-press', day: 4, role: 'B', name: 'Dumbbell overhead press', prescription: '3×12', load: 'weight', scheme: { sets: 3, reps: 12 } },

  { id: 'bent-over-row', day: 5, role: 'A', name: 'Barbell bent-over row', prescription: 'Sets to failure', load: 'weight' },
  { id: 'romanian-deadlift', day: 5, role: 'B', name: 'Barbell Romanian deadlift', prescription: '3×12', load: 'weight', scheme: { sets: 3, reps: 12 } },
];

export const isDeload = (week: number) => week % 4 === 0;

export function exercisesFor(day: Day, week: number): Exercise[] {
  return EXERCISES.filter((e) => e.day === day && (!isDeload(week) || e.role === 'B'));
}

export const dayName = (day: Day) => DAYS.find((d) => d.day === day)!.name;
