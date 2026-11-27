// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_GAMIFICATION_STATE } from '@/domain/air-quality/gamification';
import { DEFAULT_FAMILY_PROFILE } from '@/domain/air-quality/schemas';
import {
  getTodayKey,
  loadCompletedIds,
  loadFamilyProfile,
  loadGamificationState,
  saveCompletedIds,
  saveFamilyProfile,
  saveGamificationState,
} from '@/lib/storage';

describe('storage utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('normalizes location keys for today checklist storage', () => {
    const key = getTodayKey('San Francisco, CA / Bay Area!');
    expect(key).toMatch(/^airnest_checklist_v1_\d{4}-\d{2}-\d{2}_san-francisco-ca-bay-area-$/);
  });

  it('saves and loads a valid family profile, falling back on missing or invalid data', () => {
    expect(loadFamilyProfile()).toEqual(DEFAULT_FAMILY_PROFILE);

    const updated = { ...DEFAULT_FAMILY_PROFILE, hasChildren: true };
    saveFamilyProfile(updated);
    expect(loadFamilyProfile()).toEqual(updated);

    window.localStorage.setItem('airnest_family_profile_v1', '{not-json');
    expect(loadFamilyProfile()).toEqual(DEFAULT_FAMILY_PROFILE);

    window.localStorage.setItem('airnest_family_profile_v1', JSON.stringify({ invalid: 123 }));
    expect(loadFamilyProfile()).toEqual(DEFAULT_FAMILY_PROFILE);
  });

  it('saves and loads completed checklist IDs and filters non-string entries', () => {
    const key = getTodayKey('delhi');
    expect(loadCompletedIds(key)).toEqual([]);

    saveCompletedIds(key, ['act-1', 'act-2']);
    expect(loadCompletedIds(key)).toEqual(['act-1', 'act-2']);

    window.localStorage.setItem(key, JSON.stringify(['act-1', 42, null, 'act-3']));
    expect(loadCompletedIds(key)).toEqual(['act-1', 'act-3']);

    window.localStorage.setItem(key, JSON.stringify({ notAnArray: true }));
    expect(loadCompletedIds(key)).toEqual([]);

    window.localStorage.setItem(key, '{bad-json');
    expect(loadCompletedIds(key)).toEqual([]);
  });

  it('saves and loads gamification state with safe defaults', () => {
    expect(loadGamificationState()).toEqual(INITIAL_GAMIFICATION_STATE);

    const nextState = {
      ...INITIAL_GAMIFICATION_STATE,
      xp: 120,
      topicsReadIds: ['pm25', 'ozone'],
    };
    saveGamificationState(nextState);
    expect(loadGamificationState()).toEqual(nextState);

    window.localStorage.setItem(
      'airnest_gamification_v1',
      JSON.stringify({ xp: 50, topicsReadIds: ['pm25', 99] })
    );
    expect(loadGamificationState()).toEqual({
      ...INITIAL_GAMIFICATION_STATE,
      xp: 50,
      topicsReadIds: ['pm25'],
    });

    window.localStorage.setItem('airnest_gamification_v1', '{bad-json');
    expect(loadGamificationState()).toEqual(INITIAL_GAMIFICATION_STATE);
  });

  it('ignores localStorage write errors gracefully', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveFamilyProfile(DEFAULT_FAMILY_PROFILE)).not.toThrow();
    expect(() => saveCompletedIds('k', ['a'])).not.toThrow();
    expect(() => saveGamificationState(INITIAL_GAMIFICATION_STATE)).not.toThrow();
  });
});