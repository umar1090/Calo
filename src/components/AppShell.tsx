import type { ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import clsx from 'clsx';
import { Home, NotebookPen, Footprints, LineChart, MessageCircleHeart, UserRound } from 'lucide-react';
import { Logo, LogoMark } from './Logo';
import { useDB } from '@/hooks/useAppData';

const NAV = [
  { to: '/', label: 'Today', icon: Home },
  { to: '/log', label: 'Food log', short: 'Log', icon: NotebookPen },
  { to: '/move', label: 'Move', icon: Footprints },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/coach', label: 'Coach', icon: MessageCircleHeart },
];

function Avatar({ name }: { name?: string }) {
  const initials = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-clay-100 text-sm font-semibold text-clay-700">
      {initials || <UserRound className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const db = useDB();
  const loc = useLocation();
  const name = db.profile?.name;

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky-under-status sticky hidden h-dvh w-64 shrink-0 flex-col border-r border-cream-300/70 bg-cream-50/70 px-4 py-6 lg:flex">
        <Link to="/" className="px-3">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-[44px] items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition',
                  isActive ? 'bg-sage-100 text-sage-800' : 'text-forest-600 hover:bg-cream-200 hover:text-forest-900',
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/profile"
          className={({ isActive }) => clsx('flex items-center gap-3 rounded-2xl p-2 transition', isActive ? 'bg-sage-100' : 'hover:bg-cream-200')}
        >
          <Avatar name={name} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{name || 'Your profile'}</span>
            <span className="block text-xs text-forest-500">Profile & settings</span>
          </span>
        </NavLink>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile header */}
        <header className="sticky-under-status sticky z-30 flex items-center justify-between border-b border-cream-300/50 bg-cream-100/85 px-4 py-2.5 backdrop-blur lg:hidden">
          <Link to="/" className="flex items-center gap-2" aria-label="NutriTrack home">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold">NutriTrack</span>
          </Link>
          <Link to="/profile" aria-label="Profile and settings" className={clsx('rounded-full', loc.pathname === '/profile' && 'ring-2 ring-sage-500')}>
            <Avatar name={name} />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-cream-300/70 bg-cream-50/95 px-2 pt-1.5 backdrop-blur lg:hidden" aria-label="Main">
        <ul className="mx-auto flex max-w-md justify-between">
          {NAV.map(({ to, label, short, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx('flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition', isActive ? 'text-sage-700' : 'text-forest-500')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={clsx('flex h-8 w-12 items-center justify-center rounded-full transition', isActive && 'bg-sage-100')}>
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.1 : 1.75} aria-hidden />
                    </span>
                    {short ?? label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-forest-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
