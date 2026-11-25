import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Salad, Footprints, MessageCircleHeart, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Segmented } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth/AuthContext';
import { AuthError, emailSchema, passwordSchema } from '@/lib/auth/localAuth';

export default function Welcome() {
  const { signIn, signUp, accounts } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>(accounts.length ? 'signin' : 'signup');
  const [email, setEmail] = useState(accounts.length === 1 ? accounts[0].email : '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const em = emailSchema.safeParse(email);
    if (!em.success) next.email = 'Enter a valid email address';
    if (mode === 'signup') {
      const pw = passwordSchema.safeParse(password);
      if (!pw.success) next.password = pw.error.issues[0].message;
    } else if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(email, password, remember);
      else await signIn(email, password, remember);
    } catch (err) {
      setErrors({ form: err instanceof AuthError ? err.message : 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-10">
        <section className="animate-fade-up">
          <Logo />
          <h1 className="mt-8 font-display text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Eat well, move more,
            <br />
            <span className="text-sage-600">feel like yourself.</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-forest-600">
            A calm, personal nutrition and fitness companion built around the dal, roti, idli and sabzi you actually eat.
          </p>
          <ul className="mt-8 grid max-w-md gap-3 text-sm">
            {[
              { icon: Salad, title: 'Indian food first', text: '170+ home-style foods with realistic portions you can adjust.' },
              { icon: Footprints, title: 'Movement that fits you', text: 'Daily plans for your sports, time and energy, with rest days built in.' },
              { icon: MessageCircleHeart, title: 'A kind coach', text: 'Suggestions based on what you ate, never on guilt.' },
              { icon: ShieldCheck, title: 'Private by design', text: 'Your data stays on this device, encrypted with your password.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="text-forest-500">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card animate-fade-up p-6 sm:p-8" aria-labelledby="auth-title">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 id="auth-title" className="font-display text-2xl font-semibold">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
          </div>
          <Segmented
            label="Choose sign up or sign in"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setErrors({});
            }}
            options={[
              { value: 'signup', label: 'Create account' },
              { value: 'signin', label: 'Sign in' },
            ]}
          />
          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-err' : undefined}
              />
              {errors.email && (
                <p id="email-err" className="mt-1 text-xs font-medium text-berry-600">
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="input pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="pw-help"
                />
                <button type="button" className="btn-icon absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p id="pw-help" className={errors.password ? 'mt-1 text-xs font-medium text-berry-600' : 'mt-1 text-xs text-forest-500'}>
                {errors.password ?? (mode === 'signup' ? 'At least 8 characters with a letter and a number.' : ' ')}
              </p>
            </div>
            <label className="flex items-start gap-3 text-sm text-forest-700">
              <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-cream-400 accent-sage-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                Keep me signed in on this device
                <span className="block text-xs text-forest-500">Only on a device you don't share.</span>
              </span>
            </label>
            {errors.form && (
              <p className="rounded-2xl bg-berry-50 px-4 py-3 text-sm text-berry-600" role="alert">
                {errors.form}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 flex gap-2 rounded-2xl bg-cream-200/70 p-3 text-xs text-forest-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Accounts live on this device. Your password encrypts your data, so it can't be recovered if forgotten. Export a backup from your profile from time to time.
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
