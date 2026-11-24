export interface GamificationBadge {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
}

export interface GamificationState {
  xp: number;
  streakDays: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  totalActionsCompleted: number;
  fullDaysCompleted: number;
  lowEmissionActionsCompleted: number;
  questionsAsked: number;
  topicsReadIds: string[];
  lastFullDayRewardDate: string | null;
}

export interface LevelProgress {
  level: number;
  title: string;
  currentXp: number;
  levelMinXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
}

export const INITIAL_GAMIFICATION_STATE: GamificationState = {
  xp: 0,
  streakDays: 0,
  lastActiveDate: null,
  totalActionsCompleted: 0,
  fullDaysCompleted: 0,
  lowEmissionActionsCompleted: 0,
  questionsAsked: 0,
  topicsReadIds: [],
  lastFullDayRewardDate: null,
};

const LEVELS = [
  { level: 1, minXp: 0, title: 'Fresh Air Starter' },
  { level: 2, minXp: 50, title: 'Window Watcher' },
  { level: 3, minXp: 130, title: 'Home Air Protector' },
  { level: 4, minXp: 250, title: 'Clean-Air Champion' },
  { level: 5, minXp: 400, title: 'Neighborhood Guardian' },
] as const;

export function getLocalDateStamp(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(olderYmd: string, newerYmd: string): number {
  const a = Date.parse(`${olderYmd}T00:00:00Z`);
  const b = Date.parse(`${newerYmd}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 999;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function getEffectiveStreak(
  state: GamificationState,
  todayYmd: string = getLocalDateStamp()
): { streakDays: number; activeToday: boolean } {
  if (!state.lastActiveDate || state.streakDays <= 0) {
    return { streakDays: 0, activeToday: false };
  }
  const diff = daysBetween(state.lastActiveDate, todayYmd);
  if (diff <= 0) {
    return { streakDays: state.streakDays, activeToday: true };
  }
  if (diff === 1) {
    return { streakDays: state.streakDays, activeToday: false };
  }
  return { streakDays: 0, activeToday: false };
}

function advanceStreak(
  state: GamificationState,
  todayYmd: string
): { streakDays: number; lastActiveDate: string } {
  if (!state.lastActiveDate) {
    return { streakDays: 1, lastActiveDate: todayYmd };
  }
  const diff = daysBetween(state.lastActiveDate, todayYmd);
  if (diff <= 0) {
    return { streakDays: Math.max(1, state.streakDays), lastActiveDate: state.lastActiveDate };
  }
  if (diff === 1) {
    return { streakDays: state.streakDays + 1, lastActiveDate: todayYmd };
  }
  return { streakDays: 1, lastActiveDate: todayYmd };
}

export function recordActionCompleted(
  state: GamificationState,
  options: {
    isLowEmission: boolean;
    completedAllToday: boolean;
    todayYmd?: string;
  }
): { nextState: GamificationState; xpEarned: number } {
  const today = options.todayYmd ?? getLocalDateStamp();
  const streak = advanceStreak(state, today);

  let xpEarned = 15;
  let fullDaysCompleted = state.fullDaysCompleted;
  let lastFullDayRewardDate = state.lastFullDayRewardDate;

  if (options.completedAllToday && state.lastFullDayRewardDate !== today) {
    xpEarned += 25;
    fullDaysCompleted += 1;
    lastFullDayRewardDate = today;
  }

  return {
    xpEarned,
    nextState: {
      ...state,
      xp: state.xp + xpEarned,
      streakDays: streak.streakDays,
      lastActiveDate: streak.lastActiveDate,
      totalActionsCompleted: state.totalActionsCompleted + 1,
      lowEmissionActionsCompleted:
        state.lowEmissionActionsCompleted + (options.isLowEmission ? 1 : 0),
      fullDaysCompleted,
      lastFullDayRewardDate,
    },
  };
}

export function recordAssistantQuestion(
  state: GamificationState,
  todayYmd: string = getLocalDateStamp()
): { nextState: GamificationState; xpEarned: number } {
  const streak = advanceStreak(state, todayYmd);
  const xpEarned = 10;
  return {
    xpEarned,
    nextState: {
      ...state,
      xp: state.xp + xpEarned,
      streakDays: streak.streakDays,
      lastActiveDate: streak.lastActiveDate,
      questionsAsked: state.questionsAsked + 1,
    },
  };
}

export function recordTopicRead(
  state: GamificationState,
  topicId: string
): { nextState: GamificationState; xpEarned: number } {
  if (state.topicsReadIds.includes(topicId)) {
    return { nextState: state, xpEarned: 0 };
  }
  const xpEarned = 10;
  return {
    xpEarned,
    nextState: {
      ...state,
      xp: state.xp + xpEarned,
      topicsReadIds: [...state.topicsReadIds, topicId],
    },
  };
}

export function getLevelProgress(xp: number): LevelProgress {
  let currentIdx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i]!.minXp) {
      currentIdx = i;
    }
  }

  const current = LEVELS[currentIdx]!;
  const next = LEVELS[currentIdx + 1] ?? null;

  if (!next) {
    return {
      level: current.level,
      title: current.title,
      currentXp: xp,
      levelMinXp: current.minXp,
      nextLevelXp: null,
      progressPercent: 100,
    };
  }

  const span = next.minXp - current.minXp;
  const gained = Math.max(0, xp - current.minXp);
  return {
    level: current.level,
    title: current.title,
    currentXp: xp,
    levelMinXp: current.minXp,
    nextLevelXp: next.minXp,
    progressPercent: Math.min(100, Math.round((gained / span) * 100)),
  };
}

export function getEarnedBadges(state: GamificationState): GamificationBadge[] {
  return [
    {
      id: 'first_step',
      label: 'First Step',
      description: 'Complete your first daily air-protection action',
      unlocked: state.totalActionsCompleted >= 1,
    },
    {
      id: 'daily_shield',
      label: 'Daily Shield',
      description: 'Finish every action in a daily plan',
      unlocked: state.fullDaysCompleted >= 1,
    },
    {
      id: 'low_emission',
      label: 'Low-Emission Habit',
      description: 'Complete a low-emission family routine',
      unlocked: state.lowEmissionActionsCompleted >= 1,
    },
    {
      id: 'curious_family',
      label: 'Informed Family',
      description: 'Ask the AirNest Assistant a question',
      unlocked: state.questionsAsked >= 1,
    },
    {
      id: 'air_scholar',
      label: 'Air Scholar',
      description: 'Read 2+ plain-language air quality guides',
      unlocked: state.topicsReadIds.length >= 2,
    },
    {
      id: 'streak_3',
      label: '3-Day Streak',
      description: 'Stay active for 3 consecutive days',
      unlocked: state.streakDays >= 3,
    },
  ];
}