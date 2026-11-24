import type {
  ActionCategory,
  AqiCategory,
  DataProvenance,
  LowEmissionMobilityGuidance,
  OutdoorActivityGuidance,
  VentilationGuidance,
} from '@/domain/air-quality/types';

export interface AqiVisualTheme {
  surfaceBg: string;
  accentBar: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  meterPercent: number;
}

export function getAqiTheme(
  category: AqiCategory | null,
  aqi: number | null
): AqiVisualTheme {
  const clamped = aqi !== null ? Math.min(100, Math.max(4, Math.round((aqi / 350) * 100))) : 0;

  switch (category) {
    case 'good':
      return {
        surfaceBg: 'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50',
        accentBar: 'bg-emerald-600',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-900',
        border: 'border-emerald-200/80',
        meterPercent: clamped,
      };
    case 'moderate':
      return {
        surfaceBg: 'bg-gradient-to-br from-amber-50/80 via-white to-stone-50',
        accentBar: 'bg-amber-500',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-950',
        border: 'border-amber-200/80',
        meterPercent: clamped,
      };
    case 'unhealthy_sensitive':
      return {
        surfaceBg: 'bg-gradient-to-br from-orange-50/85 via-white to-amber-50/40',
        accentBar: 'bg-orange-600',
        badgeBg: 'bg-orange-100',
        badgeText: 'text-orange-950',
        border: 'border-orange-200/80',
        meterPercent: clamped,
      };
    case 'unhealthy':
      return {
        surfaceBg: 'bg-gradient-to-br from-rose-50/85 via-white to-orange-50/40',
        accentBar: 'bg-rose-600',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-950',
        border: 'border-rose-200/80',
        meterPercent: clamped,
      };
    case 'very_unhealthy':
      return {
        surfaceBg: 'bg-gradient-to-br from-purple-50/85 via-white to-rose-50/50',
        accentBar: 'bg-purple-700',
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-950',
        border: 'border-purple-200/80',
        meterPercent: clamped,
      };
    case 'hazardous':
      return {
        surfaceBg: 'bg-gradient-to-br from-red-100/70 via-white to-purple-50/50',
        accentBar: 'bg-red-800',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-950',
        border: 'border-red-300/80',
        meterPercent: clamped,
      };
    default:
      return {
        surfaceBg: 'bg-gradient-to-br from-slate-50 via-white to-stone-50',
        accentBar: 'bg-slate-400',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-800',
        border: 'border-slate-200',
        meterPercent: 0,
      };
  }
}

export function getProvenanceMeta(provenance: DataProvenance): {
  label: string;
  classes: string;
  dotClasses: string;
} {
  switch (provenance) {
    case 'live':
      return {
        label: 'Live Data',
        classes: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        dotClasses: 'bg-emerald-600',
      };
    case 'delayed':
      return {
        label: 'Delayed Reading',
        classes: 'bg-amber-50 text-amber-900 border-amber-200',
        dotClasses: 'bg-amber-500',
      };
    case 'demo':
      return {
        label: 'Demo Scenario (Simulated)',
        classes: 'bg-sky-50 text-sky-900 border-sky-200',
        dotClasses: 'bg-sky-600',
      };
    case 'unavailable':
      return {
        label: 'Data Unavailable',
        classes: 'bg-slate-100 text-slate-800 border-slate-300',
        dotClasses: 'bg-slate-500',
      };
  }
}

export function formatVentilationLabel(v: VentilationGuidance): string {
  switch (v) {
    case 'open_freely':
      return 'Safe to open windows';
    case 'brief_cross_ventilation':
      return 'Brief midday airing only';
    case 'keep_closed':
      return 'Keep windows closed';
  }
}

export function formatOutdoorLabel(o: OutdoorActivityGuidance): string {
  switch (o) {
    case 'normal':
      return 'Normal outdoor play OK';
    case 'prefer_light_or_shorter':
      return 'Keep play short & light';
    case 'move_indoors':
      return 'Move activities indoors';
  }
}

export function formatMobilityLabel(m: LowEmissionMobilityGuidance): string {
  switch (m) {
    case 'walk_or_cycle_safe':
      return 'Walk or cycle safely';
    case 'short_walk_or_transit':
      return 'Use transit / off-peak';
    case 'avoid_outdoor_exertion_use_transit_or_combine_trips':
      return 'Combine trips, skip idling';
  }
}

export function getActionCategoryMeta(category: ActionCategory): {
  label: string;
  classes: string;
} {
  switch (category) {
    case 'indoor_hack':
      return {
        label: 'Indoor Air Hack',
        classes: 'bg-teal-50 text-teal-900 border-teal-200/80',
      };
    case 'outdoor':
      return {
        label: 'Outdoor Routine',
        classes: 'bg-amber-50 text-amber-900 border-amber-200/80',
      };
    case 'low_emission':
      return {
        label: 'Low-Emission Habit',
        classes: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
      };
    case 'family_alternative':
      return {
        label: 'Family Alternative',
        classes: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
      };
  }
}