'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_STORAGE_KEY = 'airnest_theme_v1';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');
        return;
      }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.classList.toggle('dark', prefersDark);
    } catch {
      // Fall back to light mode gracefully
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {mounted && theme === 'dark' ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-[#1f5c4d]" aria-hidden="true" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}