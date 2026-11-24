import { describe, expect, it } from 'vitest';
import {
  getEarnedBadges,
  getEffectiveStreak,
  getLevelProgress,
  INITIAL_GAMIFICATION_STATE,
  recordActionCompleted,
  recordAssistantQuestion,
  recordTopicRead,
} from '@/domain/air-quality/gamification';

describe('gamification engine', () => {
  it('starts a 1-day streak and awards +15 XP on first completed action', () => {
    const { nextState, xpEarned } = recordActionCompleted(INITIAL_GAMIFICATION_STATE, {
      isLowEmission: false,
      completedAllToday: false,
      todayYmd: '2026-11-24',
    });

    expect(xpEarned).toBe(15);
    expect(nextState.xp).toBe(15);
    expect(nextState.streakDays).toBe(1);
    expect(getEffectiveStreak(nextState, '2026-11-24')).toEqual({
      streakDays: 1,
      activeToday: true,
    });
  });

  it('extends streak across consecutive days and resets after a missed day', () => {
    const day1 = recordActionCompleted(INITIAL_GAMIFICATION_STATE, {
      isLowEmission: true,
      completedAllToday: false,
      todayYmd: '2026-11-22',
    }).nextState;

    const day2 = recordActionCompleted(day1, {
      isLowEmission: false,
      completedAllToday: true,
      todayYmd: '2026-11-23',
    });

    expect(day2.xpEarned).toBe(40); // 15 action + 25 full-day bonus
    expect(day2.nextState.streakDays).toBe(2);

    // Missed 2026-11-24 -> checking on 2026-11-25 shows 0 effective streak
    expect(getEffectiveStreak(day2.nextState, '2026-11-25')).toEqual({
      streakDays: 0,
      activeToday: false,
    });
  });

  it('tracks levels, unique topic reads, and milestone badge unlocks', () => {
    let state = recordAssistantQuestion(INITIAL_GAMIFICATION_STATE, '2026-11-24').nextState;
    state = recordTopicRead(state, 'aqi-meaning').nextState;
    const duplicateTopic = recordTopicRead(state, 'aqi-meaning');
    expect(duplicateTopic.xpEarned).toBe(0);

    state = recordTopicRead(state, 'pm25-vs-pm10').nextState;
    state = recordActionCompleted(state, {
      isLowEmission: true,
      completedAllToday: true,
      todayYmd: '2026-11-24',
    }).nextState;

    expect(getLevelProgress(state.xp).level).toBeGreaterThanOrEqual(2);
    const unlockedIds = getEarnedBadges(state)
      .filter((b) => b.unlocked)
      .map((b) => b.id);
    expect(unlockedIds).toEqual(
      expect.arrayContaining(['first_step', 'daily_shield', 'low_emission', 'curious_family', 'air_scholar'])
    );
  });
});