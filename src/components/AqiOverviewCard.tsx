'use client';

import {
  AlertTriangle,
  Bike,
  Clock,
  Info,
  ShieldAlert,
  Trees,
  Wind,
} from 'lucide-react';
import { getCategoryLabel } from '@/domain/air-quality/thresholds';
import type { AirQualitySnapshot, SafetyAssessment } from '@/domain/air-quality/types';
import {
  formatMobilityLabel,
  formatOutdoorLabel,
  formatVentilationLabel,
  getAqiTheme,
  getProvenanceMeta,
} from '@/lib/aqi-theme';

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
        aria-busy="true"
        aria-label="Loading air quality overview"
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <div className="h-5 w-44 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-12 w-32 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Current air quality overview"
      className={`rounded-3xl border p-5 shadow-xs sm:p-7 ${theme.surfaceBg} ${theme.border}`}
    >
      {/* Top Row: Provenance & Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${provenance.classes}`}
          >
            <span className={`h-2 w-2 rounded-full ${provenance.dotClasses}`} aria-hidden="true" />
            {provenance.label}
          </span>
          <span className="text-xs text-slate-600">{snapshot.sourceLabel}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{formatObservedTime(snapshot.observedAt)}</span>
        </div>
      </div>

      {/* Hero AQI Reading + Household Meaning */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <p className="text-sm font-medium text-slate-600">
            {snapshot.location.name}
            {snapshot.location.region ? `, ${snapshot.location.region}` : ''}
          </p>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              {snapshot.aqi !== null ? snapshot.aqi : '—'}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                US AQI
              </span>
              <span
                className={`mt-1 inline-flex w-fit rounded-lg px-2.5 py-0.5 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}
              >
                {categoryLabel}
              </span>
            </div>
          </div>

          {/* Scale Meter */}
          <div className="mt-4" aria-hidden="true">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className={`h-full rounded-full transition-all duration-300 ${theme.accentBar}`}
                style={{ width: `${theme.meterPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>0 Good</span>
              <span>100</span>
              <span>200</span>
              <span>300+ Severe</span>
            </div>
          </div>
        </div>

        {/* Practical Meaning & Pollutants */}
        <div className="lg:col-span-7">
          <h2 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
            What this means for your family today
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
            {dailyHeadline}
          </p>

          {/* Compact Pollutant Strip */}
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2">
              <dt className="text-[11px] font-medium text-slate-500">PM2.5</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {snapshot.pollutants.pm25 !== null ? `${snapshot.pollutants.pm25} µg/m³` : 'N/A'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2">
              <dt className="text-[11px] font-medium text-slate-500">PM10</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {snapshot.pollutants.pm10 !== null ? `${snapshot.pollutants.pm10} µg/m³` : 'N/A'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2">
              <dt className="text-[11px] font-medium text-slate-500">NO₂</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {snapshot.pollutants.no2 !== null && snapshot.pollutants.no2 !== undefined
                  ? `${snapshot.pollutants.no2} µg/m³`
                  : 'N/A'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2">
              <dt className="text-[11px] font-medium text-slate-500">Ozone (O₃)</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {snapshot.pollutants.o3 !== null && snapshot.pollutants.o3 !== undefined
                  ? `${snapshot.pollutants.o3} µg/m³`
                  : 'N/A'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Quick-Glance Household Decisions */}
      {safety ? (
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-200/70 pt-5 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5">
            <Trees className="mt-0.5 h-5 w-5 shrink-0 text-[#1f5c4d]" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-slate-500">Kids & Outdoor Play</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {formatOutdoorLabel(safety.outdoorKids)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5">
            <Wind className="mt-0.5 h-5 w-5 shrink-0 text-[#1f5c4d]" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-slate-500">Home Ventilation</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {formatVentilationLabel(safety.ventilation)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5">
            <Bike className="mt-0.5 h-5 w-5 shrink-0 text-[#1f5c4d]" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-slate-500">Low-Emission Travel</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {formatMobilityLabel(safety.lowEmissionMobility)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <p>
            Current AQI data could not be confirmed for this location. Follow cautious indoor air
            habits below or try a 1-click Demo Scenario to preview high-pollution planning.
          </p>
        </div>
      )}

      {/* Safer Daytime Window Note */}
      {safety?.saferWindowNote && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-700">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#1f5c4d]" aria-hidden="true" />
          <p>{safety.saferWindowNote}</p>
        </div>
      )}

      {/* Official Advisory Banner for Very Unhealthy / Hazardous */}
      {safety?.recommendOfficialAdvisory && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
          <p>
            <strong>Severe Air Pollution Advisory:</strong> Follow local municipal and school
            advisories today. If anyone in your household has asthma, heart/lung conditions, or
            breathing symptoms, consult a qualified healthcare professional.
          </p>
        </div>
      )}

      {snapshot.provenance === 'demo' && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-2.5 text-xs text-sky-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
          <p>
            You are viewing a <strong>simulated winter demo scenario</strong> so you can explore
            AirNest immediately. Search your city above anytime for live Open-Meteo readings.
          </p>
        </div>
      )}
    </section>
  );
}