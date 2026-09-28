import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cloud } from './cloudTypes';
import { mergeStates, resolve } from './merge';
import { addSet, emptyState, getState, replaceState, STORAGE_KEY, switchUser, userStorageKey, type SetLog, type State } from './store';
import { createSync, getSyncStatus } from './sync';

// ---- helpers ----

const set = (at: string, reps = 10, weightKg = 60): SetLog => ({ weightKg, reps, at });
const doc = (over: Partial<State>): State => ({ ...emptyState(), ...over });
const T1 = '2026-09-01T10:00:00.000Z';
const T2 = '2026-09-02T10:00:00.000Z';
const T3 = '2026-09-03T10:00:00.000Z';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    _map: m,
  };
}

function fakeCloud() {
  const rows = new Map<string, State>();
  let online = true;
  const cloud: Cloud & { rows: Map<string, State>; setOnline(v: boolean): void; pushes: number } = {
    rows,
    pushes: 0,
    setOnline(v) {
      online = v;
    },
    async getUser() {
      return null;
    },
    onAuthChange() {
      return () => {};
    },
    async sendCode() {},
    async verifyCode() {
      return { id: 'u1', email: 'a@b.c' };
    },
    async signOut() {},
    async pull(id) {
      if (!online) throw new Error('offline');
      return rows.get(id) ?? null;
    },
    async push(id, s) {
      if (!online) throw new Error('offline');
      cloud.pushes++;
      rows.set(id, JSON.parse(JSON.stringify(s)));
    },
  };
  return cloud;
}

// ---- merge ----

describe('mergeStates', () => {
  it('unions sets per exercise and de-duplicates by log time', () => {
    const a = doc({ updatedAt: T1, logs: { '1:squat': [set('A1'), set('A2')] } });
    const b = doc({ updatedAt: T2, logs: { '1:squat': [set('A2', 12), set('B1')], '1:curl': [set('C1')] } });
    const m = mergeStates(a, b);
    expect(m.logs['1:squat'].map((s) => s.at)).toEqual(['A1', 'A2', 'B1']);
    expect(m.logs['1:squat'].find((s) => s.at === 'A2')!.reps).toBe(12); // newer copy wins a clash
    expect(m.logs['1:curl']).toHaveLength(1);
  });
  it('keeps a day done if either copy says so, and takes settings from the newer copy', () => {
    const a = doc({ updatedAt: T2, unit: 'lb', startDate: '2026-09-01', daysDone: { '1:1': true } });
    const b = doc({ updatedAt: T1, unit: 'kg', startDate: '', daysDone: { '1:2': true } });
    const m = mergeStates(a, b);
    expect(m.daysDone).toEqual({ '1:1': true, '1:2': true });
    expect(m.unit).toBe('lb');
    expect(m.startDate).toBe('2026-09-01');
  });
  it('stamps the result newer than both inputs', () => {
    const m = mergeStates(doc({ updatedAt: T1 }), doc({ updatedAt: T2 }));
    expect(Date.parse(m.updatedAt)).toBeGreaterThanOrEqual(Date.parse(T2));
  });
});

describe('resolve', () => {
  it('pushes when the cloud has nothing yet', () => {
    expect(resolve(doc({ startDate: '2026-09-01' }), null, '')).toBe('push');
    expect(resolve(emptyState(), null, '')).toBe('none');
  });
  it('takes the cloud copy on a fresh device', () => {
    expect(resolve(emptyState(), doc({ updatedAt: T2, startDate: 'x' }), '')).toBe('take-remote');
  });
  it('merges on first sign-in when both sides have data, even if local has no timestamp', () => {
    const oldLocal = doc({ startDate: '2026-09-01', logs: { '1:squat': [set('A1')] } }); // saved before updatedAt existed
    expect(resolve(oldLocal, doc({ updatedAt: T2, startDate: '2026-09-01' }), '')).toBe('merge');
  });
  it('pushes local edits and takes remote edits after a previous sync', () => {
    expect(resolve(doc({ updatedAt: T3, startDate: 'x' }), doc({ updatedAt: T2 }), T2)).toBe('push');
    expect(resolve(doc({ updatedAt: T2, startDate: 'x' }), doc({ updatedAt: T3 }), T2)).toBe('take-remote');
  });
  it('merges when both changed since the last sync', () => {
    expect(resolve(doc({ updatedAt: T3, startDate: 'x' }), doc({ updatedAt: T2 }), T1)).toBe('merge');
  });
  it('does nothing when both copies match', () => {
    expect(resolve(doc({ updatedAt: T2, startDate: 'x' }), doc({ updatedAt: T2 }), T2)).toBe('none');
  });
});

