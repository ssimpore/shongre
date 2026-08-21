import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: Toast['type'], message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(0);
  const dismissalTimers = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = dismissalTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const showToast = useCallback((type: Toast['type'], message: string, title?: string) => {
    const id = `toast-${nextToastId.current++}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      dismissalTimers.current.delete(id);
    }, 4500);
    dismissalTimers.current.set(id, timer);
  }, []);

  const success = useCallback((msg: string, title?: string) => showToast('success', msg, title), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast('error', msg, title), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast('info', msg, title), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast('warning', msg, title), [showToast]);

  const removeToast = (id: string) => {
    const timer = dismissalTimers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      dismissalTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Clears the mobile tab bar so toasts never sit on top of navigation;
          falls back to a plain inset once the bar is gone at md.

          The container is a *persistent* live region: it is mounted for the
          life of the app and stays in the tree while empty, because assistive
          technology only announces additions to a region it was already
          observing — a region created at the same moment as its first message
          is routinely missed. `aria-relevant="additions"` keeps removals
          (auto-dismissal) silent, and `aria-atomic="false"` means only the new
          toast is read rather than every toast still on screen.

          Errors additionally carry `role="alert"` on the toast itself, which
          escalates that one message to assertive without splitting the list
          into two regions — splitting would reorder a mixed stack visually. */}
      <div
        role="region"
        aria-label={t('common.notifications')}
        aria-live="polite"
        aria-relevant="additions"
        aria-atomic="false"
        className="fixed inset-x-0 bottom-[var(--mobile-nav-total-h)] md:bottom-4 md:inset-x-auto md:right-4 z-toast flex flex-col gap-2 md:max-w-sm w-full pointer-events-none p-4"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-900/90 text-white border-emerald-700',
            error: 'bg-red-900/90 text-white border-red-700',
            info: 'bg-stone-900/90 text-white border-stone-700',
            warning: 'bg-amber-900/90 text-white border-amber-700',
          };

          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />,
            error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" aria-hidden="true" />,
            info: <Info className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />,
            warning: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />,
          };

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto p-3.5 rounded-xl shadow-xl border backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom duration-normal ${typeStyles[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 text-xs sm:text-sm">
                {toast.title && <div className="font-bold mb-0.5">{toast.title}</div>}
                <div>{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label={t('common.close')}
                /* 24px is the WCAG 2.5.8 floor; the glyph stays 16px and the
                   negative margin keeps the larger hit area from widening the
                   toast. */
                className="shrink-0 -m-1 p-1 w-6 h-6 inline-flex items-center justify-center rounded text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
