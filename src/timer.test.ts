import { describe, expect, it } from 'vitest';
import { formatClock, restRemaining } from './timer';

describe('restRemaining', () => {
  const start = 1_000_000;
  const ends = (seconds: number) => start + seconds * 1000;

  it('starts at exactly the chosen length', () => {
    for (const s of [30, 60, 90]) expect(restRemaining(ends(s), s, start)).toBe(s);
  });
  it('never shows more than the chosen length, even with an old clock reading', () => {
    // A clock reading from minutes before the rest started used to show e.g. 7:43.
    expect(restRemaining(ends(60), 60, start - 5 * 60_000)).toBe(60);
  });
  it('counts down one second at a time', () => {
    expect(restRemaining(ends(60), 60, start + 1)).toBe(60); // part-seconds round up
    expect(restRemaining(ends(60), 60, start + 1000)).toBe(59);
    expect(restRemaining(ends(60), 60, start + 30_500)).toBe(30);
    expect(restRemaining(ends(60), 60, start + 59_001)).toBe(1);
  });
  it('stops at zero', () => {
    expect(restRemaining(ends(60), 60, start + 60_000)).toBe(0);
    expect(restRemaining(ends(60), 60, start + 120_000)).toBe(0);
  });
  it('formats as m:ss', () => {
    expect([90, 60, 30, 5, 0].map(formatClock)).toEqual(['1:30', '1:00', '0:30', '0:05', '0:00']);
  });
});
