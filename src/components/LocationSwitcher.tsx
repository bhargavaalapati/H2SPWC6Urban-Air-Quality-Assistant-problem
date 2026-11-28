'use client';

import { useState, type FormEvent } from 'react';
import { Compass, Loader2, MapPin, Search, Sparkles } from 'lucide-react';
import { DEMO_SCENARIOS } from '@/domain/air-quality/demo-scenarios';
import type { LocationInfo } from '@/domain/air-quality/types';
import { useCitySuggestions } from '@/hooks/useCitySuggestions';

interface LocationSwitcherProps {
  activeLocationDisplay: string;
  activeDemoId?: string;
  isLoading: boolean;
  isOffline: boolean;
  errorMessage: string | null;
  onSearchCity: (city: string) => Promise<void>;
  onSelectLocation: (location: LocationInfo) => Promise<void>;
  onSelectDemo: (scenarioId: string) => void;
  onUseGeolocation: () => Promise<void>;
}

export function LocationSwitcher({
  activeLocationDisplay,
  activeDemoId,
  isLoading,
  isOffline,
  errorMessage,
  onSearchCity,
  onSelectLocation,
  onSelectDemo,
  onUseGeolocation,
}: LocationSwitcherProps) {
  const [geoBusy, setGeoBusy] = useState(false);
  const {
    cityInput,
    setCityInput,
    suggestions,
    isSuggesting,
    dropdownOpen,
    setDropdownOpen,
    highlightedIdx,
    setHighlightedIdx,
    containerRef,
    handleKeyDown,
    clearSuggestions,
  } = useCitySuggestions(isOffline);

  const pickSuggestion = async (loc: LocationInfo) => {
    const label = loc.region ? `${loc.name}, ${loc.region}` : loc.name;
    clearSuggestions(label);
    await onSelectLocation(loc);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
      await pickSuggestion(suggestions[highlightedIdx]!);
      return;
    }
    const trimmed = cityInput.trim();
    if (trimmed.length < 2 || isLoading || isOffline) return;
    setDropdownOpen(false);
    await onSearchCity(trimmed);
  };

  const handleGeoClick = async () => {
    if (isLoading || geoBusy || isOffline) return;
    setDropdownOpen(false);
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
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div ref={containerRef} className="relative flex-1">
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
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={dropdownOpen}
              aria-controls="city-suggestions-listbox"
              aria-activedescendant={
                highlightedIdx >= 0 ? `city-option-${highlightedIdx}` : undefined
              }
              autoComplete="off"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a city for live air quality (e.g., Hyderabad, Delhi, Pune)..."
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
              disabled={isLoading || isOffline}
            />
            {isSuggesting && (
              <Loader2
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
              />
            )}

            {dropdownOpen && suggestions.length > 0 && (
              <ul
                id="city-suggestions-listbox"
                role="listbox"
                aria-label="City suggestions"
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                {suggestions.map((loc, idx) => {
                  const isHighlighted = idx === highlightedIdx;
                  const sub = [loc.region, loc.country].filter(Boolean).join(', ');
                  return (
                    <li
                      key={`${loc.name}-${loc.latitude}-${loc.longitude}`}
                      id={`city-option-${idx}`}
                      role="option"
                      aria-selected={isHighlighted}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          void pickSuggestion(loc);
                        }}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors ${
                          isHighlighted
                            ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-100'
                            : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <MapPin
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-[#1f5c4d] dark:text-emerald-400"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          <strong className="font-semibold">{loc.name}</strong>
                          {sub && (
                            <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                              {sub}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || isOffline || cityInput.trim().length < 2}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1f5c4d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#17483c] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {isLoading ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin aria-hidden="true" className="h-4 w-4" />
              )}
              <span>Check City</span>
            </button>

            <button
              type="button"
              onClick={handleGeoClick}
              disabled={isLoading || geoBusy || isOffline}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Optional: detect your city for local live readings"
            >
              {geoBusy ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Compass
                  aria-hidden="true"
                  className="h-4 w-4 text-[#1f5c4d] dark:text-emerald-400"
                />
              )}
              <span className="hidden sm:inline">Near Me</span>
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <MapPin
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-[#1f5c4d] dark:text-emerald-400"
          />
          <span>
            Active:{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {activeLocationDisplay}
            </strong>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
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
                    ? 'border-[#1f5c4d] bg-[#1f5c4d] text-white dark:border-emerald-500 dark:bg-emerald-600'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
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