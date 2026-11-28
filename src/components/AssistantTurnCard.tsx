'use client';

import { ShieldCheck, Sparkles } from 'lucide-react';
import type { AssistantReply } from '@/domain/air-quality/ai-guardrails';

export interface ConversationTurn {
  id: string;
  question: string;
  reply: AssistantReply;
}

interface AssistantTurnCardProps {
  turn: ConversationTurn;
}

export function AssistantTurnCard({ turn }: AssistantTurnCardProps) {
  const isAi = turn.reply.responseMode === 'ai';

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">Q: {turn.question}</p>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            isAi
              ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
              : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          {isAi ? (
            <>
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              AI Grounded
            </>
          ) : (
            <>
              <ShieldCheck aria-hidden="true" className="h-3 w-3" />
              Built-in Safety Guide
            </>
          )}
        </span>
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
        {turn.reply.answer}
      </p>

      {turn.reply.practicalSteps.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-3 dark:border-slate-800">
          {turn.reply.practicalSteps.map((step, index) => (
            <li
              key={`${turn.id}-step-${index}`}
              className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1f5c4d] dark:bg-emerald-400" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        {turn.reply.dataNote}
        {turn.reply.fallbackReason ? ` (${turn.reply.fallbackReason})` : ''}
      </p>
    </article>
  );
}