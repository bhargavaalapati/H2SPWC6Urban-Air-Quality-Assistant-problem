import { buildGoogleCalendarUrl } from '@/domain/air-quality/calendar';
import { computeActionImpact } from '@/domain/air-quality/impact';
import type { RecommendationStrategy } from '@/domain/air-quality/strategies/types';
import type { DailyActionItem } from '@/domain/air-quality/types';

export const indoorHacksStrategy: RecommendationStrategy = {
  id: 'indoor-hacks',
  apply({ snapshot, profile, safety }) {
    const items: DailyActionItem[] = [
      {
        id: 'indoor-no-smoke',
        title: 'Pause incense, candles, and smoky indoor cooking',
        whyItMatters:
          'Burning incense sticks, mosquito coils, or high-smoke frying adds concentrated indoor PM2.5 right where your family breathes.',
        howToDoIt:
          'Use pot lids, switch on the kitchen exhaust hood while cooking, and choose steaming or simmering over deep-frying today.',
        whenLabel: 'Meal times & evening',
        timeSlot: 'evening',
        category: 'indoor_hack',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('indoor-no-smoke', snapshot, profile),
      },
    ];

    if (safety.severityLevel >= 3) {
      items.push({
        id: 'indoor-damp-clean',
        title: 'Damp-mop floors instead of dry sweeping',
        whyItMatters:
          'Dry brooms stir settled soot and dust back into the air for hours, especially at child height.',
        howToDoIt:
          'Use a wrung-out damp mop on floors and a damp cloth on bedroom surfaces; leave outdoor shoes near the entrance.',
        whenLabel: 'Afternoon tidy-up',
        timeSlot: 'midday',
        category: 'indoor_hack',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('indoor-damp-clean', snapshot, profile),
      });
    }

    if (profile.hasAirPurifier && safety.severityLevel >= 3) {
      items.push({
        id: 'indoor-purifier-bedroom',
        title: 'Pre-clean the bedroom with your air purifier before bedtime',
        whyItMatters:
          'Running filtration in a closed sleeping room gives your family 7–9 hours of lower-exposure recovery overnight.',
        howToDoIt:
          'Close bedroom doors and windows 60 minutes before bed, run the purifier on medium/high, and verify the pre-filter is free of dust.',
        whenLabel: '1 hour before bedtime',
        timeSlot: 'evening',
        category: 'indoor_hack',
        isLowCost: false,
        source: 'deterministic',
        impact: computeActionImpact('indoor-purifier-bedroom', snapshot, profile),
        calendarUrl: buildGoogleCalendarUrl({
          title: 'Pre-clean bedroom with air purifier',
          details:
            'Close bedroom windows and run purifier on medium/high for 60 minutes before sleep.',
          locationName: snapshot.location.name,
          fallbackHourLocal: 21,
        }),
      });
    } else if (!profile.hasAirPurifier && safety.severityLevel >= 4) {
      items.push({
        id: 'indoor-clean-room',
        title: 'Create a low-dust "clean bedroom" without extra gear',
        whyItMatters:
          'You do not need an expensive purifier to lower overnight exposure—reducing infiltration and indoor particles makes a real difference.',
        howToDoIt:
          'Keep one bedroom closed all afternoon, skip room sprays or agarbatti, wipe dust with a damp cloth, and change out of outdoor clothes upon returning home.',
        whenLabel: 'Before evening',
        timeSlot: 'evening',
        category: 'indoor_hack',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('indoor-clean-room', snapshot, profile),
      });
    }

    return items;
  },
};