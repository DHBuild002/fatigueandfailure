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
  perLeg?: boolean;
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

// Listed in A→B order within each day. Day 3 pairs are stored as four
// separate exercises so each keeps its own log.
export const EXERCISES: Exercise[] = [
  { id: 'bulgarian-split-squat', day: 1, role: 'A', name: 'Dumbbell Bulgarian split squat', prescription: 'Sets to failure per leg', load: 'weight', perLeg: true },
  { id: 'hip-thrust', day: 1, role: 'B', name: 'Barbell hip thrust', prescription: '3×15, 2 s hold at top', load: 'weight', scheme: { sets: 3, reps: 15 } },

  { id: 'goblet-squat', day: 2, role: 'A', name: 'Dumbbell goblet squat', prescription: 'Sets to failure', load: 'weight' },
  { id: 'walking-lunge', day: 2, role: 'B', name: 'Walking lunges (dumbbells)', prescription: '3×16 (8/leg)', load: 'weight', scheme: { sets: 3, reps: 16 } },

  { id: 'barbell-curl', day: 3, role: 'A', name: 'Barbell curl', prescription: 'Failure pair, back-to-back with tricep extension', load: 'weight' },
  { id: 'db-overhead-tricep-extension', day: 3, role: 'A', name: 'DB overhead tricep extension', prescription: 'Failure pair, straight after curl', load: 'weight' },
  { id: 'band-curl', day: 3, role: 'B', name: 'Band curl', prescription: '3×15, paired with pushdown', load: 'band', scheme: { sets: 3, reps: 15 } },
  { id: 'band-tricep-pushdown', day: 3, role: 'B', name: 'Band tricep pushdown', prescription: '3×15, paired with curl', load: 'band', scheme: { sets: 3, reps: 15 } },

  { id: 'bench-press', day: 4, role: 'A', name: 'Barbell bench press', prescription: 'Sets to failure', load: 'weight' },
  { id: 'floor-press', day: 4, role: 'B', name: 'Barbell floor press', prescription: '3×12', load: 'weight', scheme: { sets: 3, reps: 12 } },

  { id: 'bent-over-row', day: 5, role: 'A', name: 'Barbell bent-over row', prescription: 'Sets to failure', load: 'weight' },
  { id: 'romanian-deadlift', day: 5, role: 'B', name: 'Barbell Romanian deadlift', prescription: '3×12', load: 'weight', scheme: { sets: 3, reps: 12 } },
];

export const isDeload = (week: number) => week % 4 === 0;

export function exercisesFor(day: Day, week: number): Exercise[] {
  return EXERCISES.filter((e) => e.day === day && (!isDeload(week) || e.role === 'B'));
}

export const dayName = (day: Day) => DAYS.find((d) => d.day === day)!.name;
