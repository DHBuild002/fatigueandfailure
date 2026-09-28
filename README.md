# Overload

A mobile-first, offline PWA for running the **Failure & Fatigue** routine: one fixed 5-day split across a 12-week block. Every exercise shows what you lifted last week, so you know the number to beat.

## Features (v1.0)

- **Workout logging.** Log weight × reps one set at a time, with no fixed set count. Each set saves as soon as you confirm it.
- **Previous performance and targets.** Each exercise shows its last best set and a target for this session. Same load +1 rep for failure (A) work; +2.5 kg / 5 lb (or the next band) for steady (B) work once every prescribed set was hit; deload weeks hold the load. The weight is pre-filled with the target, last week's sets are listed, and an up arrow marks any set that beats last week's matching set.
- **Set intensity.** Each set can be rated Easy / Moderate / Hard / Max. The rating shows on the set, in last week's summary, and beside the matching set when you log it the following week.
- **Rest timer.** A Rest button above Finish day counts down 30, 60 or 90 s (chosen on the day screen or in Settings): a red fill with a radial glow sweeps across the button and reaches the right edge at 0:00, then it beeps. Tap the button again to stop early. Manual by default; Settings can start it automatically after each logged set.
- **Routine template.** The 5 days are built in. The current week (1–12) comes from the start date, and weeks 4, 8 and 12 are deloads (A exercises hidden).
- **kg / lb.** Weights are stored in kg and converted for display, with steps of 2.5 kg or 5 lb.
- **Weekly cardio.** One entry per week: type, minutes and optional distance (km or mi).
- **Offline and installable.** A service worker precaches the app. Data lives in `localStorage` under `overload:v1`, and Settings can export it as JSON.

## Getting started

Requires Node 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
```

To try it on a phone on the same network, run `npm run dev -- --host` and open the printed network URL.

### Other scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Typecheck and build to `dist/` (includes the service worker and manifest) |
| `npm run preview` | Serve the production build at http://localhost:4173. Use this to test offline and install behaviour. |
| `npm test` | Unit tests for the week, deload, previous-week, "beats" and unit-conversion logic |
| `npm run lint` | oxlint |
| `npm run icons` | Regenerate the PWA icons in `public/` (dependency-free Node script) |

## Deploying

The live site is on **Netlify**. It builds `main` automatically (build command `npm run build`, output directory `dist`) and posts a deploy preview on every pull request.

`.github/workflows/ci.yml` runs lint, tests and a build on every pull request and on `main`. It doesn't deploy anything.

## Project structure

```
src/
  routine.ts        seed exercises, deload rule
  store.ts          State, localStorage load/save, useStore hook, selectors
  App.tsx           view switch (no router) + first-launch prompt
  screens/          Home, Session, Cardio, Settings
  components/       ExerciseCard, SetRow (SetEditor + SetRow), Stepper, Screen, Icons
scripts/gen-icons.mjs
```
