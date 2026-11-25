import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/ui/primitives';
import { useStore, useAuth } from '@/lib/auth/AuthContext';
import { useAction } from '@/hooks/useAppData';
import { AboutStep, ActivityStep, BodyStep, EstimateSummary, FoodStep, GoalsStep, MovementStep } from './ProfileSteps';
import { draftToProfile, emptyDraft, validateAll, validateStep, type Draft, type StepErrors } from './profileDraft';

const STEPS = [
  { title: 'About you', subtitle: 'A few basics so the estimates fit you.' },
  { title: 'Your body', subtitle: 'Height and weight help estimate your needs.' },
  { title: 'How active are you?', subtitle: 'Think about a typical week, including work, school and sport.' },
  { title: 'What are your goals?', subtitle: 'Choose all that apply.' },
  { title: 'Food preferences', subtitle: 'So suggestions fit your kitchen.' },
  { title: 'Movement', subtitle: 'We use this to build daily activity plans.' },
  { title: 'Your estimates', subtitle: 'Starting points, not rules. You can change your profile anytime.' },
];

export default function Onboarding() {
  const store = useStore();
  const { signOut } = useAuth();
  const run = useAction();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof Draft];
      return next;
    });
  };

  const next = () => {
    const e = validateStep(step, d);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = async () => {
    const r = validateAll(d);
    if (!r.profile) {
      setErrors({ name: r.error });
      return;
    }
    setSaving(true);
    await run(() => store.saveProfile(r.profile!), 'Profile saved. Welcome to NutriTrack!');
    setSaving(false);
  };

  const props = { d, set, errors };
  const summaryProfile = step === STEPS.length - 1 ? draftToProfile(d) : null;

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
        <div className="flex items-center justify-between">
          <Logo />
          <button className="btn-ghost text-xs" onClick={signOut}>
            Sign out
          </button>
        </div>
        <div className="mt-8">
          <p className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </p>
          <ProgressBar className="mt-2" value={(step + 1) / STEPS.length} label="Onboarding progress" />
          <h1 className="mt-6 font-display text-[28px] font-semibold leading-tight sm:text-3xl">{STEPS[step].title}</h1>
          <p className="mt-1 text-sm text-forest-500">{STEPS[step].subtitle}</p>
        </div>
        <div key={step} className="mt-6 animate-fade-up">
          {step === 0 && <AboutStep {...props} />}
          {step === 1 && <BodyStep {...props} />}
          {step === 2 && <ActivityStep {...props} />}
          {step === 3 && <GoalsStep {...props} />}
          {step === 4 && <FoodStep {...props} />}
          {step === 5 && <MovementStep {...props} />}
          {summaryProfile && (
            <div className="card card-pad">
              <div className="mb-4 flex items-center gap-2 text-sage-700">
                <Sparkles className="h-5 w-5" aria-hidden />
                <p className="font-semibold">{summaryProfile.name ? `Here's your starting point, ${summaryProfile.name.split(' ')[0]}` : "Here's your starting point"}</p>
              </div>
              <EstimateSummary profile={summaryProfile} />
              {errors.name && (
                <p className="mt-3 text-sm font-medium text-berry-600" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-cream-300/70 bg-cream-50/95 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 sm:px-6">
          <button className="btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={next}>
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button className="btn-primary" onClick={finish} disabled={saving}>
              {saving ? 'Saving…' : 'Start tracking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
