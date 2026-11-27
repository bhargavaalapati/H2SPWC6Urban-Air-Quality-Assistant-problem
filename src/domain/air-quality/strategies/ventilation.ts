import { buildGoogleCalendarUrl } from '@/domain/air-quality/calendar';
import { computeActionImpact } from '@/domain/air-quality/impact';
import type { RecommendationStrategy } from '@/domain/air-quality/strategies/types';

export const ventilationStrategy: RecommendationStrategy = {
  id: 'ventilation',
  apply({ snapshot, profile, safety, hours, isCommunity }) {
    if (safety.ventilation === 'open_freely') {
      return [
        {
          id: 'vent-open',
          title: isCommunity
            ? 'Air out shared classrooms or community halls during clean hours'
            : 'Refresh indoor rooms with cross-ventilation',
          whyItMatters:
            'Outdoor air is clean today, so opening opposite windows flushes out trapped indoor CO₂ and cooking particles.',
          howToDoIt:
            'Open windows on two opposite sides for 20–30 minutes in the morning.',
          whenLabel: hours ? `Best around ${hours.cleanest.hourLabel}` : 'Morning (8–10 AM)',
          timeSlot: 'morning',
          category: 'indoor_hack',
          isLowCost: true,
          source: 'deterministic',
          impact: computeActionImpact('vent-open', snapshot, profile),
          calendarUrl: buildGoogleCalendarUrl({
            title: 'Cross-ventilate indoor rooms (clean air window)',
            details: 'Open opposite windows for 20–30 minutes to refresh indoor air.',
            locationName: snapshot.location.name,
            targetIsoTime: hours?.cleanest.isoTime,
            fallbackHourLocal: 9,
          }),
        },
      ];
    }

    if (safety.ventilation === 'brief_cross_ventilation') {
      return [
        {
          id: 'vent-brief',
          title: 'Limit ventilation to a brief midday window',
          whyItMatters:
            'Winter pollution usually peaks in early morning and late evening due to cooler stagnant air near the ground.',
          howToDoIt:
            safety.saferWindowNote ??
            'Keep windows closed during rush hours; open briefly for 10–15 minutes only during cleaner midday hours.',
          whenLabel: hours ? `Cleanest near ${hours.cleanest.hourLabel}` : 'Midday only',
          timeSlot: 'midday',
          category: 'indoor_hack',
          isLowCost: true,
          source: 'deterministic',
          impact: computeActionImpact('vent-brief', snapshot, profile),
          calendarUrl:
            hours && hours.cleanest.aqi <= 120
              ? buildGoogleCalendarUrl({
                  title: `Brief 15-min airing window (projected AQI ${hours.cleanest.aqi})`,
                  details:
                    'Briefly cross-ventilate during the cleanest projected hour, then close windows before evening haze.',
                  locationName: snapshot.location.name,
                  targetIsoTime: hours.cleanest.isoTime,
                  durationMinutes: 20,
                })
              : undefined,
        },
      ];
    }

    return [
      {
        id: 'vent-close',
        title: isCommunity
          ? 'Keep classroom, lobby, and corridor windows sealed through smog peak'
          : 'Keep exterior windows and balcony doors closed',
        whyItMatters:
          'Opening windows while outdoor AQI is unhealthy pulls fine PM2.5 particles directly into living areas and bedrooms.',
        howToDoIt:
          'Shut road-facing windows tightly and place a damp or rolled towel along leaky door gaps if haze is heavy.',
        whenLabel: hours
          ? `All day (worst near ${hours.worst.hourLabel})`
          : 'All day (especially morning & night)',
        timeSlot: 'morning',
        category: 'indoor_hack',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('vent-close', snapshot, profile),
      },
    ];
  },
};