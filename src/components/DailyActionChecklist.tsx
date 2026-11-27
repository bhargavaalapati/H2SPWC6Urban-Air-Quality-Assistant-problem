'use client';

import { useState } from 'react';
import {
  Calculator,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Leaf,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type {
  ActionCategory,
  DailyActionItem,
  PlanImpactTotals,
} from '@/domain/air-quality/types';
import { getActionCategoryMeta } from '@/lib/aqi-theme';

interface DailyActionChecklistProps {
  actions: DailyActionItem[];
  impactTotals: PlanImpactTotals;
  completedIds: string[];
  onToggleComplete: (id: string) => void;
  onResetProgress: () => void;
}

type FilterOption = 'all' | ActionCategory;

const FILTER_OPTIONS: readonly { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'All Actions' },
  { id: 'indoor_hack', label: 'Indoor Hacks' },
  { id: 'low_emission', label: 'Low-Emission' },
  { id: 'sustainable_alternative', label: 'Sustainable' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'family_alternative', label: 'Indoor Swaps' },
];

export function DailyActionChecklist({
  actions,
  impactTotals,
  completedIds,
  onToggleComplete,
  onResetProgress,
}: DailyActionChecklistProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [openCalcId, setOpenCalcId] = useState<string | null>(null);

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
            Today&apos;s Action Plan &amp; Direct Impact
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Computed deterministically for <strong>{impactTotals.audienceLabel}</strong>. Check
            actions off as you complete them.
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

      {/* Direct Impact Totals Strip */}
      <dl
        aria-label="Estimated direct impact of following today's plan"
        className="mt-4 grid grid-cols-1 gap-2.5 rounded-2xl border border-emerald-200/70 bg-emerald-50/45 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/25 sm:grid-cols-3"
      >
        <div>
          <dt className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            PM2.5 Exposure Avoided
          </dt>
          <dd className="mt-0.5 text-base font-bold text-slate-950 dark:text-white">
            {impactTotals.pm25AvoidedUgPerDay.toLocaleString()} µg/day
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            CO₂e Prevented
          </dt>
          <dd className="mt-0.5 text-base font-bold text-slate-950 dark:text-white">
            {impactTotals.co2eSavedKgPerWeek.toLocaleString()} kg/week
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            Local PM2.5 Emissions Cut
          </dt>
          <dd className="mt-0.5 text-base font-bold text-slate-950 dark:text-white">
            {impactTotals.pm25EmissionsPreventedGPerWeek.toLocaleString()} g/week
          </dd>
        </div>
      </dl>

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
            const isCalcOpen = openCalcId === action.id;

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
                    className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1f5c4d] transition-colors hover:bg-emerald-100/70 dark:text-emerald-400 dark:hover:bg-emerald-950"
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

                    {/* Action Direct Impact Pills + Transparent Formula Disclosure + Calendar Link */}
                    {(action.impact || action.calendarUrl) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                        {action.impact && action.impact.pm25AvoidedUgPerDay > 0 && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200">
                            −{action.impact.pm25AvoidedUgPerDay} µg PM2.5/day
                          </span>
                        )}
                        {action.impact && action.impact.co2eSavedKgPerWeek > 0 && (
                          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900 dark:bg-sky-950/70 dark:text-sky-200">
                            −{action.impact.co2eSavedKgPerWeek} kg CO₂e/wk
                          </span>
                        )}
                        {action.impact && action.impact.pm25EmissionsPreventedGPerWeek > 0 && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
                            −{action.impact.pm25EmissionsPreventedGPerWeek} g PM2.5 emitted/wk
                          </span>
                        )}

                        {action.impact && (
                          <button
                            type="button"
                            aria-expanded={isCalcOpen}
                            aria-label={`How impact was calculated for ${action.title}`}
                            onClick={() => setOpenCalcId(isCalcOpen ? null : action.id)}
                            className="inline-flex min-h-[28px] items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Calculator className="h-3 w-3" aria-hidden="true" />
                            <span>How this was calculated</span>
                            {isCalcOpen ? (
                              <ChevronUp className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-3 w-3" aria-hidden="true" />
                            )}
                          </button>
                        )}

                        {action.calendarUrl && (
                          <a
                            href={action.calendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[28px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <CalendarPlus className="h-3 w-3 text-[#1f5c4d] dark:text-emerald-400" aria-hidden="true" />
                            <span>Add reminder</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Expandable Formula & Factor Citations */}
                    {action.impact && isCalcOpen && (
                      <div className="mt-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                        <p className="font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">
                          {action.impact.formulaSummary}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {action.impact.factors.map((factor, idx) => (
                            <li
                              key={`${action.id}-factor-${idx}`}
                              className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400"
                            >
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  factor.kind === 'published_factor'
                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                                    : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {factor.kind === 'published_factor'
                                  ? 'Published factor'
                                  : 'Assumption'}
                              </span>
                              <strong className="text-slate-800 dark:text-slate-200">
                                {factor.label}:
                              </strong>
                              <span>{factor.value}</span>
                              <span className="text-slate-500 dark:text-slate-400">
                                ({factor.source})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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