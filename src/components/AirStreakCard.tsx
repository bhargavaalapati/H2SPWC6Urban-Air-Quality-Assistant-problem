'use client';

import { Award, Flame, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  getEarnedBadges,
  getEffectiveStreak,
  getLevelProgress,
  type GamificationState,
} from '@/domain/air-quality/gamification';

interface AirStreakCardProps {
  state: GamificationState;
}

export function AirStreakCard({ state }: AirStreakCardProps) {
  const { streakDays, activeToday } = getEffectiveStreak(state);
  const level = getLevelProgress(state.xp);
  const badges = getEarnedBadges(state);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <section
      aria-label="Family clean-air streak and progress"
      className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/40 p-5 shadow-xs dark:border-amber-900/60 dark:from-amber-950/25 dark:via-slate-900 dark:to-emerald-950/25"
    >
      {/* Streak + Level Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              activeToday
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            <Flame aria-hidden="true" className="h-5 w-5"/>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">
              {streakDays} {streakDays === 1 ? 'Day' : 'Days'} Clean-Air Streak
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {activeToday
                ? 'Today’s family streak is lit!'
                : 'Complete 1 action today to start your streak'}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <Sparkles aria-hidden="true" className="h-3 w-3"/>
          {state.xp} XP
        </span>
      </div>

      {/* Level Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Level {level.level} · {level.title}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {level.nextLevelXp !== null
              ? `${level.nextLevelXp - level.currentXp} XP to Lv ${level.level + 1}`
              : 'Max Level'}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={level.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Clean-air level progress"
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-300 dark:bg-amber-400"
            style={{ width: `${Math.max(level.progressPercent, state.xp > 0 ? 6 : 0)}%` }}
          />
        </div>
      </div>

      {/* Milestone Badges */}
      <div className="mt-4 border-t border-slate-200/70 pt-3.5 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
            <Award aria-hidden="true" className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"/>
            Family Milestones
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {unlockedCount}/{badges.length} unlocked
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.id}
              title={badge.description}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                badge.unlocked
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200'
                  : 'border-slate-200 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500'
              }`}
            >
              {badge.unlocked && (
                <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-emerald-600 dark:text-emerald-400"/>
              )}
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}