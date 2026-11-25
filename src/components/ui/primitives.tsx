import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X, Minus, Plus } from 'lucide-react';

// ---------------------------------------------------------------- Card
export function Card({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={clsx('card card-pad animate-fade-up', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ eyebrow, title, action, icon }: { eyebrow?: string; title: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">{icon}</span>}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- Progress
export function ProgressRing({
  value,
  size = 132,
  stroke = 11,
  color = '#587650',
  track = '#E4ECE0',
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, color = 'bg-sage-500', track = 'bg-sage-100', label, className }: { value: number; color?: string; track?: string; label: string; className?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full', track, className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div className={clsx('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------- Choice chips
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple,
  label,
  columns,
}: {
  options: { value: T; label: string; hint?: string; icon?: ReactNode }[];
  value: T | T[];
  onChange: (v: T | T[]) => void;
  multiple?: boolean;
  label: string;
  columns?: boolean;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  const toggle = (v: T) => {
    if (!multiple) return onChange(v);
    const arr = Array.isArray(value) ? value : [];
    onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  return (
    <div role="group" aria-label={label} className={clsx(columns ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-2')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={selected(o.value)}
          onClick={() => toggle(o.value)}
          className={clsx(
            columns ? 'flex min-h-[56px] items-start gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99]' : 'chip',
            columns && (selected(o.value) ? 'border-sage-600 bg-sage-50 ring-1 ring-sage-600' : 'border-cream-300 bg-cream-50 hover:border-sage-300'),
            !columns && selected(o.value) && 'chip-on',
          )}
        >
          {o.icon}
          {columns ? (
            <span>
              <span className="block text-sm font-semibold text-forest-900">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs text-forest-500">{o.hint}</span>}
            </span>
          ) : (
            o.label
          )}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label, size = 'md' }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-cream-200 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-full font-semibold transition',
            size === 'sm' ? 'min-h-[32px] px-3 text-xs' : 'min-h-[38px] px-4 text-sm',
            value === o.value ? 'bg-cream-50 text-forest-900 shadow-sm' : 'text-forest-600 hover:text-forest-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Fields
export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-forest-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-berry-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label, format }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; label: string; format?: (n: number) => string }) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, Math.round(n * 100) / 100)));
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-cream-300 bg-white p-1" role="group" aria-label={label}>
      <button type="button" className="btn-icon h-9 w-9" aria-label={`Decrease ${label}`} onClick={() => set(value - step)} disabled={value <= min}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="num min-w-[3rem] text-center text-sm font-semibold" aria-live="polite">
        {format ? format(value) : value}
      </span>
      <button type="button" className="btn-icon h-9 w-9" aria-label={`Increase ${label}`} onClick={() => set(value + step)} disabled={value >= max}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Sheet (dialog)
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button:not([data-close])');
      first?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const nodes = panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-forest-900/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'relative flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-[28px] bg-cream-50 shadow-lift sm:animate-pop sm:rounded-[28px]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-cream-300 sm:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3 sm:px-6 sm:pt-5">
          <h2 id={titleId} className="font-display text-xl font-semibold">
            {title}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close" data-close>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-6">{children}</div>
        {footer && <div className="safe-bottom border-t border-cream-300/70 px-5 pt-3 sm:px-6 sm:pb-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-200 text-forest-600">{icon}</span>
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-forest-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = 'sage' }: { children: ReactNode; tone?: 'sage' | 'clay' | 'dew' | 'cream' }) {
  const tones = {
    sage: 'bg-sage-100 text-sage-700',
    clay: 'bg-clay-100 text-clay-700',
    dew: 'bg-dew-100 text-dew-600',
    cream: 'bg-cream-200 text-forest-700',
  };
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>;
}
