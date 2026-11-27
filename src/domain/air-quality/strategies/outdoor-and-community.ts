import { buildGoogleCalendarUrl } from '@/domain/air-quality/calendar';
import { computeActionImpact } from '@/domain/air-quality/impact';
import type { RecommendationStrategy } from '@/domain/air-quality/strategies/types';

export const outdoorAndCommunityStrategy: RecommendationStrategy = {
  id: 'outdoor-and-community',
  apply({ snapshot, profile, safety, hours, isCommunity }) {
    if (isCommunity && safety.severityLevel >= 3) {
      const groupActionTitle =
        profile.communityType === 'school'
          ? 'Move morning assembly & PE indoors and enforce gate no-idling'
          : profile.communityType === 'rwa'
            ? 'Issue RWA smog advisory & enforce compound no-idling zone'
            : 'Coordinate indoor neighbourhood check-ins for seniors & children';

      return [
        {
          id: 'community-stagger-advisory',
          title: groupActionTitle,
          whyItMatters: `Coordinating across ${profile.communitySize.toLocaleString()} people multiplies exposure reduction and prevents localized vehicle exhaust buildup.`,
          howToDoIt:
            'Post today’s AQI band in your WhatsApp/notice board group, pause outdoor group sports, and ask pickup/delivery vehicles to switch off engines at the gate.',
          whenLabel: 'Start of day',
          timeSlot: 'morning',
          category: 'outdoor',
          isLowCost: true,
          source: 'deterministic',
          impact: computeActionImpact('community-stagger-advisory', snapshot, profile),
          calendarUrl: buildGoogleCalendarUrl({
            title: groupActionTitle,
            details: `Share today's AirNest AQI ${snapshot.aqi} guidance with your community group.`,
            locationName: snapshot.location.name,
            fallbackHourLocal: 8,
          }),
        },
      ];
    }

    if (safety.outdoorKids === 'move_indoors') {
      return [
        {
          id: 'outdoor-shift-indoors',
          title: profile.hasChildren
            ? 'Swap outdoor park play for low-energy indoor activities'
            : 'Move outdoor exercise indoors today',
          whyItMatters:
            'Running and active play increase breathing rate, drawing deeper volumes of polluted air into lungs—especially for children.',
          howToDoIt: profile.hasChildren
            ? 'Pick one activity from the Indoor Alternatives below (like a living-room stretch circuit or story hour) during usual park time.'
            : 'Switch outdoor jogging or cycling to gentle indoor stretching or mobility exercises.',
          whenLabel:
            profile.typicalOutdoorTime === 'morning'
              ? 'Morning routine'
              : profile.typicalOutdoorTime === 'evening'
                ? 'Evening routine'
                : 'Usual outdoor time',
          timeSlot:
            profile.typicalOutdoorTime === 'morning'
              ? 'morning'
              : profile.typicalOutdoorTime === 'afternoon'
                ? 'midday'
                : 'evening',
          category: 'family_alternative',
          isLowCost: true,
          source: 'deterministic',
          impact: computeActionImpact('outdoor-shift-indoors', snapshot, profile),
        },
      ];
    }

    if (safety.outdoorKids === 'prefer_light_or_shorter') {
      return [
        {
          id: 'outdoor-shorten',
          title: 'Keep outdoor play shorter and away from busy roads',
          whyItMatters:
            'Sensitive family members can experience throat or eye irritation during extended vigorous activity at moderate-to-elevated AQI.',
          howToDoIt:
            'Cap active outdoor time to 20–30 minutes in a tree-lined park or courtyard rather than sidewalks next to idling traffic.',
          whenLabel: hours ? `Prefer near ${hours.cleanest.hourLabel}` : 'Midday / early afternoon',
          timeSlot: 'midday',
          category: 'outdoor',
          isLowCost: true,
          source: 'deterministic',
          impact: computeActionImpact('outdoor-shorten', snapshot, profile),
        },
      ];
    }

    return [
      {
        id: 'outdoor-enjoy',
        title: profile.hasChildren
          ? 'Make time for outdoor park play while air is clear'
          : 'Take advantage of clean air for outdoor movement',
        whyItMatters:
          'Clean winter air days are ideal for sunlight, active play, and safe outdoor exercise.',
        howToDoIt:
          'Head to a local park or quiet residential street away from main arterial traffic.',
        whenLabel: 'Morning or afternoon',
        timeSlot: profile.typicalOutdoorTime === 'morning' ? 'morning' : 'midday',
        category: 'outdoor',
        isLowCost: true,
        source: 'deterministic',
      },
    ];
  },
};