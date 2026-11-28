'use client';

import { Clock } from 'lucide-react';
import type { AirQualitySnapshot, SafetyAssessment } from '@/domain/air-quality/types';
import { getAqiTheme, getProvenanceMeta } from '@/lib/aqi-theme';
import { getCategoryLabel } from '@/domain/air-quality/thresholds';
import { AqiDecisionAndTrend } from '@/components/AqiDecisionAndTrend';

interface AqiOverviewCardProps {
  snapshot: AirQualitySnapshot;
  safety: SafetyAssessment | null;
  dailyHeadline: string;
  isLoading: boolean;
}

function formatObservedTime(iso: string | null): string {
  if (!iso) return 'Timestamp unavailable';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPollutant(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value} µg/m³` : 'N/A';
}

export function AqiOverviewCard({
  snapshot,
  safety,
  dailyHeadline,
  isLoading,
}: AqiOverviewCardProps) {
  const theme = getAqiTheme(snapshot.category, snapshot.aqi);
  const provenance = getProvenanceMeta(snapshot.provenance);
  const categoryLabel = snapshot.category
    ? getCategoryLabel(snapshot.category)
    : 'Reading Unavailable';

  if (isLoading) {
    return (
      <section
        id="aqi-overview"
        aria-busy="true"
        aria-label="Loading air quality overview"
        className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="h-5 w-44 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-12 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </section>
    );
  }

  const pollutants = [
    { label: 'PM2.5', value: formatPollutant(snapshot.pollutants.pm25) },
    { label: 'PM10', value: formatPollutant(snapshot.pollutants.pm10) },
    { label: 'NO₂', value: formatPollutant(snapshot.pollutants.no2) },
    { label: 'Ozone (O₃)', value: formatPollutant(snapshot.pollutants.o3) },
  ];

  return (
    <section
      id="aqi-overview"
      aria-label="Current air quality overview"
      className={`scroll-mt-20 rounded-3xl border p-5 shadow-xs sm:p-7 ${theme.surfaceBg} ${theme.border}`}
    >
      <p className="sr-only" aria-live="polite">
        {snapshot.location.name}:{' '}
        {snapshot.aqi !== null ? `US AQI ${snapshot.aqi}, ${categoryLabel}` : 'AQI unavailable'} (
        {provenance.label}).
      </p>

      {/* Top Row: Provenance & Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${provenance.classes}`}
          >
            <span className={`h-2 w-2 rounded-full ${provenance.dotClasses}`} aria-hidden="true" />
            {provenance.label}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {snapshot.sourceLabel}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{formatObservedTime(snapshot.observedAt)}</span>
        </div>
      </div>

      {/* Hero AQI Reading + Household Meaning */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {snapshot.location.name}
            {snapshot.location.region ? `, ${snapshot.location.region}` : ''}
            {snapshot.location.country ? ` · ${snapshot.location.country}` : ''}
          </p>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-5xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
              {snapshot.aqi !== null ? snapshot.aqi : '—'}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                US AQI
              </span>
              <span
                className={`mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}
              >
                <span aria-hidden="true">{theme.symbol}</span>
                <span>{categoryLabel}</span>
              </span>
            </div>
          </div>

          <div className="mt-4" aria-hidden="true">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${theme.accentBar}`}
                style={{ width: `${theme.meterPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>0 Good</span>
              <span>100</span>
              <span>200</span>
              <span>300+ Severe</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <h2 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white sm:text-xl">
            What this means for your family today
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-base">
            {dailyHeadline}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {pollutants.map((p) => (
              <div
                key={p.label}
                className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {p.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {p.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <AqiDecisionAndTrend snapshot={snapshot} safety={safety} />
    </section>
  );
}