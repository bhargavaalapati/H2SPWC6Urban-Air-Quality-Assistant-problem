import { indoorHacksStrategy } from '@/domain/air-quality/strategies/indoor-hacks';
import { mobilityAndSustainabilityStrategy } from '@/domain/air-quality/strategies/mobility-and-sustainability';
import { outdoorAndCommunityStrategy } from '@/domain/air-quality/strategies/outdoor-and-community';
import type { RecommendationStrategy } from '@/domain/air-quality/strategies/types';
import { ventilationStrategy } from '@/domain/air-quality/strategies/ventilation';

/**
 * Ordered Open/Closed strategy registry: new air-quality strategies are added
 * as focused modules here without modifying the planner orchestrator or API routes.
 */
export const STRATEGY_REGISTRY: readonly RecommendationStrategy[] = [
  ventilationStrategy,
  outdoorAndCommunityStrategy,
  indoorHacksStrategy,
  mobilityAndSustainabilityStrategy,
];