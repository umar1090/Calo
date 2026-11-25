import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

type Tone = 'success' | 'info' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  toast: (message: string, tone?: Tone, action?: ToastItem['action']) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback<ToastApi['toast']>(
    (message, tone = 'success', action) => {
      const id = next.current++;
      setItems((list) => [...list.slice(-2), { id, message, tone, action }]);
      window.setTimeout(() => dismiss(id), action ? 6000 : 3200);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" style={{ top: 'calc(var(--sat) + 0.75rem)' }} className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:!top-auto">
        {items.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={clsx(
                'pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-lift',
                t.tone === 'error' ? 'bg-berry-50 text-berry-600 ring-1 ring-berry-400/30' : 'bg-forest-800 text-cream-50',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  className="rounded-full px-2 py-1 font-semibold underline-offset-2 hover:underline"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button aria-label="Dismiss" className="rounded-full p-1 opacity-70 hover:opacity-100" onClick={() => dismiss(t.id)}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
