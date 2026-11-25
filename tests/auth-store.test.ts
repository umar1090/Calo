import { describe, expect, it, beforeEach } from 'vitest';
import { LocalAuth, AuthError, type KeyValueStore } from '@/lib/auth/localAuth';
import { UserStore, MemoryPersistence, ValidationError, type Persistence } from '@/lib/store/userStore';
import { emptyDB } from '@/lib/store/schema';
import { adult, entry, teen } from './fixtures';

class MemStore implements KeyValueStore {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('local authentication', () => {
  let local: MemStore;
  let session: MemStore;
  let now: number;
  let auth: LocalAuth;
  beforeEach(() => {
    local = new MemStore();
    session = new MemStore();
    now = Date.parse('2026-11-25T10:00:00Z');
    auth = new LocalAuth({ local, session, iterations: 1000, now: () => now });
  });

  it('validates email and password strength', async () => {
    await expect(auth.signUp('not-an-email', 'abc12345')).rejects.toMatchObject({ code: 'invalid_email' });
    await expect(auth.signUp('a@b.co', 'short1')).rejects.toMatchObject({ code: 'weak_password' });
    await expect(auth.signUp('a@b.co', 'onlyletters')).rejects.toMatchObject({ code: 'weak_password' });
  });

  it('signs up, stores no password and encrypts data at rest', async () => {
    const { session: s } = await auth.signUp('Asha@Example.com', 'mangoes2026');
    expect(s.email).toBe('asha@example.com');
    const store = new UserStore(emptyDB(), auth.persistenceFor(s));
    await store.saveProfile(adult);
    const everything = [...local.map.values()].join('\n');
    expect(everything).not.toContain('mangoes2026');
    expect(everything).not.toContain('Asha Rao');
    expect(everything).not.toContain('south_indian');
  });

  it('signs in with the right password and loads decrypted data', async () => {
    const { session: s } = await auth.signUp('asha@example.com', 'mangoes2026');
    const store = new UserStore(emptyDB(), auth.persistenceFor(s));
    await store.saveProfile(adult);
    auth.signOut();
    const again = await auth.signIn('asha@example.com', 'mangoes2026');
    expect(again.db.profile?.name).toBe('Asha Rao');
  });

  it('rejects wrong passwords and locks out after repeated attempts', async () => {
    await auth.signUp('asha@example.com', 'mangoes2026');
    for (let i = 0; i < 4; i++) await expect(auth.signIn('asha@example.com', 'wrongpass1')).rejects.toMatchObject({ code: 'wrong_password' });
    await expect(auth.signIn('asha@example.com', 'wrongpass1')).rejects.toMatchObject({ code: 'locked' });
    await expect(auth.signIn('asha@example.com', 'mangoes2026')).rejects.toMatchObject({ code: 'locked' });
    now += 31_000;
    await expect(auth.signIn('asha@example.com', 'mangoes2026')).resolves.toBeTruthy();
  });

  it('prevents duplicate accounts and unknown sign-ins', async () => {
    await auth.signUp('asha@example.com', 'mangoes2026');
    await expect(auth.signUp('asha@example.com', 'another123')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.signIn('nobody@example.com', 'mangoes2026')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('isolates users: one user cannot decrypt another user’s data', async () => {
    const a = await auth.signUp('a@example.com', 'mangoes2026');
    await new UserStore(emptyDB(), auth.persistenceFor(a.session)).saveProfile(adult);
    const b = await auth.signUp('b@example.com', 'guavas2026');
    const bStore = new UserStore(b.db, auth.persistenceFor(b.session));
    expect(bStore.getSnapshot().profile).toBeNull();
    // Tamper: point B's session at A's data. Decryption must fail and the session is dropped.
    const raw = JSON.parse(session.getItem('nt.session.v1')!);
    session.setItem('nt.session.v1', JSON.stringify({ ...raw, userId: a.session.userId }));
    expect(await auth.restoreSession()).toBeNull();
  });

  it('restores a session after reload, and remember-me uses persistent storage', async () => {
    await auth.signUp('asha@example.com', 'mangoes2026');
    expect(session.getItem('nt.session.v1')).not.toBeNull();
    expect((await auth.restoreSession())?.session.email).toBe('asha@example.com');
    await auth.signIn('asha@example.com', 'mangoes2026', true);
    expect(session.getItem('nt.session.v1')).toBeNull();
    expect(local.getItem('nt.session.v1')).not.toBeNull();
    auth.signOut();
    expect(await auth.restoreSession()).toBeNull();
  });

  it('changes password and re-encrypts data', async () => {
    const { session: s } = await auth.signUp('asha@example.com', 'mangoes2026');
    const store = new UserStore(emptyDB(), auth.persistenceFor(s));
    await store.saveProfile(adult);
    await expect(auth.changePassword(s, 'nope12345', 'papayas2027', store.getSnapshot())).rejects.toMatchObject({ code: 'wrong_password' });
    await auth.changePassword(s, 'mangoes2026', 'papayas2027', store.getSnapshot());
    auth.signOut();
    await expect(auth.signIn('asha@example.com', 'mangoes2026')).rejects.toBeInstanceOf(AuthError);
    expect((await auth.signIn('asha@example.com', 'papayas2027')).db.profile?.name).toBe('Asha Rao');
  });

  it('deletes an account and its data', async () => {
    const { session: s } = await auth.signUp('asha@example.com', 'mangoes2026');
    auth.deleteAccount(s.userId);
    expect(auth.listAccounts()).toEqual([]);
    expect([...local.map.keys()].some((k) => k.includes(s.userId))).toBe(false);
  });
});

describe('user data store', () => {
  const D = '2026-11-25';
  const make = () => {
    const p = new MemoryPersistence();
    return { p, store: new UserStore(emptyDB(), p, () => new Date(`${D}T12:00:00`)) };
  };

  it('validates the profile', async () => {
    const { store } = make();
    expect(() => store.saveProfile({ ...adult, age: 5 })).toThrow(ValidationError);
    expect(() => store.saveProfile({ ...adult, heightCm: 20 })).toThrow(/Height/);
    expect(() => store.saveProfile({ ...adult, goals: [] })).toThrow(/goal/);
    await store.saveProfile(adult);
    expect(store.getSnapshot().profile?.age).toBe(30);
  });

  it('turns weight tracking off by default for under-18s', async () => {
    const { store } = make();
    await store.savePreferences({ trackWeight: true });
    await store.saveProfile(teen);
    expect(store.getSnapshot().preferences.trackWeight).toBe(false);
  });

  it('adds, edits and deletes meal entries and persists each change', async () => {
    const { store, p } = make();
    const e1 = entry('roti', 'lunch', D, 2);
    const e2 = entry('dal-tadka', 'lunch', D);
    await store.addEntries([e1, e2]);
    expect(store.getSnapshot().entries).toHaveLength(2);
    await store.updateEntry(e1.id, { quantity: 3, nutrients: { ...e1.nutrients, kcal: 350 }, edited: true });
    expect(store.getSnapshot().entries.find((e) => e.id === e1.id)?.nutrients.kcal).toBe(350);
    await store.deleteEntry(e2.id);
    expect(store.getSnapshot().entries.map((e) => e.id)).toEqual([e1.id]);
    expect(p.saved?.entries).toHaveLength(1);
    expect(p.saves).toBe(3);
  });

  it('rejects invalid entries', () => {
    const { store } = make();
    expect(() => store.addEntries([{ ...entry('roti', 'lunch', D), foodName: '' }])).toThrow(ValidationError);
    expect(() => store.addEntries([{ ...entry('roti', 'lunch', D), nutrients: { kcal: -5, protein: 0, carbs: 0, fat: 0, fiber: 0 } }])).toThrow(/Calories/);
    expect(() => store.updateEntry('missing', { quantity: 1 })).toThrow(/not found/);
  });

  it('tracks water, check-ins, habits, plan checks and exercise', async () => {
    const { store } = make();
    await store.addWater(D, 250);
    await store.addWater(D, 250);
    await store.removeLastWater(D);
    expect(store.getSnapshot().water).toHaveLength(1);
    await store.setCheckIn({ date: D, energy: 4, fatigue: 2 });
    await store.setCheckIn({ date: D, energy: 2, fatigue: 4 });
    expect(store.getSnapshot().checkIns).toEqual([{ date: D, energy: 2, fatigue: 4 }]);
    await store.toggleHabit(D, 'screen');
    await store.toggleHabit(D, 'screen');
    expect(store.getSnapshot().habitLogs).toEqual([]);
    await store.togglePlanCheck(D, 'warmup');
    expect(store.getSnapshot().planChecks[D]).toEqual(['warmup']);
    const log = await store.addExercise({ date: D, activity: 'bodyweight', minutes: 25, intensity: 'moderate' });
    expect(log.strength).toBe(true);
    await store.updateExercise(log.id, { minutes: 30 });
    expect(store.getSnapshot().exercise[0].minutes).toBe(30);
    expect(() => store.addExercise({ date: D, activity: 'walking', minutes: 0, intensity: 'light' })).toThrow(/Duration/);
  });

  it('creates custom foods with per-100 g values', async () => {
    const { store } = make();
    const f = await store.addCustomFood({ name: 'Ragi dosa (mom)', portionLabel: '1 dosa', grams: 80, kcal: 120, protein: 3, carbs: 22, fat: 2, fiber: 2 });
    expect(f.per100.kcal).toBe(150);
    expect(f.custom).toBe(true);
    expect(() => store.addCustomFood({ name: 'x', portionLabel: '', grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })).toThrow(ValidationError);
  });

  it('computes weekly progress summaries', async () => {
    const { store } = make();
    await store.addEntries([entry('roti', 'lunch', D, 2), entry('dal-tadka', 'dinner', D), entry('poha', 'breakfast', '2026-11-24')]);
    await store.addExercise({ date: D, activity: 'walking', minutes: 30, intensity: 'moderate' });
    await store.refreshWeeklyProgress(D, 2);
    const week = store.getSnapshot().weeklyProgress.find((w) => w.weekStart === '2026-11-23')!;
    expect(week.daysLogged).toBe(2);
    expect(week.activeMinutes).toBe(30);
    expect(week.avgMealsPerDay).toBe(1.5);
  });

  it('exports and imports a backup without the API key', async () => {
    const { store } = make();
    await store.saveProfile(adult);
    await store.savePreferences({ claudeApiKey: 'sk-ant-secret' });
    await store.addEntries([entry('idli', 'breakfast', D)]);
    const json = store.exportBackup();
    expect(json).not.toContain('sk-ant-secret');
    const other = make().store;
    await other.importBackup(json);
    expect(other.getSnapshot().entries).toHaveLength(1);
    expect(other.getSnapshot().profile?.name).toBe('Asha Rao');
    expect(() => other.importBackup('{"app":"other"}')).toThrow(ValidationError);
    expect(() => other.importBackup('not json')).toThrow(/valid JSON/);
  });

  it('keeps saving after a storage failure', async () => {
    let fail = true;
    const saved: number[] = [];
    const flaky: Persistence = {
      save: async (db) => {
        if (fail) throw new Error('quota');
        saved.push(db.entries.length);
      },
    };
    const store = new UserStore(emptyDB(), flaky);
    await expect(store.addEntries([entry('roti', 'lunch', D)])).rejects.toThrow('quota');
    expect(store.lastError?.message).toBe('quota');
    fail = false;
    await store.addEntries([entry('rice', 'lunch', D)]);
    expect(saved).toEqual([2]);
    expect(store.lastError).toBeNull();
  });
});
