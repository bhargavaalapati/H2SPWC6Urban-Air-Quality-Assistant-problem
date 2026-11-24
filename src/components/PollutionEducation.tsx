'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { EDUCATION_TOPICS } from '@/domain/air-quality/education';

interface PollutionEducationProps {
  onTopicOpen?: (topicId: string) => void;
}

export function PollutionEducation({ onTopicOpen }: PollutionEducationProps) {
  const [expandedId, setExpandedId] = useState<string | null>(EDUCATION_TOPICS[0]?.id ?? null);

  const handleToggle = (topicId: string) => {
    const opening = expandedId !== topicId;
    setExpandedId(opening ? topicId : null);
    if (opening) {
      onTopicOpen?.(topicId);
    }
  };

  return (
    <section
      aria-label="Plain-language air quality guide"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2">
        <BookOpen aria-hidden="true" className="h-4 w-4 text-[#1f5c4d] dark:text-emerald-400"/>
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          Air Quality, Explained Simply
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Quick answers without jargon—expand any topic to learn more (+10 XP).
      </p>

      <div className="mt-3.5 space-y-2">
        {EDUCATION_TOPICS.map((topic) => {
          const isOpen = expandedId === topic.id;
          return (
            <div
              key={topic.id}
              className="rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => handleToggle(topic.id)}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {topic.title}
                </span>
                {isOpen ? (
                  <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500"/>
                ) : (
                  <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500"/>
                )}
              </button>

              {isOpen && (
                <div className="space-y-2 border-t border-slate-200/70 px-3.5 py-3 text-xs leading-relaxed dark:border-slate-800">
                  <p className="text-slate-700 dark:text-slate-300">{topic.shortAnswer}</p>
                  <p className="rounded-lg bg-emerald-50/80 px-2.5 py-2 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200">
                    <strong className="font-semibold">Household takeaway:</strong>{' '}
                    {topic.practicalTakeaway}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {topic.deeperDetail}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}