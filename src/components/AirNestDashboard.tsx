'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Wind } from 'lucide-react';
import { DEMO_SCENARIOS, getDemoScenarioById } from '@/domain/air-quality/demo-scenarios';
import { buildDeterministicPlan, type DailyPlan } from '@/domain/air-quality/recommendations';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import { SAFETY_DISCLAIMER } from '@/domain/air-quality/thresholds';
import type { AirQualitySnapshot, FamilyProfile } from '@/domain/air-quality/types';
import {
  getTodayKey,
  loadCompletedIds,
  loadFamilyProfile,
  saveCompletedIds,
  saveFamilyProfile,
} from '@/lib/storage';
import { AqiOverviewCard } from '@/components/AqiOverviewCard';
import { DailyActionChecklist } from '@/components/DailyActionChecklist';
import { FamilyProfilePanel } from '@/components/FamilyProfilePanel';
import { IndoorAlternativesSection } from '@/components/IndoorAlternativesSection';
import { LocationSwitcher } from '@/components/LocationSwitcher';

const INITIAL_DEMO = DEMO_SCENARIOS[0]!;

export function AirNestDashboard() {
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot>(INITIAL_DEMO.snapshot);
  const [profile, setProfile] = useState<FamilyProfile>(DEFAULT_FAMILY_PROFILE);
  const [aiPlanOverride, setAiPlanOverride] = useState<DailyPlan | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [isLoadingAqi, setIsLoadingAqi] = useState(false);
  const [isLoadingAiPlan, setIsLoadingAiPlan] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Hydrate saved household profile on client mount
  useEffect(() => {
    setProfile(loadFamilyProfile());
  }, []);

  const deterministicPlan = useMemo(
    () => buildDeterministicPlan(snapshot, profile),
    [snapshot, profile]
  );

  const activePlan = aiPlanOverride ?? deterministicPlan;

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

  const handleSelectDemo = useCallback((scenarioId: string) => {
    const scenario = getDemoScenarioById(scenarioId);
    if (!scenario) return;
    setLocationError(null);
    setSnapshot(scenario.snapshot);
    setAiPlanOverride(null);
    setAiNote(null);
  }, []);

  const handleSearchCity = useCallback(async (city: string) => {
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
    } catch {
      setLocationError(
        'Network error while reaching the air-quality service. You can still explore any Demo Scenario below.'
      );
    } finally {
      setIsLoadingAqi(false);
    }
  }, []);

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
        `/api/air-quality?lat=${encodeURIComponent(String(coords.latitude))}&lon=${encodeURIComponent(String(coords.longitude))}&label=${encodeURIComponent('Your Location')}`
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
    } catch {
      setLocationError(
        'Location permission was declined or unavailable. Type your city name above for live readings.'
      );
    } finally {
      setIsLoadingAqi(false);
    }
  }, []);

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
        aiNote?: string;
        error?: string;
      };

      if (!response.ok || !data.plan) {
        setAiNote(
          data.error ??
            'Could not reach AI personalization right now; keeping verified safety rules.'
        );
        return;
      }

      setAiPlanOverride(data.plan);
      setAiNote(data.aiNote ?? null);
    } catch {
      setAiNote(
        'Network issue while tailoring with AI; showing verified deterministic plan.'
      );
    } finally {
      setIsLoadingAiPlan(false);
    }
  }, [snapshot, profile]);

  const handleToggleComplete = useCallback(
    (actionId: string) => {
      setCompletedIds((prev) => {
        const exists = prev.includes(actionId);
        const next = exists
          ? prev.filter((id) => id !== actionId)
          : [...prev, actionId];
        saveCompletedIds(checklistStorageKey, next);
        return next;
      });
    },
    [checklistStorageKey]
  );

  const handleResetProgress = useCallback(() => {
    setCompletedIds([]);
    saveCompletedIds(checklistStorageKey, []);
  }, [checklistStorageKey]);

  return (
    <div className="min-h-screen pb-14">
      {/* Calm Editorial Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f5c4d] text-white">
              <Wind className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-950">
                AirNest
              </span>
              <span className="block text-xs text-slate-600">
                Urban Air Quality Assistant for Families
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-medium text-emerald-900 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Safety-first daily routines</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
        {/* Concise Product Value Proposition */}
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Turn today&apos;s air quality into calm, practical family habits.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            Know whether kids should play outside, when to keep windows closed, and which
            affordable indoor air hacks and low-emission routines fit your day.
          </p>
        </div>

        {/* Location Search + 1-Click Demo Scenarios */}
        <LocationSwitcher
          activeLocationName={snapshot.location.name}
          activeDemoId={snapshot.demoScenarioId}
          isLoading={isLoadingAqi}
          errorMessage={locationError}
          onSearchCity={handleSearchCity}
          onSelectDemo={handleSelectDemo}
          onUseGeolocation={handleUseGeolocation}
        />

        {/* Hero AQI Overview */}
        <AqiOverviewCard
          snapshot={snapshot}
          safety={activePlan.safety}
          dailyHeadline={activePlan.dailyHeadline}
          isLoading={isLoadingAqi}
        />

        {/* Two-Column Core Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-8">
            <DailyActionChecklist
              actions={activePlan.actions}
              completedIds={completedIds}
              onToggleComplete={handleToggleComplete}
              onResetProgress={handleResetProgress}
            />

            <IndoorAlternativesSection alternatives={activePlan.indoorAlternatives} />
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <FamilyProfilePanel
              profile={profile}
              onChange={handleProfileChange}
              onRequestAiPlan={handleRequestAiPlan}
              isAiLoading={isLoadingAiPlan}
              aiNote={aiNote}
              planMode={activePlan.mode}
            />
          </aside>
        </div>

        {/* Persistent Trust & Safety Footer */}
        <footer className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs leading-relaxed text-slate-600">
          <strong className="font-semibold text-slate-800">Trust &amp; Safety Note:</strong>{' '}
          {SAFETY_DISCLAIMER}
        </footer>
      </main>
    </div>
  );
}