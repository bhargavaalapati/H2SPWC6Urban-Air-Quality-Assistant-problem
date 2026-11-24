'use client';

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flame, ShieldCheck, WifiOff, Wind } from 'lucide-react';
import { DEMO_SCENARIOS, getDemoScenarioById } from '@/domain/air-quality/demo-scenarios';
import {
  getEffectiveStreak,
  INITIAL_GAMIFICATION_STATE,
  recordActionCompleted,
  recordAssistantQuestion,
  recordTopicRead,
  type GamificationState,
} from '@/domain/air-quality/gamification';
import { buildDeterministicPlan, type DailyPlan } from '@/domain/air-quality/recommendations';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import { SAFETY_DISCLAIMER } from '@/domain/air-quality/thresholds';
import type { AirQualitySnapshot, FamilyProfile, LocationInfo } from '@/domain/air-quality/types';
import {
  getTodayKey,
  loadCompletedIds,
  loadFamilyProfile,
  loadGamificationState,
  saveCompletedIds,
  saveFamilyProfile,
  saveGamificationState,
} from '@/lib/storage';
import { AirQualityAssistant } from '@/components/AirQualityAssistant';
import { AirStreakCard } from '@/components/AirStreakCard';
import { AqiOverviewCard } from '@/components/AqiOverviewCard';
import { DailyActionChecklist } from '@/components/DailyActionChecklist';
import { FamilyProfilePanel } from '@/components/FamilyProfilePanel';
import { IndoorAlternativesSection } from '@/components/IndoorAlternativesSection';
import { LocationSwitcher } from '@/components/LocationSwitcher';
import { PollutionEducation } from '@/components/PollutionEducation';
import { StatusToast, type ToastNotice } from '@/components/StatusToast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WelcomeQuickStart } from '@/components/WelcomeQuickStart';

const INITIAL_DEMO = DEMO_SCENARIOS[0]!;

