import { z } from 'zod';
import {
  DEFAULT_ITERATIONS,
  decryptJSON,
  deriveKeys,
  encryptJSON,
  fromB64,
  importAesKey,
  randomBytes,
  randomId,
  safeEqual,
  toB64,
  type Sealed,
} from './crypto';
import { emptyDB, type UserDB } from '../store/schema';
import type { Persistence } from '../store/userStore';

/**
 * Device-local accounts.
 *
 * - Passwords are never stored. PBKDF2-SHA256 (310k iterations, random salt)
 *   derives 512 bits: one half verifies the password, the other half is the
 *   AES-256-GCM key that encrypts this user's data.
 * - Each user's data is stored encrypted under its own key, so other people
 *   using the same browser cannot read it without the password.
 * - Repeated wrong passwords trigger a short lock-out.
 */

export interface Account {
  id: string;
  email: string;
  salt: string;
  iterations: number;
  verifier: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  key: CryptoKey;
}

interface StoredSession {
  userId: string;
  email: string;
  k: string;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'invalid_email' | 'weak_password' | 'exists' | 'not_found' | 'wrong_password' | 'locked' | 'corrupt' | 'storage',
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: 'Enter a valid email address' }));
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Password is too long')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number');

const ACCOUNTS_KEY = 'nt.accounts.v1';
const SESSION_KEY = 'nt.session.v1';
const LOCK_KEY = 'nt.lock.v1';
const dataKey = (userId: string) => `nt.data.v1.${userId}`;

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

export interface LocalAuthOptions {
  local: KeyValueStore;
  session: KeyValueStore;
  iterations?: number;
  now?: () => number;
}

export class LocalAuth {
  private iterations: number;
  private now: () => number;
  constructor(private opts: LocalAuthOptions) {
    this.iterations = opts.iterations ?? DEFAULT_ITERATIONS;
    this.now = opts.now ?? (() => Date.now());
  }

  // ---------------------------------------------------------------- accounts
  listAccounts(): Account[] {
    try {
      const raw = this.opts.local.getItem(ACCOUNTS_KEY);
      return raw ? (JSON.parse(raw) as Account[]) : [];
    } catch {
      return [];
    }
  }

  private saveAccounts(list: Account[]) {
    this.write(this.opts.local, ACCOUNTS_KEY, JSON.stringify(list));
  }

  private write(store: KeyValueStore, key: string, value: string) {
    try {
      store.setItem(key, value);
    } catch {
      throw new AuthError('Your browser storage is full or blocked, so NutriTrack cannot save data. Free up space or allow site data, then try again.', 'storage');
    }
  }

  async signUp(emailInput: string, password: string, remember = false): Promise<{ session: Session; db: UserDB }> {
    const email = this.validEmail(emailInput);
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) throw new AuthError(pw.error.issues[0].message, 'weak_password');
    const accounts = this.listAccounts();
    if (accounts.some((a) => a.email === email)) throw new AuthError('An account with this email already exists on this device. Sign in instead.', 'exists');

