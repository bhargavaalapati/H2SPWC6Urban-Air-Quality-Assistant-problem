'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { AssistantReply } from '@/domain/air-quality/ai-guardrails';
import type { AirQualitySnapshot, FamilyProfile } from '@/domain/air-quality/types';

interface QuotaInfo {
  remaining: number;
  limit: number;
  resetInSeconds: number;
}

interface AirQualityAssistantProps {
  snapshot: AirQualitySnapshot;
  profile: FamilyProfile;
  isOffline: boolean;
  onQuestionAnswered?: () => void;
}

interface ConversationTurn {
  id: string;
  question: string;
  reply: AssistantReply;
}

const STARTER_QUESTIONS: readonly string[] = [
  'Can my children play outside today?',
  'Should I open the windows this morning?',
  'How can I make my bedroom air cleaner tonight without expensive products?',
  'What can we do instead of going to the park?',
];

export function AirQualityAssistant({
  snapshot,
  profile,
  isOffline,
  onQuestionAnswered,
}: AirQualityAssistantProps) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo>({
    remaining: 10,
    limit: 10,
    resetInSeconds: 86400,
  });

  const isLimitReached = quota.remaining <= 0;

  const askQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (trimmed.length < 2 || isLoading || isLimitReached) return;

    if (isOffline) {
      setErrorMessage(
        'You appear to be offline. Reconnect to ask the assistant, or follow the offline-ready daily checklist.'
      );
      setLastFailedQuestion(trimmed);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLastFailedQuestion(null);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          snapshot,
          profile,
        }),
      });

      const data = (await response.json()) as {
        reply?: AssistantReply;
        quota?: QuotaInfo;
        error?: string;
      };

      if (data.quota) {
        setQuota(data.quota);
      }

      if (!response.ok || !data.reply) {
        setErrorMessage(
          data.error ?? 'Could not get a response right now. Please try again.'
        );
        setLastFailedQuestion(response.status === 429 ? null : trimmed);
        return;
      }

      setTurns((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question: trimmed,
          reply: data.reply!,
        },
        ...prev,
      ]);
      setQuestion('');
      onQuestionAnswered?.();
    } catch {
      setErrorMessage(
        'Network issue reaching the assistant. Check your connection and try again.'
      );
      setLastFailedQuestion(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await askQuestion(question);
  };

  return (
    <section
      aria-label="Family Air Quality Assistant"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#1f5c4d] dark:bg-emerald-950 dark:text-emerald-300">
            <MessageCircle aria-hidden="true" className="h-5 w-5"/>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Ask AirNest Assistant
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Grounded in {snapshot.location.name} (
              {snapshot.aqi !== null ? `AQI ${snapshot.aqi}` : 'AQI unavailable'}) and your
              household setup.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
            isLimitReached
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {quota.remaining}/{quota.limit} questions left today
        </span>
      </div>

      {/* Starter Prompt Chips */}
      <div className="mt-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Try a practical household question:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STARTER_QUESTIONS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isLoading || isLimitReached}
              onClick={() => void askQuestion(prompt)}
              className="min-h-[36px] rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-[#1f5c4d] hover:bg-emerald-50/60 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Question Form */}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="assistant-question-input" className="sr-only">
          Ask a practical air-quality question for your family
        </label>
        <input
          id="assistant-question-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={600}
          placeholder={
            isLimitReached
              ? 'Daily question limit reached — checklist & guides remain unlimited'
              : 'Ask about windows, kids play, commuting, or low-cost indoor air hacks...'
          }
          disabled={isLoading || isLimitReached}
          className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
        />
        <button
          type="submit"
          disabled={isLoading || isLimitReached || question.trim().length < 2}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1f5c4d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#17483c] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {isLoading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin"/>
          ) : (
            <Send aria-hidden="true" className="h-4 w-4"/>
          )}
          <span>{isLoading ? 'Checking...' : 'Ask'}</span>
        </button>
      </form>

      {/* Error + Retry State */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0"/>
            <span>{errorMessage}</span>
          </div>
          {lastFailedQuestion && (
            <button
              type="button"
              onClick={() => void askQuestion(lastFailedQuestion)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 font-semibold text-rose-900 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/60 dark:text-rose-100"
            >
              <RefreshCw aria-hidden="true" className="h-3 w-3"/>
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div
          aria-busy="true"
          className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-2.5 h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-1.5 h-3 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {/* Conversation History or Empty State */}
      {turns.length === 0 && !isLoading ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
          Tap any question above or type your own. Answers always respect verified AQI safety
          thresholds and never invent pollutant readings.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {turns.map((turn) => (
            <article
              key={turn.id}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Q: {turn.question}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    turn.reply.responseMode === 'ai'
                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                      : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  }`}
                >
                  {turn.reply.responseMode === 'ai' ? (
                    <>
                      <Sparkles aria-hidden="true" className="h-3 w-3"/>
                      AI Grounded
                    </>
                  ) : (
                    <>
                      <ShieldCheck aria-hidden="true" className="h-3 w-3"/>
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
          ))}
        </div>
      )}
    </section>
  );
}