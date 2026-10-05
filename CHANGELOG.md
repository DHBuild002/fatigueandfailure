# Changelog

## 2.0.1

- Rest timer always counts down from the length you chose. It could briefly show a higher number (e.g. 1:09 for a 60 s rest) when started, and changing 30/60/90 s mid-rest now restarts the countdown at the new length.

## 2.0.0

- Invite-only accounts: sign in with an emailed code, each person's data private to them.
- Offline-first cloud sync across devices: changes upload shortly after they're made, and the latest copy loads when the app opens. On first sign-in, data already on the phone is merged into the account, not replaced.
- Four routines to pick from on the welcome screen or in Settings: Overload, Cardio focus, Light volume and Gym volume. An exercise shared between routines keeps one history.
- Cardio is logged per cardio day, so routines can have several. Existing weekly entries move to Day 5.

## 1.3.0

- Targets use your set ratings. A failure set rated Easy means go heavier next week (+5 kg / +10 lb at the same reps); Moderate adds one step. Steady lifts where every set was Easy jump two steps instead of one.
- New Progress view for each weighted exercise: estimated max week by week, your best set, change since week 1, and a projection of where you could be by week 12, shown as a working set (e.g. "≈ 120 kg × 8"). The projection is capped at 1.5% a week so it stays realistic.

## 1.2.0

- Settings → Data → Import JSON restores a backup made with Export JSON, for example after reinstalling the app. It shows what's in the file and asks before replacing anything. Backups from older versions are updated to the current day order.

## 1.1.0

- Red-on-white theme, lighter number styling and tighter corners.
- Each exercise shows your last best and a target for the next attempt.
- Rest timer (30/60/90 s) with an animated Rest button. Auto-start is a Settings toggle, off by default.
- Rate each set: Easy, Moderate, Hard or Max.
- New day order: Day 1 Legs, Day 2 Arms, Day 3 Chest, Day 4 Back, Day 5 Cardio. Existing done ticks move to the new days automatically.
- Exercise swaps for Legs and Arms, and a dumbbell overhead press on Chest.
- Buttons sit clear of the Netlify badge, and inputs fit an iPhone 14 Pro Max.

## 1.0.0

- First release: a 5-day, 12-week routine with deload weeks, set logging, last week's numbers, weekly cardio, kg/lb, JSON export, offline and installable.
