import { DEFAULT_FAMILY_PROFILE, familyProfileSchema } from '@/domain/air-quality/schemas';
import type { FamilyProfile } from '@/domain/air-quality/types';

const PROFILE_KEY = 'airnest_family_profile_v1';
const CHECKLIST_PREFIX = 'airnest_checklist_v1_';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getTodayKey(locationKey: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const normalized = locationKey.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  return `${CHECKLIST_PREFIX}${yyyy}-${mm}-${dd}_${normalized}`;
}

export function loadFamilyProfile(): FamilyProfile {
  if (!isBrowser()) return DEFAULT_FAMILY_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_FAMILY_PROFILE;
    const parsed = familyProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_FAMILY_PROFILE;
  } catch {
    return DEFAULT_FAMILY_PROFILE;
  }
}

export function saveFamilyProfile(profile: FamilyProfile): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota or private mode errors gracefully
  }
}

export function loadCompletedIds(storageKey: string): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function saveCompletedIds(storageKey: string, ids: string[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Ignore storage quota or private mode errors gracefully
  }
}