// ---- store: per-user slots ----

describe('switchUser', () => {
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => {
    switchUser(null);
    vi.unstubAllGlobals();
  });

  it("adopts pre-account data into the first user's slot, once", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(doc({ startDate: '2026-09-01' })));
    switchUser('alice');
    expect(getState().startDate).toBe('2026-09-01');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(userStorageKey('alice'))).not.toBeNull();

    switchUser('bob'); // a second person on the same phone starts empty
    expect(getState().startDate).toBe('');
  });

  it('stamps local changes but not replaced copies', () => {
    switchUser('alice');
    replaceState(doc({ startDate: 'x', updatedAt: T1 }));
    expect(getState().updatedAt).toBe(T1);
    addSet(1, 'squat', set('A1'));
    expect(Date.parse(getState().updatedAt)).toBeGreaterThan(Date.parse(T1));
  });
});

// ---- sync engine ----

describe('createSync', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    switchUser('u1');
  });
  afterEach(() => {
    vi.useRealTimers();
    switchUser(null);
    vi.unstubAllGlobals();
  });

  it('uploads existing data on first sign-in and records the sync', async () => {
    replaceState(doc({ startDate: '2026-09-01', logs: { '1:squat': [set('A1')] } }));
    const cloud = fakeCloud();
    const sync = createSync(cloud, 'u1');
    await sync.start();
    expect(cloud.rows.get('u1')!.logs['1:squat']).toHaveLength(1);
    expect(getSyncStatus().phase).toBe('synced');
    sync.stop();
  });

  it('loads the cloud copy on a new device', async () => {
    const cloud = fakeCloud();
    cloud.rows.set('u1', doc({ startDate: '2026-09-01', updatedAt: T2, logs: { '1:squat': [set('A1')] } }));
    const sync = createSync(cloud, 'u1');
    await sync.start();
    expect(getState().startDate).toBe('2026-09-01');
    expect(cloud.pushes).toBe(0);
    sync.stop();
  });

  it('merges instead of overwriting when both sides already have data', async () => {
    replaceState(doc({ startDate: '2026-09-01', logs: { '1:squat': [set('LOCAL')] } }));
    const cloud = fakeCloud();
    cloud.rows.set('u1', doc({ startDate: '2026-09-01', updatedAt: T2, logs: { '1:squat': [set('REMOTE')] } }));
    const sync = createSync(cloud, 'u1');
    await sync.start();
    const ats = getState().logs['1:squat'].map((s) => s.at).sort();
    expect(ats).toEqual(['LOCAL', 'REMOTE']);
    expect(cloud.rows.get('u1')!.logs['1:squat']).toHaveLength(2);
    sync.stop();
  });

  it('pushes a logged set after the debounce', async () => {
    vi.useFakeTimers();
    const cloud = fakeCloud();
    const sync = createSync(cloud, 'u1', { debounceMs: 2000 });
    await sync.start();
    addSet(1, 'squat', set('A1'));
    expect(cloud.rows.get('u1')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2100);
    expect(cloud.rows.get('u1')!.logs['1:squat']).toHaveLength(1);
    sync.stop();
  });

  it('keeps changes while offline and sends them once back online', async () => {
    vi.useFakeTimers();
    const cloud = fakeCloud();
    let online = true;
    const sync = createSync(cloud, 'u1', { debounceMs: 100, retryMs: 1000, isOnline: () => online });
    await sync.start();

    online = false;
    cloud.setOnline(false);
    addSet(1, 'squat', set('A1'));
    await vi.advanceTimersByTimeAsync(200);
    expect(getSyncStatus().phase).toBe('offline');
    expect(getState().logs['1:squat']).toHaveLength(1); // still saved locally

    online = true;
    cloud.setOnline(true);
    await sync.syncNow(); // what the 'online' event triggers
    expect(cloud.rows.get('u1')!.logs['1:squat']).toHaveLength(1);
    expect(getSyncStatus().phase).toBe('synced');
    sync.stop();
  });

  it('retries after a server error', async () => {
    vi.useFakeTimers();
    const cloud = fakeCloud();
    replaceState(doc({ startDate: 'x', updatedAt: T1 }));
    cloud.setOnline(false); // server unreachable, though the phone reports online
    const sync = createSync(cloud, 'u1', { retryMs: 1000, isOnline: () => true });
    await sync.start();
    expect(getSyncStatus().phase).toBe('error');
    cloud.setOnline(true);
    await vi.advanceTimersByTimeAsync(1100);
    expect(getSyncStatus().phase).toBe('synced');
    expect(cloud.rows.get('u1')).toBeDefined();
    sync.stop();
  });
});
