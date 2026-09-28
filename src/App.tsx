import { useEffect, useState } from 'react';
import { isCardioDay, type Day } from './routine';
import { currentWeek, setStartDate, todayISO, useStore } from './store';
import { Home } from './screens/Home';
import { Session } from './screens/Session';
import { Cardio } from './screens/Cardio';
import { Settings } from './screens/Settings';
import { PrimaryButton, Screen } from './components/Screen';
import { SignIn } from './screens/SignIn';
import { initAccount, useAccount } from './account';

type View = { name: 'home' } | { name: 'session'; day: Day } | { name: 'cardio' } | { name: 'settings' };

export default function App() {
  const account = useAccount();
  useEffect(() => {
    void initAccount();
  }, []);

  if (account.status === 'checking' || account.status === 'loading') {
    return <Loading text={account.status === 'loading' ? 'Loading your training…' : 'Loading…'} />;
  }
  if (account.status === 'signed-out') return <SignIn />;
  // Remount per user so screen state (open day, browsed week) never carries across accounts.
  return <MainApp key={account.status === 'signed-in' ? account.user.id : 'local'} />;
}

function Loading({ text }: { text: string }) {
  return (
    <div className="min-h-dvh grid place-items-center px-5" role="status">
      <p className="text-zinc-600">{text}</p>
    </div>
  );
}

function MainApp() {
  const state = useStore();
  const current = currentWeek(state.startDate);
  useForegroundRefresh();
  const [view, setView] = useState<View>({ name: 'home' });
  const [week, setWeek] = useState(current);

  // Follow the calendar when the start date changes (first launch, settings, reset).
  const [seenCurrent, setSeenCurrent] = useState(current);
  if (current !== seenCurrent) {
    setSeenCurrent(current);
    setWeek(current);
  }
  // Block body: an effect must return nothing or a cleanup function. Some embedded
  // browsers make scrollTo return a value, which React would then call as a cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  if (!state.startDate) return <FirstLaunch />;

  const home = () => setView({ name: 'home' });

  switch (view.name) {
    case 'session':
      // The cardio day has no lifts; it always uses the cardio log.
      if (isCardioDay(view.day)) return <Cardio state={state} week={week} onBack={home} />;
      return <Session state={state} week={week} day={view.day} onBack={home} />;
    case 'cardio':
      return <Cardio state={state} week={week} onBack={home} />;
    case 'settings':
      return <Settings state={state} onBack={home} />;
    default:
      return (
        <Home
          state={state}
          week={week}
          current={current}
          onWeek={setWeek}
          onDay={(day) => setView({ name: 'session', day })}
          onCardio={() => setView({ name: 'cardio' })}
          onSettings={() => setView({ name: 'settings' })}
        />
      );
  }
}

// Re-render when the app comes back to the foreground, so an app left open
// over a week boundary moves on to the new week.
function useForegroundRefresh() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}

function FirstLaunch() {
  const [date, setDate] = useState(todayISO());
  return (
    <Screen title="Overload" action={<PrimaryButton disabled={!date} onClick={() => setStartDate(date)}>Start</PrimaryButton>}>
      <p className="text-zinc-700">Failure &amp; Fatigue: a 5-day routine over 12 weeks, with a deload every 4th week.</p>
      <label className="block space-y-2">
        <span className="block text-2xl font-semibold">When does week 1 start?</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 w-full rounded-xl bg-white border border-zinc-300 px-4 text-lg focus:outline-none focus:border-red-600"
        />
      </label>
      <p className="text-sm text-zinc-600">Weights are in kg by default. You can switch to lb in Settings.</p>
    </Screen>
  );
}
