import { useEffect, useState, useSyncExternalStore } from 'react';

// Rest timer shared by the Session screen's bottom bar and the auto-start after a
// logged set. It stores an end time rather than ticking a counter, so it stays
// correct if the phone locks or the tab is backgrounded mid-rest.

interface Timer {
  endsAt: number | null;
  total: number; // seconds
}

let timer: Timer = { endsAt: null, total: 0 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let audio: AudioContext | null = null;

// Browsers only allow sound after a tap, so create the audio context from one.
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

function beep() {
  try {
    if (!audio) return;
    const t = audio.currentTime;
    for (const offset of [0, 0.25, 0.5]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.2);
    }
  } catch {
    // Sound is a bonus; the on-screen "Rest over" state is the real signal.
  }
  navigator.vibrate?.([200, 100, 200]);
}

let doneTimeout: ReturnType<typeof setTimeout> | undefined;

export function startRest(seconds: number) {
  unlockAudio();
  clearTimeout(doneTimeout);
  timer = { endsAt: Date.now() + seconds * 1000, total: seconds };
  doneTimeout = setTimeout(beep, seconds * 1000);
  emit();
}

export function stopRest() {
  clearTimeout(doneTimeout);
  timer = { endsAt: null, total: 0 };
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Whole seconds left in a rest, from the end time and the clock right now. Clamped to
// 0…total so it never shows more than the length chosen, even for an instant.
export function restRemaining(endsAt: number, total: number, now = Date.now()): number {
  return Math.min(total, Math.max(0, Math.ceil((endsAt - now) / 1000)));
}

export const isResting = () => timer.endsAt !== null && timer.endsAt > Date.now();

// Seconds left (0 when finished), or null when no rest is running.
// The time left is read from the clock on every render; the interval and the
// return-to-foreground listener only trigger those renders.
export function useRest(): { remaining: number | null; total: number; endsAt: number | null } {
  const t = useSyncExternalStore(subscribe, () => timer, () => timer);
  const [, tick] = useState(0);
  useEffect(() => {
    if (t.endsAt === null) return;
    const rerender = () => tick((n) => n + 1);
    const id = setInterval(rerender, 250);
    document.addEventListener('visibilitychange', rerender);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', rerender);
    };
  }, [t.endsAt]);
  if (t.endsAt === null) return { remaining: null, total: 0, endsAt: null };
  return { remaining: restRemaining(t.endsAt, t.total), total: t.total, endsAt: t.endsAt };
}

export const formatClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
