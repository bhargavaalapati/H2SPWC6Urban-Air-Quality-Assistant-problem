'use client';

import { useState, type FormEvent } from 'react';
import { Compass, Loader2, MapPin, Search, Sparkles } from 'lucide-react';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';

interface LocationSwitcherProps {
  activeLocationName: string;
  activeDemoId?: string;
  isLoading: boolean;
  errorMessage: string | null;
  onSearchCity: (city: string) => Promise<void>;
  onSelectDemo: (scenarioId: string) => void;
  onUseGeolocation: () => Promise<void>;
}

export function LocationSwitcher({
  activeLocationName,
  activeDemoId,
  isLoading,
  errorMessage,
  onSearchCity,
  onSelectDemo,
  onUseGeolocation,
}: LocationSwitcherProps) {
  const [cityInput, setCityInput] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = cityInput.trim();
    if (trimmed.length < 2 || isLoading) return;
    await onSearchCity(trimmed);
  };

  const handleGeoClick = async () => {
    if (isLoading || geoBusy) return;
    setGeoBusy(true);
    try {
      await onUseGeolocation();
    } finally {
      setGeoBusy(false);
    }
  };

  return (
    <section
      aria-label="Location and demo scenario selector"
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="city-search-input" className="sr-only">
              Enter your city for live air quality
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="city-search-input"
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder={`Check live air quality (e.g., Hyderabad, Delhi, Pune)...`}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#1f5c4d] focus:bg-white"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || cityInput.trim().length < 2}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1f5c4d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#17483c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MapPin className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Check City</span>
            </button>

            <button
              type="button"
              onClick={handleGeoClick}
              disabled={isLoading || geoBusy}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Optional: use your browser location for local readings"
            >
              {geoBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Compass className="h-4 w-4 text-[#1f5c4d]" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Near Me</span>
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1f5c4d]" aria-hidden="true" />
          <span>
            Active: <strong className="font-semibold text-slate-900">{activeLocationName}</strong>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            1-Click Demo Scenarios (Simulated):
          </span>

          {DEMO_SCENARIOS.map((scenario) => {
            const isSelected = activeDemoId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectDemo(scenario.id)}
                disabled={isLoading}
                aria-pressed={isSelected}
                className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-[#1f5c4d] bg-[#1f5c4d] text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                {scenario.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}