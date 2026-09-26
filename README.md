# Overload

A mobile-first, offline PWA for running the **Failure & Fatigue** routine: one fixed 5-day split across a 12-week block. Every exercise shows what you lifted last week, so you know the number to beat.

## Features (v1.0)

- **Workout logging.** Log weight × reps one set at a time, with no fixed set count. Each set saves as soon as you confirm it.
- **Previous performance and targets.** Each exercise shows its last best set and a target for this session. Same load +1 rep for failure (A) work; +2.5 kg / 5 lb (or the next band) for steady (B) work once every prescribed set was hit; deload weeks hold the load. The weight is pre-filled with the target, last week's sets are listed, and an up arrow marks any set that beats last week's matching set.
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

`dist/` is a static site with a relative base path, so it works on Vercel, Netlify or GitHub Pages (including a `/repo-name/` sub-path) without configuration changes.

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