export function AirNestDashboard() {
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot>(INITIAL_DEMO.snapshot);
  const [profile, setProfile] = useState<FamilyProfile>(DEFAULT_FAMILY_PROFILE);
  const [gamification, setGamification] = useState<GamificationState>(
    INITIAL_GAMIFICATION_STATE
  );
  const [aiPlanOverride, setAiPlanOverride] = useState<DailyPlan | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [isLoadingAqi, setIsLoadingAqi] = useState(false);
  const [isLoadingAiPlan, setIsLoadingAiPlan] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = useCallback((tone: ToastNotice['tone'], message: string) => {
    setToast({ id: Date.now(), tone, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Hydrate saved household profile, gamification streak, and network status
  useEffect(() => {
    setProfile(loadFamilyProfile());
    setGamification(loadGamificationState());
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => {
      setIsOffline(false);
      showToast('success', 'Back online. Live city lookups and AI assistant are ready.');
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast('info', 'You are offline. Demo scenarios and your checklist still work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

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
    setCompletedIds(loadCompletedIds(checklistStorageKey));
  }, [checklistStorageKey]);

  const handleProfileChange = useCallback((nextProfile: FamilyProfile) => {
    setProfile(nextProfile);
    saveFamilyProfile(nextProfile);
    setAiPlanOverride(null);
    setAiNote(null);
  }, []);

  const handleSelectDemo = useCallback(
    (scenarioId: string) => {
      const scenario = getDemoScenarioById(scenarioId);
      if (!scenario) return;
      setLocationError(null);
      setSnapshot(scenario.snapshot);
      setAiPlanOverride(null);
      setAiNote(null);
      showToast('info', `Loaded demo scenario: ${scenario.name}.`);
    },
    [showToast]
  );

  const handleSearchCity = useCallback(
    async (city: string) => {
      setIsLoadingAqi(true);
      setLocationError(null);
      try {
        const response = await fetch(
          `/api/air-quality?city=${encodeURIComponent(city)}`
        );
        const data = (await response.json()) as {
          snapshot?: AirQualitySnapshot;
          error?: string;
        };

        if (!response.ok || !data.snapshot) {
          setLocationError(
            data.error ?? 'Could not fetch air quality for that city right now.'
          );
          return;
        }

        setSnapshot(data.snapshot);
        setAiPlanOverride(null);
        setAiNote(null);
        showToast(
          'success',
          `Loaded ${data.snapshot.provenance} air quality for ${data.snapshot.location.name}.`
        );
      } catch {
        setLocationError(
          'Network error while reaching the air-quality service. You can still explore any Demo Scenario below.'
        );
      } finally {
        setIsLoadingAqi(false);
      }
    },
    [showToast]
  );

  const handleSelectLocation = useCallback(
    async (loc: LocationInfo) => {
      setIsLoadingAqi(true);
      setLocationError(null);
      try {
        const params = new URLSearchParams({
          lat: String(loc.latitude),
          lon: String(loc.longitude),
          label: loc.name,
        });
        if (loc.region) params.set('region', loc.region);
        if (loc.country) params.set('country', loc.country);

        const response = await fetch(`/api/air-quality?${params.toString()}`);
        const data = (await response.json()) as {
          snapshot?: AirQualitySnapshot;
          error?: string;
        };

        if (!response.ok || !data.snapshot) {
          setLocationError(
            data.error ?? 'Could not fetch air quality for that selected city.'
          );
          return;
        }

        setSnapshot(data.snapshot);
        setAiPlanOverride(null);
        setAiNote(null);
        const displayName = loc.region ? `${loc.name}, ${loc.region}` : loc.name;
        showToast('success', `Loaded live air quality for ${displayName}.`);
      } catch {
        setLocationError(
          'Network error while loading that city. Try again or pick a Demo Scenario.'
        );
      } finally {
        setIsLoadingAqi(false);
      }
    },
    [showToast]
  );

  const handleUseGeolocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(
        'Browser geolocation is not supported here. Enter your city name manually instead.'
      );
      return;
    }

    setLocationError(null);

    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err),
          { timeout: 8000, maximumAge: 300_000 }
        );
      });

      setIsLoadingAqi(true);
      const response = await fetch(
        `/api/air-quality?lat=${encodeURIComponent(String(coords.latitude))}&lon=${encodeURIComponent(String(coords.longitude))}`
      );
      const data = (await response.json()) as {
        snapshot?: AirQualitySnapshot;
        error?: string;
      };

      if (!response.ok || !data.snapshot) {
        setLocationError(
          data.error ?? 'Could not load air quality for your coordinates.'
        );
        return;
      }

      setSnapshot(data.snapshot);
      setAiPlanOverride(null);
      setAiNote(null);
      const displayName = data.snapshot.location.region
        ? `${data.snapshot.location.name}, ${data.snapshot.location.region}`
        : data.snapshot.location.name;
      showToast('success', `Detected ${displayName} and loaded live air quality.`);
    } catch {
      setLocationError(
        'Location permission was declined or unavailable. Type your city name above for live readings.'
      );
    } finally {
      setIsLoadingAqi(false);
    }
  }, [showToast]);

  const handleRequestAiPlan = useCallback(async () => {
    setIsLoadingAiPlan(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot, profile, preferAi: true }),
      });

      const data = (await response.json()) as {
        plan?: DailyPlan;
        aiStatus?: 'ai_enhanced' | 'deterministic_only' | 'fallback_used';
        aiNote?: string;
        error?: string;
      };

      if (!response.ok || !data.plan) {
        const msg =
          data.error ??
          'Could not reach AI personalization right now; keeping verified safety rules.';
        setAiNote(msg);
        showToast('error', msg);
        return;
      }

      setAiPlanOverride(data.plan);
      setAiNote(data.aiNote ?? null);
      showToast(
        data.aiStatus === 'ai_enhanced' ? 'success' : 'info',
        data.aiStatus === 'ai_enhanced'
          ? 'Daily plan tailored with AI within verified safety rules.'
          : (data.aiNote ?? 'Showing verified safety-rule plan.')
      );
    } catch {
      const msg = 'Network issue while tailoring with AI; showing verified deterministic plan.';
      setAiNote(msg);
      showToast('error', msg);
    } finally {
      setIsLoadingAiPlan(false);
    }
  }, [snapshot, profile, showToast]);

  const handleToggleComplete = useCallback(
    (actionId: string) => {
      setCompletedIds((prev) => {
        const exists = prev.includes(actionId);
        const next = exists
          ? prev.filter((id) => id !== actionId)
          : [...prev, actionId];
        saveCompletedIds(checklistStorageKey, next);

        if (!exists) {
          const action = activePlan.actions.find((a) => a.id === actionId);
          const completedAllToday =
            activePlan.actions.length > 0 &&
            activePlan.actions.every((a) => next.includes(a.id));

          setGamification((current) => {
            const { nextState, xpEarned } = recordActionCompleted(current, {
              isLowEmission: action?.category === 'low_emission',
              completedAllToday,
            });
            saveGamificationState(nextState);
            showToast(
              'success',
              completedAllToday
                ? `Full day protected! +${xpEarned} Clean-Air XP earned.`
                : `Action completed! +${xpEarned} Clean-Air XP.`
            );
            return nextState;
          });
        }

        return next;
      });
    },
    [checklistStorageKey, activePlan.actions, showToast]
  );

  const handleResetProgress = useCallback(() => {
    setCompletedIds([]);
    saveCompletedIds(checklistStorageKey, []);
    showToast('info', 'Daily checklist progress reset.');
  }, [checklistStorageKey, showToast]);

  const handleQuestionAnswered = useCallback(() => {
    setGamification((current) => {
      const { nextState, xpEarned } = recordAssistantQuestion(current);
      saveGamificationState(nextState);
      showToast('success', `Grounded answer ready! +${xpEarned} Clean-Air XP.`);
      return nextState;
    });
  }, [showToast]);

  const handleTopicOpen = useCallback(
    (topicId: string) => {
      setGamification((current) => {
        const { nextState, xpEarned } = recordTopicRead(current, topicId);
        if (xpEarned > 0) {
          saveGamificationState(nextState);
          showToast('success', `Air guide explored! +${xpEarned} Clean-Air XP.`);
        }
        return nextState;
      });
    },
    [showToast]
  );

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f5c4d] text-white dark:bg-white/10">
              <Image
                src="/images/logo.png"
                alt="AQI"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
                priority
              />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-950 dark:text-white">
                AirNest
              </span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">
                Urban Air Quality Assistant for Families
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              title="Daily family clean-air habit streak"
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                activeToday
                  ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <Flame
                aria-hidden="true"
                className={
                  activeToday
                    ? 'h-3.5 w-3.5 text-amber-500'
                    : 'h-3.5 w-3.5 text-slate-400'
                }
              />
              <span>{streakDays}d</span>
            </span>

            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 md:inline-flex">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Safety-first guidance</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:border-amber-900 dark:bg-amber-950/70 dark:text-amber-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />
            You are offline. Simulated demo scenarios, your household profile, and checklist
            tracking remain available.
          </span>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Turn today&apos;s air quality into calm, practical family habits.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Know whether kids should play outside, when to keep windows closed, and which
            affordable indoor air hacks and low-emission routines fit your day.
          </p>
        </div>

        <WelcomeQuickStart />

        <LocationSwitcher
          activeDemoId={snapshot.demoScenarioId}
          activeLocationDisplay={activeLocationDisplay}
          errorMessage={locationError}
          isLoading={isLoadingAqi}
          isOffline={isOffline}
          onSearchCity={handleSearchCity}
          onSelectDemo={handleSelectDemo}
          onSelectLocation={handleSelectLocation}
          onUseGeolocation={handleUseGeolocation}
        />

        <AqiOverviewCard
          dailyHeadline={activePlan.dailyHeadline}
          isLoading={isLoadingAqi}
          safety={activePlan.safety}
          snapshot={snapshot}
        />

        {/* Core Two-Column Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-8">
            <DailyActionChecklist
              actions={activePlan.actions}
              completedIds={completedIds}
              onResetProgress={handleResetProgress}
              onToggleComplete={handleToggleComplete}
            />

            <IndoorAlternativesSection alternatives={activePlan.indoorAlternatives} />

            <AirQualityAssistant
              isOffline={isOffline}
              onQuestionAnswered={handleQuestionAnswered}
              profile={profile}
              snapshot={snapshot}
            />
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <AirStreakCard state={gamification} />

            <FamilyProfilePanel
              aiNote={aiNote}
              isAiLoading={isLoadingAiPlan}
              isOffline={isOffline}
              onChange={handleProfileChange}
              onRequestAiPlan={handleRequestAiPlan}
              planMode={activePlan.mode}
              profile={profile}
            />

            <PollutionEducation onTopicOpen={handleTopicOpen} />
          </aside>
        </div>

        {/* Persistent Trust & Safety Footer */}
        <footer className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <strong className="font-semibold text-slate-800 dark:text-slate-200">
            Trust &amp; Safety Note:
          </strong>{' '}
          {SAFETY_DISCLAIMER}
        </footer>
      </main>

      <StatusToast notice={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}