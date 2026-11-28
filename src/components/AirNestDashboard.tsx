'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Flame, ShieldCheck, WifiOff, Wind } from 'lucide-react';
import { getEffectiveStreak } from '@/domain/air-quality/gamification';
import { buildDeterministicPlan } from '@/domain/air-quality/recommendations';
import { SAFETY_DISCLAIMER } from '@/domain/air-quality/thresholds';
import type { FamilyProfile } from '@/domain/air-quality/types';
import { useAirQualityData } from '@/hooks/useAirQualityData';
import { useHouseholdState } from '@/hooks/useHouseholdState';
import { getTodayKey } from '@/lib/storage';
import { AirQualityAssistant } from '@/components/AirQualityAssistant';
import { AirStreakCard } from '@/components/AirStreakCard';
import { AqiOverviewCard } from '@/components/AqiOverviewCard';
import { DailyActionChecklist } from '@/components/DailyActionChecklist';
import { FamilyProfilePanel } from '@/components/FamilyProfilePanel';
import { IndoorAlternativesSection } from '@/components/IndoorAlternativesSection';
import { LocationSwitcher } from '@/components/LocationSwitcher';
import { PollutionEducation } from '@/components/PollutionEducation';
import { StatusToast } from '@/components/StatusToast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WelcomeQuickStart } from '@/components/WelcomeQuickStart';

