'use client';

import { useEffect, useState } from 'react';
import { CheckSquare, MapPin, MessageSquareHeart, X } from 'lucide-react';

const DISMISS_KEY = 'airnest_welcome_dismissed_v1';

export function WelcomeQuickStart() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) !== '1') {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage errors
    }
  };

  if (!visible) return null;

  return (
    <section
      aria-label="Quick start guide"
      className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/80 dark:bg-emerald-950/35 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f5c4d] dark:text-emerald-300">
            Welcome to AirNest — 3 Simple Steps
          </p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            No sign-up or setup needed. Start with a simulated winter scenario below or search your
            city for live air quality.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss quick start guide"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <ol className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <li className="flex items-start gap-2.5 rounded-xl bg-white/85 p-3 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1f5c4d] dark:text-emerald-400" aria-hidden="true" />
          <span>
            <strong className="block font-semibold text-slate-900 dark:text-white">
              1. Pick a city or demo
            </strong>
            Compare live readings or severe winter smog presets.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-xl bg-white/85 p-3 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#1f5c4d] dark:text-emerald-400" aria-hidden="true" />
          <span>
            <strong className="block font-semibold text-slate-900 dark:text-white">
              2. Check off today&apos;s actions
            </strong>
            Follow context-aware ventilation, indoor hacks, and low-emission habits.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-xl bg-white/85 p-3 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          <MessageSquareHeart className="mt-0.5 h-4 w-4 shrink-0 text-[#1f5c4d] dark:text-emerald-400" aria-hidden="true" />
          <span>
            <strong className="block font-semibold text-slate-900 dark:text-white">
              3. Ask the Family Assistant
            </strong>
            Get practical answers grounded in your active location and household context.
          </span>
        </li>
      </ol>
    </section>
  );
}