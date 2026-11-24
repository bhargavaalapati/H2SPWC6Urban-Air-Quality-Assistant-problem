'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastNotice {
  id: number;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface StatusToastProps {
  notice: ToastNotice | null;
  onDismiss: () => void;
}

export function StatusToast({ notice, onDismiss }: StatusToastProps) {
  if (!notice) return null;

  const toneClasses =
    notice.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100'
      : notice.tone === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-100'
        : 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/90 dark:text-sky-100';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 max-w-sm"
    >
      <div
        className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${toneClasses}`}
      >
        {notice.tone === 'success' ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : notice.tone === 'error' ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <p className="flex-1 text-xs font-medium leading-relaxed">{notice.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded p-0.5 opacity-75 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}