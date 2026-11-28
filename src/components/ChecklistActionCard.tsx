'use client';

import {
  Calculator,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Leaf,
  Sparkles,
} from 'lucide-react';
import type { DailyActionItem } from '@/domain/air-quality/types';
import { getActionCategoryMeta } from '@/lib/aqi-theme';

interface ChecklistActionCardProps {
  action: DailyActionItem;
  isDone: boolean;
  isCalcOpen: boolean;
  onToggleComplete: (id: string) => void;
  onToggleCalc: (id: string) => void;
}

export function ChecklistActionCard({
  action,
  isDone,
  isCalcOpen,
  onToggleComplete,
  onToggleCalc,
}: ChecklistActionCardProps) {
  const badge = getActionCategoryMeta(action.category);

  return (
    <li
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
            <strong className="font-semibold text-slate-800 dark:text-slate-200">How:</strong>{' '}
            {action.howToDoIt}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <strong className="font-medium text-slate-700 dark:text-slate-300">
              Why it matters:
            </strong>{' '}
            {action.whyItMatters}
          </p>

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
                  onClick={() => onToggleCalc(action.id)}
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
                  <CalendarPlus
                    className="h-3 w-3 text-[#1f5c4d] dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>Add reminder</span>
                </a>
              )}
            </div>
          )}

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
                      {factor.kind === 'published_factor' ? 'Published factor' : 'Assumption'}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">{factor.label}:</strong>
                    <span>{factor.value}</span>
                    <span className="text-slate-500 dark:text-slate-400">({factor.source})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}