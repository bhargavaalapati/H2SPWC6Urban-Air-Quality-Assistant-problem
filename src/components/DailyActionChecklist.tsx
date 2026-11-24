'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Leaf,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { ActionCategory, DailyActionItem } from '@/domain/air-quality/types';
import { getActionCategoryMeta } from '@/lib/aqi-theme';

interface DailyActionChecklistProps {
  actions: DailyActionItem[];
  completedIds: string[];
  onToggleComplete: (id: string) => void;
  onResetProgress: () => void;
}

type FilterOption = 'all' | ActionCategory;

const FILTER_OPTIONS: readonly { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'All Actions' },
  { id: 'indoor_hack', label: 'Indoor Hacks' },
  { id: 'low_emission', label: 'Low-Emission' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'family_alternative', label: 'Indoor Swaps' },
];

export function DailyActionChecklist({
  actions,
  completedIds,
  onToggleComplete,
  onResetProgress,
}: DailyActionChecklistProps) {
  const [filter, setFilter] = useState<FilterOption>('all');

  const completedSet = new Set(completedIds);
  const completedCount = actions.filter((a) => completedSet.has(a.id)).length;
  const totalCount = actions.length;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const visibleActions =
    filter === 'all' ? actions : actions.filter((a) => a.category === filter);

  return (
    <section
      aria-label="Daily air quality action plan"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white sm:text-xl">
            Today&apos;s Family Action Plan
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Practical, low-cost steps tailored to current air conditions. Check them off as your
            household completes them.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {completedCount} of {totalCount} done
          </span>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={onResetProgress}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily air protection checklist progress"
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-[#1f5c4d] transition-all duration-300 dark:bg-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
          {remainingCount === 0 && totalCount > 0
            ? 'All recommended actions completed for today. Great job protecting your home air.'
            : `${remainingCount} recommended ${remainingCount === 1 ? 'action' : 'actions'} remaining today.`}
        </p>
      </div>

      {/* Completed State Banner */}
      {remainingCount === 0 && totalCount > 0 && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-medium text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Daily protection checklist complete! Revisit anytime if outdoor conditions change.
          </span>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter daily actions">
        {FILTER_OPTIONS.map((option) => {
          const isSelected = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setFilter(option.id)}
              className={`min-h-[34px] rounded-full px-3 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-emerald-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Action Cards */}
      {visibleActions.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
          No actions in this category for current air conditions. Switch to{' '}
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="font-semibold text-[#1f5c4d] underline dark:text-emerald-400"
          >
            All Actions
          </button>{' '}
          to view your full daily routine.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {visibleActions.map((action) => {
            const isDone = completedSet.has(action.id);
            const badge = getActionCategoryMeta(action.category);

            return (
              <li
                key={action.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  isDone
                    ? 'border-emerald-200/90 bg-emerald-50/40 dark:border-emerald-900/80 dark:bg-emerald-950/25'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(action.id)}
                    aria-pressed={isDone}
                    aria-label={
                      isDone
                        ? `Mark "${action.title}" as not completed`
                        : `Mark "${action.title}" as completed`
                    }
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#1f5c4d] transition-colors hover:bg-emerald-100/70 dark:text-emerald-400 dark:hover:bg-emerald-950"
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-6 w-6 fill-emerald-600 text-white dark:fill-emerald-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {action.whenLabel}
                      </span>
                      {action.isLowCost && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:bg-slate-800 dark:text-slate-300">
                          <Leaf
                            className="h-3 w-3 text-emerald-700 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          Low-cost / Free
                        </span>
                      )}
                      {action.source === 'ai_personalized' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                          <Sparkles
                            className="h-3 w-3 text-sky-600 dark:text-sky-400"
                            aria-hidden="true"
                          />
                          AI Tailored
                        </span>
                      )}
                    </div>

                    <h3
                      className={`mt-2 text-base font-semibold ${
                        isDone
                          ? 'text-slate-500 line-through dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {action.title}
                    </h3>

                    <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      <strong className="font-semibold text-slate-800 dark:text-slate-200">
                        How:
                      </strong>{' '}
                      {action.howToDoIt}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <strong className="font-medium text-slate-700 dark:text-slate-300">
                        Why it matters:
                      </strong>{' '}
                      {action.whyItMatters}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}