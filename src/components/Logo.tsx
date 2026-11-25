import clsx from 'clsx';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={clsx('h-9 w-9', className)} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#587650" />
      <path d="M19 40c0-10 8-19 20-21-1 12-9 21-20 21z" fill="#FAF6EE" />
      <path d="M21 40c5-6 10-10 16-14" stroke="#587650" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="42" cy="42" r="7" fill="#DE925C" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight text-forest-900">NutriTrack</span>
    </span>
  );
}
