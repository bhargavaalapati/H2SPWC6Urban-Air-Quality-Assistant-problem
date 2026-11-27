'use client';

import { useCallback, useState } from 'react';
import { DEMO_SCENARIOS, getDemoScenarioById } from '@/domain/air-quality/demo-scenarios';
import type { DailyPlan } from '@/domain/air-quality/recommendations';
import type { AirQualitySnapshot, FamilyProfile, LocationInfo } from '@/domain/air-quality/types';
import type { ToastNotice } from '@/components/StatusToast';

const INITIAL_DEMO = DEMO_SCENARIOS[0]!;

interface UseAirQualityDataOptions {
  profile: FamilyProfile;
  showToast: (tone: ToastNotice['tone'], message: string) => void;
}

export function useAirQualityData({ profile, showToast }: UseAirQualityDataOptions) {
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot>(INITIAL_DEMO.snapshot);
  const [aiPlanOverride, setAiPlanOverride] = useState<DailyPlan | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [isLoadingAqi, setIsLoadingAqi] = useState(false);
  const [isLoadingAiPlan, setIsLoadingAiPlan] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const clearAiOverride = useCallback(() => {
    setAiPlanOverride(null);
    setAiNote(null);
  }, []);

  const selectDemo = useCallback(
    (scenarioId: string) => {
      const scenario = getDemoScenarioById(scenarioId);
      if (!scenario) return;
      setLocationError(null);
      setSnapshot(scenario.snapshot);
      clearAiOverride();
      showToast('info', `Loaded demo scenario: ${scenario.name}.`);
    },
    [clearAiOverride, showToast]
  );

  const searchCity = useCallback(
    async (city: string) => {
      setIsLoadingAqi(true);
      setLocationError(null);
      try {
        const response = await fetch(`/api/air-quality?city=${encodeURIComponent(city)}`);
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
        clearAiOverride();
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
    [clearAiOverride, showToast]
  );

  const selectLocation = useCallback(
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
        clearAiOverride();
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
    [clearAiOverride, showToast]
  );

  const useGeolocation = useCallback(async () => {
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
        setLocationError(data.error ?? 'Could not load air quality for your coordinates.');
        return;
      }

      setSnapshot(data.snapshot);
      clearAiOverride();
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
  }, [clearAiOverride, showToast]);

  const requestAiPlan = useCallback(async () => {
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

  return {
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
  };
}