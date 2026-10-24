import { describe, expect, it, vi } from 'vitest';
import { backupAgeText, lastBackupAt, markBackedUp } from './backup';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('backupAgeText', () => {
  it('says never with no backup, or a bad date', () => {
    expect(backupAgeText(null)).toBe('never');
    expect(backupAgeText('nonsense')).toBe('never');
  });
  it('counts calendar days, not 24-hour blocks', () => {
    const now = at(2026, 10, 24, 9);
    expect(backupAgeText(at(2026, 10, 24, 1).toISOString(), now)).toBe('today');
    expect(backupAgeText(at(2026, 10, 23, 23).toISOString(), now)).toBe('yesterday');
    expect(backupAgeText(at(2026, 10, 21).toISOString(), now)).toBe('3 days ago');
  });
});

describe('last backup time', () => {
  it('is remembered on the device', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
    expect(lastBackupAt()).toBeNull();
    markBackedUp(at(2026, 10, 24));
    expect(lastBackupAt()).toBe(at(2026, 10, 24).toISOString());
    vi.unstubAllGlobals();
  });
  it('copes with storage being unavailable', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(() => markBackedUp()).not.toThrow();
    expect(lastBackupAt()).toBeNull();
    vi.unstubAllGlobals();
  });
});
