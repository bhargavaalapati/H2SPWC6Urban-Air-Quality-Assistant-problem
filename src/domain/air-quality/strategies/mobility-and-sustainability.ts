import { computeActionImpact } from '@/domain/air-quality/impact';
import type { RecommendationStrategy } from '@/domain/air-quality/strategies/types';
import type { DailyActionItem } from '@/domain/air-quality/types';

export const mobilityAndSustainabilityStrategy: RecommendationStrategy = {
  id: 'mobility-and-sustainability',
  apply({ snapshot, profile, safety, isCommunity }) {
    const items: DailyActionItem[] = [];

    if (safety.lowEmissionMobility === 'walk_or_cycle_safe') {
      items.push({
        id: 'low-emission-walk',
        title: 'Walk or cycle for short neighborhood errands',
        whyItMatters:
          'Short car or scooter trips produce disproportionately high cold-engine emissions; today’s clean air makes active travel safe.',
        howToDoIt:
          'Pick side streets over main roads for errands under 2 km and carry a reusable bag.',
        whenLabel: 'Daytime errands',
        timeSlot: 'midday',
        category: 'low_emission',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('low-emission-walk', snapshot, profile),
      });
    } else if (safety.lowEmissionMobility === 'short_walk_or_transit') {
      items.push({
        id: 'low-emission-transit',
        title: 'Choose public transit or bundle errands off-peak',
        whyItMatters:
          'Combining trips cuts local exhaust emissions while limiting how long you spend beside heavy traffic.',
        howToDoIt:
          profile.primaryCommute === 'car_two_wheeler'
            ? 'Group errands into one midday loop, keep car ventilation on recirculate in traffic, and switch off your engine at long signals.'
            : 'Use metro/bus for longer trips and avoid walking alongside congested main roads during rush hour.',
        whenLabel: 'Commute & errands',
        timeSlot: 'midday',
        category: 'low_emission',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('low-emission-transit', snapshot, profile),
      });
    } else {
      items.push({
        id: 'low-emission-consolidate',
        title: 'Skip non-essential trips and avoid vehicle idling',
        whyItMatters:
          'Outdoor walking or cycling is unsafe in heavy pollution, so the healthiest low-emission move today is reducing trips altogether.',
        howToDoIt:
          'Postpone optional errands, carpool or use closed-window transit only when necessary, and never idle parked vehicles near school gates or homes.',
        whenLabel: 'Throughout the day',
        timeSlot: 'anytime',
        category: 'low_emission',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('low-emission-consolidate', snapshot, profile),
      });
    }

    if (profile.cookingFuel === 'mixed_or_solid') {
      items.push({
        id: 'sustain-clean-cooking',
        title: 'Shift smoky cooking to LPG, induction, or electric kettles',
        whyItMatters:
          'Biomass, coal, or wood smoke produces extreme indoor PM2.5 concentrations and adds heavy local winter soot.',
        howToDoIt:
          'Use LPG or an electric induction/rice cooker for daily meals where available, and keep pots covered to reduce fuel use.',
        whenLabel: 'Meal preparation',
        timeSlot: 'anytime',
        category: 'sustainable_alternative',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('sustain-clean-cooking', snapshot, profile),
      });
    }

    if (profile.openWasteBurningNearby) {
      items.push({
        id: 'sustain-stop-burning',
        title: isCommunity
          ? 'Replace dry-leaf and waste burning with community composting'
          : 'Compost dry leaves and report open garbage burning',
        whyItMatters:
          'A single smoldering pile of winter leaves or trash releases dense toxic PM2.5 across an entire street.',
        howToDoIt:
          'Bag dry leaves for municipal green-waste pickup or a compost bin, and politely coordinate with building staff or local civic helplines to halt open fires.',
        whenLabel: 'Morning & dusk',
        timeSlot: 'evening',
        category: 'sustainable_alternative',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('sustain-stop-burning', snapshot, profile),
      });
    }

    if (
      profile.cookingFuel === 'lpg_induction' &&
      !profile.openWasteBurningNearby &&
      (profile.primaryCommute === 'public_transit' ||
        profile.primaryCommute === 'walk_cycle' ||
        profile.primaryCommute === 'work_from_home')
    ) {
      items.push({
        id: 'sustain-clean-credit',
        title: 'Keep up your clean cooking & low-emission travel baseline',
        whyItMatters:
          'Using clean LPG/induction cooking and avoiding solo car commutes already prevents meaningful neighbourhood pollution every week.',
        howToDoIt:
          'Maintain your current routine, keep stove burners clean for blue flames, and share your low-emission approach with neighbours during winter smog alerts.',
        whenLabel: 'Ongoing habit',
        timeSlot: 'anytime',
        category: 'sustainable_alternative',
        isLowCost: true,
        source: 'deterministic',
        impact: computeActionImpact('sustain-clean-credit', snapshot, profile),
      });
    }

    return items;
  },
};