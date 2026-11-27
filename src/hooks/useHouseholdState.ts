'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  INITIAL_GAMIFICATION_STATE,
  recordActionCompleted,
  recordAssistantQuestion,
  recordTopicRead,
  type GamificationState,
} from '@/domain/air-quality/gamification';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import type { DailyActionItem, FamilyProfile } from '@/domain/air-quality/types';
import {
  loadCompletedIds,
  loadFamilyProfile,
  loadGamificationState,
  saveCompletedIds,
  saveFamilyProfile,
  saveGamificationState,
} from '@/lib/storage';
import type { ToastNotice } from '@/components/StatusToast';

export function useHouseholdState() {
  const [profile, setProfile] = useState<FamilyProfile>(DEFAULT_FAMILY_PROFILE);
  const [gamification, setGamification] = useState<GamificationState>(
    INITIAL_GAMIFICATION_STATE
  );
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = useCallback((tone: ToastNotice['tone'], message: string) => {
    setToast({ id: Date.now(), tone, message });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const updateProfile = useCallback((nextProfile: FamilyProfile) => {
    setProfile(nextProfile);
    saveFamilyProfile(nextProfile);
  }, []);

  const hydrateChecklist = useCallback((storageKey: string) => {
    setCompletedIds(loadCompletedIds(storageKey));
  }, []);

  const toggleActionComplete = useCallback(
    (actionId: string, storageKey: string, actions: DailyActionItem[]) => {
      setCompletedIds((prev) => {
        const exists = prev.includes(actionId);
        const next = exists ? prev.filter((id) => id !== actionId) : [...prev, actionId];
        saveCompletedIds(storageKey, next);

        if (!exists) {
          const action = actions.find((a) => a.id === actionId);
          const completedAllToday =
            actions.length > 0 && actions.every((a) => next.includes(a.id));

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
    [showToast]
  );

  const resetChecklist = useCallback(
    (storageKey: string) => {
      setCompletedIds([]);
      saveCompletedIds(storageKey, []);
      showToast('info', 'Daily checklist progress reset.');
    },
    [showToast]
  );

  const awardQuestionXp = useCallback(() => {
    setGamification((current) => {
      const { nextState, xpEarned } = recordAssistantQuestion(current);
      saveGamificationState(nextState);
      showToast('success', `Grounded answer ready! +${xpEarned} Clean-Air XP.`);
      return nextState;
    });
  }, [showToast]);

  const awardTopicXp = useCallback(
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

  return {
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
  };
}