import type { CleanestWorstHours } from '@/domain/air-quality/thresholds';
import type {
  AirQualitySnapshot,
  DailyActionItem,
  FamilyProfile,
  SafetyAssessment,
} from '@/domain/air-quality/types';

export interface StrategyContext {
  snapshot: AirQualitySnapshot;
  profile: FamilyProfile;
  safety: SafetyAssessment;
  hours: CleanestWorstHours | null;
  isCommunity: boolean;
}

export interface RecommendationStrategy {
  readonly id: string;
  apply(context: StrategyContext): DailyActionItem[];
}