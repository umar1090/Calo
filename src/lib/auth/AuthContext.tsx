import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LocalAuth, safeStorage, type Session } from './localAuth';
import { UserStore } from '../store/userStore';
import type { UserDB } from '../store/schema';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; session: Session; store: UserStore };

interface AuthApi {
  state: AuthState;
  accounts: { email: string }[];
  signUp: (email: string, password: string, remember: boolean) => Promise<void>;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => void;
  deleteAccount: () => void;
  changePassword: (current: string, next: string) => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export const localAuth = new LocalAuth({ local: safeStorage('local'), session: safeStorage('session') });

export function AuthProvider({ children, auth = localAuth }: { children: ReactNode; auth?: LocalAuth }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [accountsVersion, setAccountsVersion] = useState(0);

  const open = useCallback(
    (session: Session, db: UserDB) => {
      const store = new UserStore(db, auth.persistenceFor(session));
      setState({ status: 'signed_in', session, store });
    },
    [auth],
  );

  useEffect(() => {
    let cancelled = false;
    auth.restoreSession().then((r) => {
      if (cancelled) return;
      if (r) open(r.session, r.db);
      else setState({ status: 'signed_out' });
    });
    return () => {
      cancelled = true;
    };
  }, [auth, open]);

  const api = useMemo<AuthApi>(
    () => ({
      state,
      accounts: auth.listAccounts().map((a) => ({ email: a.email })),
      signUp: async (email, password, remember) => {
        const r = await auth.signUp(email, password, remember);
        setAccountsVersion((v) => v + 1);
        open(r.session, r.db);
      },
      signIn: async (email, password, remember) => {
        const r = await auth.signIn(email, password, remember);
        open(r.session, r.db);
      },
      signOut: () => {
        auth.signOut();
        setState({ status: 'signed_out' });
      },
      deleteAccount: () => {
        if (state.status !== 'signed_in') return;
        auth.deleteAccount(state.session.userId);
        setAccountsVersion((v) => v + 1);
        setState({ status: 'signed_out' });
      },
      changePassword: async (current, next) => {
        if (state.status !== 'signed_in') return;
        await state.store.flush().catch(() => undefined);
        const session = await auth.changePassword(state.session, current, next, state.store.getSnapshot());
        open(session, state.store.getSnapshot());
      },
    }),
    // accountsVersion forces the account list to refresh after sign-up/delete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, auth, open, accountsVersion],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useStore(): UserStore {
  const { state } = useAuth();
  if (state.status !== 'signed_in') throw new Error('Not signed in');
  return state.store;
}
