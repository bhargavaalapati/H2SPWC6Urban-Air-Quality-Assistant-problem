'use client';

import { Loader2, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import type { CookingFuelType, FamilyProfile } from '@/domain/air-quality/types';
import {
  PROFILE_SELECT_CLASS,
  ProfileAudienceFields,
} from '@/components/ProfileAudienceFields';

interface FamilyProfilePanelProps {
  profile: FamilyProfile;
  onChange: (next: FamilyProfile) => void;
  onRequestAiPlan: () => Promise<void>;
  isAiLoading: boolean;
  isOffline: boolean;
  aiNote: string | null;
  planMode: 'deterministic' | 'ai_enhanced';
}

export function FamilyProfilePanel({
  profile,
  onChange,
  onRequestAiPlan,
  isAiLoading,
  isOffline,
  aiNote,
  planMode,
}: FamilyProfilePanelProps) {
  const update = <K extends keyof FamilyProfile>(key: K, value: FamilyProfile[K]) => {
    onChange({ ...profile, [key]: value });
  };

  const isCommunity = profile.audienceMode === 'community';

  const contextToggles = [
    {
      label: 'Children present',
      active: profile.hasChildren,
      onClick: () => update('hasChildren', !profile.hasChildren),
    },
    {
      label: 'Older adults (60+)',
      active: profile.hasOlderAdults,
      onClick: () => update('hasOlderAdults', !profile.hasOlderAdults),
    },
    {
      label: 'Extra air sensitivity',
      active: profile.sensitivity === 'elevated',
      onClick: () =>
        update('sensitivity', profile.sensitivity === 'elevated' ? 'standard' : 'elevated'),
    },
    {
      label: 'Have air purifier',
      active: profile.hasAirPurifier,
      onClick: () => update('hasAirPurifier', !profile.hasAirPurifier),
    },
    {
      label: 'Leaf/waste burning nearby',
      active: profile.openWasteBurningNearby,
      onClick: () => update('openWasteBurningNearby', !profile.openWasteBurningNearby),
    },
  ] as const;

  return (
    <section
      aria-label="Household or community personalization"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="h-4 w-4 text-[#1f5c4d] dark:text-emerald-400"
            aria-hidden="true"
          />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Who Is This Plan For?
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Users className="h-3 w-3" aria-hidden="true" />
          {isCommunity
            ? `${profile.communitySize.toLocaleString()} people`
            : `${profile.householdSize} ${profile.householdSize === 1 ? 'person' : 'people'}`}
        </span>
      </div>

      <ProfileAudienceFields profile={profile} onUpdate={update} />

      <div className="mt-4 space-y-4">
        <fieldset>
          <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Health &amp; home context
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {contextToggles.map((toggle) => (
              <button
                key={toggle.label}
                type="button"
                aria-pressed={toggle.active}
                onClick={toggle.onClick}
                className={`min-h-[40px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  toggle.active
                    ? 'border-[#1f5c4d] bg-emerald-50/70 text-[#143d33] dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {toggle.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="cooking-fuel-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Primary cooking setup
          </label>
          <select
            id="cooking-fuel-select"
            value={profile.cookingFuel}
            onChange={(e) => update('cookingFuel', e.target.value as CookingFuelType)}
            className={PROFILE_SELECT_CLASS}
          >
            <option value="lpg_induction">Clean fuel (LPG / PNG / Induction)</option>
            <option value="mixed_or_solid">Mixed / Biomass / Solid fuel</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="outdoor-time-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Usual outdoor play / activity time
          </label>
          <select
            id="outdoor-time-select"
            value={profile.typicalOutdoorTime}
            onChange={(e) =>
              update('typicalOutdoorTime', e.target.value as FamilyProfile['typicalOutdoorTime'])
            }
            className={PROFILE_SELECT_CLASS}
          >
            <option value="morning">Morning (6–10 AM)</option>
            <option value="afternoon">Afternoon (12–4 PM)</option>
            <option value="evening">Evening (5–8 PM)</option>
            <option value="flexible">Flexible schedule</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="commute-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Typical daily travel
          </label>
          <select
            id="commute-select"
            value={profile.primaryCommute}
            onChange={(e) =>
              update('primaryCommute', e.target.value as FamilyProfile['primaryCommute'])
            }
            className={PROFILE_SELECT_CLASS}
          >
            <option value="public_transit">Public transit (Metro / Bus)</option>
            <option value="walk_cycle">Walking or cycling</option>
            <option value="car_two_wheeler">Car or two-wheeler</option>
            <option value="work_from_home">Mostly at home</option>
          </select>
        </div>

        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onRequestAiPlan}
            disabled={isAiLoading || isOffline}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1f5c4d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#17483c] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isAiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{isAiLoading ? 'Tailoring your daily plan...' : 'Tailor Plan with AI'}</span>
          </button>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <strong className="font-semibold text-slate-800 dark:text-slate-200">
              {planMode === 'ai_enhanced' ? 'AI-Personalized:' : 'Safety-First Plan:'}
            </strong>{' '}
            {aiNote ??
              'Built with verified exposure-reduction rules. Click above to tailor wording to your routine.'}
          </p>
        </div>
      </div>
    </section>
  );
}