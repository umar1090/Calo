import { useRef, useState } from 'react';
import { Bot, Download, KeyRound, LogOut, Pencil, Ruler, Settings2, ShieldAlert, Upload, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/AppShell';
import { Card, CardHeader, Field, Segmented, Sheet } from '@/components/ui/primitives';
import { useAction, useDB, useProfile, useToday } from '@/hooks/useAppData';
import { useAuth, useStore } from '@/lib/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getSafetyRules } from '@/engine/safety/policy';
import { ACTIVITY_LEVELS, DIETS, GOALS, ALLERGENS, CUISINES } from '@/lib/labels';
import { AboutStep, ActivityStep, BodyStep, EstimateSummary, FoodStep, GoalsStep, MovementStep } from '@/features/onboarding/ProfileSteps';
import { draftFromProfile, validateAll, type Draft, type StepErrors } from '@/features/onboarding/profileDraft';
import { AuthError, passwordSchema } from '@/lib/auth/localAuth';
import { CLAUDE_MODEL } from '@/lib/claudeModel';

export default function ProfilePage() {
  const profile = useProfile();
  const db = useDB();
  const store = useStore();
  const { state, signOut, deleteAccount } = useAuth();
  const run = useAction();
  const { toast } = useToast();
  const today = useToday();
  const rules = getSafetyRules(profile.age);
  const [editing, setEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [apiKey, setApiKey] = useState(db.preferences.claudeApiKey ?? '');
  const fileRef = useRef<HTMLInputElement>(null);
  const email = state.status === 'signed_in' ? state.session.email : '';

  const label = <T extends string>(list: { value: T; label: string }[], v: T) => list.find((x) => x.value === v)?.label ?? v;

  const exportData = () => {
    const blob = new Blob([store.exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutritrack-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Backup downloaded');
  };

  const importData = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast('That file is too large to be a NutriTrack backup.', 'error');
      return;
    }
    const text = await file.text();
    if (!window.confirm('Importing replaces the data in this account with the backup. Continue?')) return;
    await run(() => store.importBackup(text), 'Backup restored');
  };

  return (
    <div>
      <PageHeader eyebrow="Profile" title={profile.name ? profile.name : 'Your profile'} subtitle={email} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card aria-label="Profile details">
          <CardHeader
            icon={<UserRound className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            eyebrow="About you"
            title="Profile"
            action={
              <button className="btn-secondary !min-h-[38px] !px-3.5" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </button>
            }
          />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Item k="Age" v={`${profile.age} years`} />
            <Item k="Height & weight" v={`${profile.heightCm} cm · ${profile.weightKg} kg`} />
            <Item k="Activity" v={label(ACTIVITY_LEVELS, profile.activityLevel)} />
            <Item k="Diet" v={label(DIETS, profile.dietType)} />
            <Item k="Goals" v={profile.goals.map((g) => label(GOALS, g)).join(', ')} wide />
            <Item k="Allergies" v={profile.allergies.length ? profile.allergies.map((a) => label(ALLERGENS, a)).join(', ') : 'None'} wide />
            <Item k="Cuisines" v={profile.cuisines.length ? profile.cuisines.map((c) => label(CUISINES, c)).join(', ') : 'Any'} wide />
          </dl>
        </Card>

        <Card aria-label="Your estimates">
          <CardHeader icon={<Ruler className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="How we calculate" title="Your estimates" />
          <EstimateSummary profile={profile} compact />
        </Card>

        <Card aria-label="Tracking settings">
          <CardHeader icon={<Settings2 className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Settings" title="Tracking" />
          <div className="space-y-4">
            <Toggle label="Sleep tracking" hint="Log hours slept in your daily check-in." checked={db.preferences.trackSleep} onChange={(v) => run(() => store.savePreferences({ trackSleep: v }))} />
            {rules.weightTracking !== 'unavailable' ? (
              <Toggle
                label="Weight tracking (optional)"
                hint={rules.weightTracking === 'off_by_default' ? 'Off by default for under-18s. Weight changes naturally as you grow; NutriTrack never sets weight goals for you.' : 'Shown small on the Progress page. Habits and energy matter more than the scale.'}
                checked={db.preferences.trackWeight}
                onChange={(v) => run(() => store.savePreferences({ trackWeight: v }))}
              />
            ) : (
              <p className="text-xs text-forest-500">Weight tracking isn't available for children. Growth checks are best done with a doctor.</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Glass size</p>
                <p className="text-xs text-forest-500">Used by the water tracker.</p>
              </div>
              <Segmented
                size="sm"
                label="Glass size"
                value={String(db.preferences.glassMl) as '200' | '250' | '300'}
                onChange={(v) => run(() => store.savePreferences({ glassMl: Number(v) }))}
                options={[
                  { value: '200', label: '200 ml' },
                  { value: '250', label: '250 ml' },
                  { value: '300', label: '300 ml' },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card aria-label="AI coach settings">
          <CardHeader icon={<Bot className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="AI coach" title="Coach engine" />
          <Segmented
            label="Coach engine"
            value={db.preferences.aiMode}
            onChange={(v) => run(() => store.savePreferences({ aiMode: v }))}
            options={[
              { value: 'local', label: 'Built-in (private)' },
              { value: 'claude', label: 'Claude (your API key)' },
            ]}
          />
          {db.preferences.aiMode === 'local' ? (
            <p className="mt-3 text-sm text-forest-600">The built-in coach runs entirely on your device using your profile and logs.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-forest-600">
                Uses Anthropic's {CLAUDE_MODEL} for more conversational answers. When you ask a question, a summary of your profile and today's logs (no name or email) is sent to Anthropic with your key. Safety-sensitive questions are always answered by the built-in coach.
              </p>
              <Field label="Anthropic API key" htmlFor="api-key" hint="Stored encrypted with the rest of your data and never included in backups.">
                <input id="api-key" type="password" autoComplete="off" className="input" placeholder="sk-ant-…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => run(() => store.savePreferences({ claudeApiKey: apiKey.trim() || undefined }), apiKey.trim() ? 'API key saved' : 'API key removed')}>
                  Save key
                </button>
                {db.preferences.claudeApiKey && (
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setApiKey('');
                      run(() => store.savePreferences({ claudeApiKey: undefined, aiMode: 'local' }), 'API key removed');
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card aria-label="Your data">
          <CardHeader icon={<Download className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Your data" title="Backup & restore" />
          <p className="text-sm text-forest-600">Your data is stored on this device, encrypted with your password. Download a backup regularly, especially before clearing your browser.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={exportData}>
              <Download className="h-4 w-4" aria-hidden /> Export backup
            </button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden /> Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = '';
              }}
            />
          </div>
          <p className="mt-3 text-xs text-forest-500">Backups are plain JSON (not encrypted). Keep them somewhere private.</p>
        </Card>

        <Card aria-label="Account">
          <CardHeader icon={<KeyRound className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Account" title="Account & security" />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4" aria-hidden /> Change password
            </button>
            <button className="btn-secondary" onClick={signOut}>
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
            <button className="btn-ghost text-berry-600" onClick={() => setDeleteOpen(true)}>
              <ShieldAlert className="h-4 w-4" aria-hidden /> Delete account
            </button>
          </div>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-forest-500">
        NutriTrack gives general wellness information and estimates. It is not a medical device and does not replace advice from a doctor or registered dietitian.
      </p>

      {editing && <EditProfileSheet onClose={() => setEditing(false)} />}
      {pwOpen && <ChangePasswordSheet onClose={() => setPwOpen(false)} />}
      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account?">
        <DeleteConfirm onCancel={() => setDeleteOpen(false)} onConfirm={deleteAccount} />
      </Sheet>
    </div>
  );
}

function Item({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-forest-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-forest-500">{hint}</span>
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-cream-300 transition peer-checked:bg-sage-600 peer-focus-visible:ring-2 peer-focus-visible:ring-sage-500 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

const TABS = ['About', 'Body', 'Activity', 'Goals', 'Food', 'Movement'] as const;

function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile();
  const store = useStore();
  const run = useAction();
  const [d, setD] = useState<Draft>(() => draftFromProfile(profile));
  const [tab, setTab] = useState<(typeof TABS)[number]>('About');
  const [errors, setErrors] = useState<StepErrors>({});
  const [formError, setFormError] = useState('');
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const props = { d, set, errors };

  const save = async () => {
    const r = validateAll(d);
    if (!r.profile) {
      setFormError(r.error ?? 'Please check your details');
      return;
    }
    const ok = await run(() => store.saveProfile(r.profile!), 'Profile updated. Your estimates have been recalculated.');
    if (ok.ok) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit profile"
      wide
      footer={
        <div className="space-y-2">
          {formError && (
            <p className="text-sm font-medium text-berry-600" role="alert">
              {formError}
            </p>
          )}
          <button className="btn-primary w-full" onClick={save}>
            Save profile
          </button>
        </div>
      }
    >
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Profile sections">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`chip shrink-0 !min-h-[36px] text-xs ${tab === t ? 'chip-on' : ''}`}
            onClick={() => {
              setTab(t);
              setErrors({});
              setFormError('');
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
        {tab === 'About' && <AboutStep {...props} />}
        {tab === 'Body' && <BodyStep {...props} />}
        {tab === 'Activity' && <ActivityStep {...props} />}
        {tab === 'Goals' && <GoalsStep {...props} />}
        {tab === 'Food' && <FoodStep {...props} />}
        {tab === 'Movement' && <MovementStep {...props} />}
      </div>
    </Sheet>
  );
}

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const pw = passwordSchema.safeParse(next);
    if (!pw.success) return setError(pw.error.issues[0].message);
    setBusy(true);
    try {
      await changePassword(current, next);
      toast('Password changed');
      onClose();
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Change password"
      footer={
        <button className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? 'Re-encrypting…' : 'Change password'}
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Current password" htmlFor="pw-current">
          <input id="pw-current" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="pw-new" hint="At least 8 characters with a letter and a number." error={error}>
          <input id="pw-new" type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <p className="text-xs text-forest-500">Your data will be re-encrypted with the new password.</p>
      </div>
    </Sheet>
  );
}

function DeleteConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [text, setText] = useState('');
  return (
    <div className="space-y-4 pb-2">
      <p className="text-sm text-forest-700">This permanently removes your account and all of your logs from this device. Export a backup first if you might want them later.</p>
      <Field label='Type "DELETE" to confirm' htmlFor="delete-confirm">
        <input id="delete-confirm" className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      </Field>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn flex-1 bg-berry-600 text-white hover:bg-berry-400" disabled={text !== 'DELETE'} onClick={onConfirm}>
          Delete everything
        </button>
      </div>
    </div>
  );
}