export function AirNestDashboard() {
  const {
    profile,
    gamification,
    completedIds,
    isOffline,
    toast,
    showToast,
    dismissToast,
    updateProfile,
    hydrateChecklist,
    toggleActionComplete,
    resetChecklist,
    awardQuestionXp,
    awardTopicXp,
  } = useHouseholdState();

  const {
    snapshot,
    aiPlanOverride,
    aiNote,
    isLoadingAqi,
    isLoadingAiPlan,
    locationError,
    clearAiOverride,
    selectDemo,
    searchCity,
    selectLocation,
    useGeolocation,
    requestAiPlan,
  } = useAirQualityData({ profile, showToast });

  const deterministicPlan = useMemo(
    () => buildDeterministicPlan(snapshot, profile),
    [snapshot, profile]
  );

  const activePlan = aiPlanOverride ?? deterministicPlan;
  const { streakDays, activeToday } = useMemo(
    () => getEffectiveStreak(gamification),
    [gamification]
  );

  const activeLocationDisplay = snapshot.location.region
    ? `${snapshot.location.name}, ${snapshot.location.region}`
    : snapshot.location.name;

  const checklistStorageKey = useMemo(
    () => getTodayKey(snapshot.demoScenarioId ?? snapshot.location.name),
    [snapshot.demoScenarioId, snapshot.location.name]
  );

  useEffect(() => {
    hydrateChecklist(checklistStorageKey);
  }, [checklistStorageKey, hydrateChecklist]);

  const handleProfileChange = useCallback(
    (nextProfile: FamilyProfile) => {
      updateProfile(nextProfile);
      clearAiOverride();
    },
    [updateProfile, clearAiOverride]
  );

  const handleResetChecklist = useCallback(() => {
    resetChecklist(checklistStorageKey);
  }, [resetChecklist, checklistStorageKey]);

  const handleToggleAction = useCallback(
    (actionId: string) => {
      toggleActionComplete(actionId, checklistStorageKey, activePlan.actions);
    },
    [toggleActionComplete, checklistStorageKey, activePlan.actions]
  );

  const flameClassName = activeToday
    ? 'h-3.5 w-3.5 text-amber-500'
    : 'h-3.5 w-3.5 text-slate-400';

  const streakBadgeClassName = activeToday
    ? 'inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200'
    : 'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f5c4d] text-white dark:bg-emerald-600">
              <Wind
                aria-hidden="true"
                className="h-5 w-5"
              />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-950 dark:text-white">
                AirNest
              </span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">
                Urban Air Quality Assistant for Families &amp; Communities
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              title="Daily family clean-air habit streak"
              className={streakBadgeClassName}
            >
              <Flame
                aria-hidden="true"
                className={flameClassName}
              />
              <span>{streakDays}d</span>
            </span>

            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 md:inline-flex">
              <ShieldCheck
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
              <span>Safety-first guidance</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {isOffline && (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:border-amber-900 dark:bg-amber-950/70 dark:text-amber-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <WifiOff
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
            You are offline. Simulated demo scenarios, your profile, and checklist tracking
            remain available.
          </span>
        </div>
      )}

      <main
        id="main-content"
        className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6"
      >
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Turn today&apos;s air quality into calm, practical habits—with clear impact.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Know whether kids should play outside, when to keep windows closed, which low-cost
            indoor hacks and sustainable alternatives fit your home or community, and the exact
            exposure you avoid.
          </p>
        </div>

        <WelcomeQuickStart />

        <nav
          aria-label="Dashboard sections"
          className="flex flex-wrap items-center gap-2 text-xs"
        >
          <span className="font-semibold text-slate-500 dark:text-slate-400">Jump to:</span>
          <a
            href="#aqi-overview"
            className="inline-flex min-h-[36px] items-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-700 hover:border-[#1f5c4d] hover:text-white-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Air Overview
          </a>
          <a
            href="#action-plan"
            className="inline-flex min-h-[36px] items-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-700 hover:border-[#1f5c4d] hover:text-white-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Action Plan &amp; Impact
          </a>
          <a
            href="#family-assistant"
            className="inline-flex min-h-[36px] items-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-700 hover:border-[#1f5c4d] hover:text-white-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Ask Assistant
          </a>
          <a
            href="#household-profile"
            className="inline-flex min-h-[36px] items-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-700 hover:border-[#1f5c4d] hover:text-white-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Who Is This For
          </a>
        </nav>

        <LocationSwitcher
          activeDemoId={snapshot.demoScenarioId}
          activeLocationDisplay={activeLocationDisplay}
          errorMessage={locationError}
          isLoading={isLoadingAqi}
          isOffline={isOffline}
          onSearchCity={searchCity}
          onSelectDemo={selectDemo}
          onSelectLocation={selectLocation}
          onUseGeolocation={useGeolocation}
        />

        <div id="aqi-overview" className="scroll-mt-20">
          <AqiOverviewCard
            dailyHeadline={activePlan.dailyHeadline}
            isLoading={isLoadingAqi}
            safety={activePlan.safety}
            snapshot={snapshot}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-8">
            <div id="action-plan" className="scroll-mt-20">
              <DailyActionChecklist
                actions={activePlan.actions}
                completedIds={completedIds}
                impactTotals={activePlan.impactTotals}
                onResetProgress={handleResetChecklist}
                onToggleComplete={handleToggleAction}
              />
            </div>

            <IndoorAlternativesSection alternatives={activePlan.indoorAlternatives} />

            <div id="family-assistant" className="scroll-mt-20">
              <AirQualityAssistant
                isOffline={isOffline}
                onQuestionAnswered={awardQuestionXp}
                profile={profile}
                snapshot={snapshot}
              />
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <AirStreakCard state={gamification} />

            <div id="household-profile" className="scroll-mt-20">
              <FamilyProfilePanel
                aiNote={aiNote}
                isAiLoading={isLoadingAiPlan}
                isOffline={isOffline}
                onChange={handleProfileChange}
                onRequestAiPlan={requestAiPlan}
                planMode={activePlan.mode}
                profile={profile}
              />
            </div>

            <PollutionEducation onTopicOpen={awardTopicXp} />
          </aside>
        </div>

        <footer className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <strong className="font-semibold text-slate-800 dark:text-slate-200">
            Trust &amp; Safety Note:
          </strong>{' '}
          {SAFETY_DISCLAIMER}
        </footer>
      </main>

      <StatusToast
        notice={toast}
        onDismiss={dismissToast}
      />
    </div>
  );
}