    const salt = randomBytes(16);
    const { verifier, encKeyRaw } = await deriveKeys(password, salt, this.iterations);
    const account: Account = { id: randomId(), email, salt: toB64(salt), iterations: this.iterations, verifier, createdAt: new Date(this.now()).toISOString() };
    const key = await importAesKey(encKeyRaw);
    const db = emptyDB(new Date(this.now()));
    this.write(this.opts.local, dataKey(account.id), JSON.stringify(await encryptJSON(key, db)));
    this.saveAccounts([...accounts, account]);
    const session = { userId: account.id, email, key };
    this.storeSession(account, encKeyRaw, remember);
    return { session, db };
  }

  async signIn(emailInput: string, password: string, remember = false): Promise<{ session: Session; db: UserDB }> {
    const email = this.validEmail(emailInput);
    const lock = this.readLock(email);
    if (lock.until > this.now()) {
      const s = Math.ceil((lock.until - this.now()) / 1000);
      throw new AuthError(`Too many attempts. Try again in ${s} seconds.`, 'locked');
    }
    const account = this.listAccounts().find((a) => a.email === email);
    if (!account) throw new AuthError('No account with this email on this device. Create one to get started.', 'not_found');
    const { verifier, encKeyRaw } = await deriveKeys(password, fromB64(account.salt), account.iterations);
    if (!safeEqual(verifier, account.verifier)) {
      const attempts = lock.attempts + 1;
      this.writeLock(email, { attempts: attempts >= MAX_ATTEMPTS ? 0 : attempts, until: attempts >= MAX_ATTEMPTS ? this.now() + LOCK_MS : 0 });
      throw new AuthError(attempts >= MAX_ATTEMPTS ? 'Too many attempts. Try again in 30 seconds.' : 'That password does not match.', attempts >= MAX_ATTEMPTS ? 'locked' : 'wrong_password');
    }
    this.writeLock(email, { attempts: 0, until: 0 });
    const key = await importAesKey(encKeyRaw);
    const db = await this.loadData(account.id, key);
    this.storeSession(account, encKeyRaw, remember);
    return { session: { userId: account.id, email, key }, db };
  }

  async restoreSession(): Promise<{ session: Session; db: UserDB } | null> {
    const raw = this.opts.session.getItem(SESSION_KEY) ?? this.opts.local.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw) as StoredSession;
      const account = this.listAccounts().find((a) => a.id === s.userId);
      if (!account) throw new Error('missing account');
      const key = await importAesKey(fromB64(s.k));
      const db = await this.loadData(account.id, key);
      return { session: { userId: account.id, email: account.email, key }, db };
    } catch {
      this.signOut();
      return null;
    }
  }

  signOut() {
    this.opts.session.removeItem(SESSION_KEY);
    this.opts.local.removeItem(SESSION_KEY);
  }

  async changePassword(session: Session, currentPassword: string, newPassword: string, db: UserDB): Promise<Session> {
    const account = this.listAccounts().find((a) => a.id === session.userId);
    if (!account) throw new AuthError('Account not found.', 'not_found');
    const check = await deriveKeys(currentPassword, fromB64(account.salt), account.iterations);
    if (!safeEqual(check.verifier, account.verifier)) throw new AuthError('Your current password is not correct.', 'wrong_password');
    const pw = passwordSchema.safeParse(newPassword);
    if (!pw.success) throw new AuthError(pw.error.issues[0].message, 'weak_password');
    const salt = randomBytes(16);
    const { verifier, encKeyRaw } = await deriveKeys(newPassword, salt, this.iterations);
    const key = await importAesKey(encKeyRaw);
    this.write(this.opts.local, dataKey(account.id), JSON.stringify(await encryptJSON(key, db)));
    const updated: Account = { ...account, salt: toB64(salt), iterations: this.iterations, verifier };
    this.saveAccounts(this.listAccounts().map((a) => (a.id === account.id ? updated : a)));
    const remembered = this.opts.local.getItem(SESSION_KEY) !== null;
    this.storeSession(updated, encKeyRaw, remembered);
    return { ...session, key };
  }

  deleteAccount(userId: string) {
    this.opts.local.removeItem(dataKey(userId));
    this.saveAccounts(this.listAccounts().filter((a) => a.id !== userId));
    this.signOut();
  }

  /** Persistence adapter that encrypts the whole user database on every save. */
  persistenceFor(session: Session): Persistence {
    return {
      save: async (db: UserDB) => {
        const sealed = await encryptJSON(session.key, db);
        this.write(this.opts.local, dataKey(session.userId), JSON.stringify(sealed));
      },
    };
  }

  // ---------------------------------------------------------------- internals
  private validEmail(input: string): string {
    const r = emailSchema.safeParse(input);
    if (!r.success) throw new AuthError('Enter a valid email address.', 'invalid_email');
    return r.data;
  }

  private async loadData(userId: string, key: CryptoKey): Promise<UserDB> {
    const raw = this.opts.local.getItem(dataKey(userId));
    if (!raw) return emptyDB(new Date(this.now()));
    try {
      return await decryptJSON<UserDB>(key, JSON.parse(raw) as Sealed);
    } catch {
      throw new AuthError('Your saved data could not be decrypted. It may be damaged.', 'corrupt');
    }
  }

  private storeSession(account: Account, encKeyRaw: Uint8Array, remember: boolean) {
    const payload = JSON.stringify({ userId: account.id, email: account.email, k: toB64(encKeyRaw) } satisfies StoredSession);
    this.signOut();
    this.write(remember ? this.opts.local : this.opts.session, SESSION_KEY, payload);
  }

  private readLock(email: string): { attempts: number; until: number } {
    try {
      const all = JSON.parse(this.opts.local.getItem(LOCK_KEY) ?? '{}') as Record<string, { attempts: number; until: number }>;
      return all[email] ?? { attempts: 0, until: 0 };
    } catch {
      return { attempts: 0, until: 0 };
    }
  }

  private writeLock(email: string, value: { attempts: number; until: number }) {
    try {
      const all = JSON.parse(this.opts.local.getItem(LOCK_KEY) ?? '{}') as Record<string, { attempts: number; until: number }>;
      all[email] = value;
      this.opts.local.setItem(LOCK_KEY, JSON.stringify(all));
    } catch {
      /* lock-out is best effort */
    }
  }
}

/** Storage that works even when the browser blocks localStorage (private mode etc.). */
export function safeStorage(kind: 'local' | 'session'): KeyValueStore {
  const memory = new Map<string, string>();
  const fallback: KeyValueStore = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
  };
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__nt_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return fallback;
  }
}
