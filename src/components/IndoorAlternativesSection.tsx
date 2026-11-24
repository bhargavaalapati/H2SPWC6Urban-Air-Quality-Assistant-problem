'use client';

import { Clock, Home, Sparkles } from 'lucide-react';
import type { FamilyAlternative } from '@/domain/air-quality/recommendations';

interface IndoorAlternativesSectionProps {
  alternatives: FamilyAlternative[];
}

export function IndoorAlternativesSection({
  alternatives,
}: IndoorAlternativesSectionProps) {
  if (alternatives.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Family-friendly indoor activity alternatives"
      className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/50 via-white to-stone-50 p-5 shadow-xs sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
          <Home className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Indoor Alternatives Instead of the Park
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Because outdoor air is elevated today, swap active outdoor play for these low-cost,
            low-exertion home activities.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {alternatives.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-medium text-indigo-900">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {item.ageNote}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {item.duration}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
            <p className="mt-2 text-[11px] font-medium text-emerald-800">{item.costNote}</p>
          </article>
        ))}
      </div>
    </section>
  );
}