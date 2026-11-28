'use client';

import { AlertTriangle, Bike, Clock, Info, ShieldAlert, Trees, Wind } from 'lucide-react';
import type { AirQualitySnapshot, SafetyAssessment } from '@/domain/air-quality/types';
import {
  formatMobilityLabel,
  formatOutdoorLabel,
  formatVentilationLabel,
} from '@/lib/aqi-theme';
import { findCleanestAndWorstHours } from '@/domain/air-quality/thresholds';

interface AqiDecisionAndTrendProps {
  snapshot: AirQualitySnapshot;
  safety: SafetyAssessment | null;
}

function formatShortHour(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric' });
}

export function AqiDecisionAndTrend({ snapshot, safety }: AqiDecisionAndTrendProps) {
  const hourExtremes = findCleanestAndWorstHours(snapshot.hourlyForecast);
  const forecastStrip = (snapshot.hourlyForecast ?? [])
    .filter((_, idx, arr) => arr.length <= 6 || idx % Math.ceil(arr.length / 6) === 0)
    .slice(0, 6);

  return (
    <>
      {safety ? (
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-200/70 pt-5 dark:border-slate-800 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
            <Trees
              className="mt-0.5 h-5 w-5 shrink-0 text-[#1f5c4d] dark:text-emerald-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Kids &amp; Outdoor Play
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                {formatOutdoorLabel(safety.outdoorKids)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
            <Wind
              className="mt-0.5 h-5 w-5 shrink-0 text-[#1f5c4d] dark:text-emerald-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Home Ventilation
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                {formatVentilationLabel(safety.ventilation)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
            <Bike
              className="mt-0.5 h-5 w-5 shrink-0 text-[#1f5c4d] dark:text-emerald-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Low-Emission Travel
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                {formatMobilityLabel(safety.lowEmissionMobility)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <p>
            Current AQI data could not be confirmed for this location. Follow cautious indoor air
            habits below or try a 1-click Demo Scenario to preview high-pollution planning.
          </p>
        </div>
      )}

      {forecastStrip.length >= 3 && (
        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Projected AQI Across Today
            </p>
            {hourExtremes && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                  Cleanest: {hourExtremes.cleanest.hourLabel} (AQI {hourExtremes.cleanest.aqi})
                </span>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 font-semibold text-rose-900 dark:bg-rose-950 dark:text-rose-200">
                  Worst: {hourExtremes.worst.hourLabel} (AQI {hourExtremes.worst.aqi})
                </span>
              </div>
            )}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {forecastStrip.map((point) => (
              <div
                key={point.isoTime}
                className="rounded-lg bg-slate-50 px-2 py-1.5 text-center dark:bg-slate-950/70"
              >
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {formatShortHour(point.isoTime)}
                </span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900 dark:text-white">
                  {point.aqi}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {safety?.saferWindowNote && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
          <Clock
            className="mt-0.5 h-4 w-4 shrink-0 text-[#1f5c4d] dark:text-emerald-400"
            aria-hidden="true"
          />
          <p>{safety.saferWindowNote}</p>
        </div>
      )}

      {safety?.recommendOfficialAdvisory && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100"
        >
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300"
            aria-hidden="true"
          />
          <p>
            <strong>Severe Air Pollution Advisory:</strong> Follow local municipal and school
            advisories today. If anyone in your household has asthma, heart/lung conditions, or
            breathing symptoms, consult a qualified healthcare professional.
          </p>
        </div>
      )}

      {snapshot.provenance === 'demo' && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-2.5 text-xs text-sky-950 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400"
            aria-hidden="true"
          />
          <p>
            You are viewing a <strong>simulated winter demo scenario</strong> so you can explore
            AirNest immediately. Search your city above anytime for live Open-Meteo readings.
          </p>
        </div>
      )}
    </>
  );
}