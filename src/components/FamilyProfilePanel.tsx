'use client';

import { Building2, Home, Loader2, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import type { CommunityType, CookingFuelType, FamilyProfile } from '@/domain/air-quality/types';

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

      {/* Household vs Community Mode Switch */}
      <div
        role="group"
        aria-label="Plan audience mode"
        className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-950"
      >
        <button
          type="button"
          aria-pressed={!isCommunity}
          onClick={() => update('audienceMode', 'household')}
          className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !isCommunity
              ? 'bg-white text-slate-950 shadow-2xs dark:bg-slate-800 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Family / Home</span>
        </button>
        <button
          type="button"
          aria-pressed={isCommunity}
          onClick={() => update('audienceMode', 'community')}
          className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isCommunity
              ? 'bg-white text-slate-950 shadow-2xs dark:bg-slate-800 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Community / School</span>
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {isCommunity
          ? 'Tailor smog advisories and impact totals for an RWA, school, or neighbourhood group.'
          : 'Adjust a few quick details—your daily actions and impact calculations adapt immediately.'}
      </p>

      <div className="mt-4 space-y-4">
        {isCommunity ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <label
                htmlFor="community-type-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Community type
              </label>
              <select
                id="community-type-select"
                value={profile.communityType}
                onChange={(e) => update('communityType', e.target.value as CommunityType)}
                className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
              >
                <option value="rwa">Apartment / RWA</option>
                <option value="school">School / Campus</option>
                <option value="neighbourhood">Neighbourhood Group</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="community-size-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Approximate group size (5–50,000)
              </label>
              <input
                id="community-size-input"
                type="number"
                min={5}
                max={50000}
                step={5}
                value={profile.communitySize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) {
                    update('communitySize', Math.min(50000, Math.max(5, Math.round(val))));
                  }
                }}
                className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
              />
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="household-size-input"
              className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <span>Household size</span>
              <span className="font-normal text-slate-500 dark:text-slate-400">
                {profile.householdSize} members
              </span>
            </label>
            <input
              id="household-size-input"
              type="range"
              min={1}
              max={10}
              value={profile.householdSize}
              onChange={(e) => update('householdSize', Number(e.target.value))}
              className="mt-1.5 h-2 w-full cursor-pointer accent-[#1f5c4d] dark:accent-emerald-400"
            />
          </div>
        )}

        <fieldset>
          <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Health &amp; home context
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
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
                    update(
                      'sensitivity',
                      profile.sensitivity === 'elevated' ? 'standard' : 'elevated'
                    ),
                },
                {
                  label: 'Have air purifier',
                  active: profile.hasAirPurifier,
                  onClick: () => update('hasAirPurifier', !profile.hasAirPurifier),
                },
                {
                  label: 'Leaf/waste burning nearby',
                  active: profile.openWasteBurningNearby,
                  onClick: () =>
                    update('openWasteBurningNearby', !profile.openWasteBurningNearby),
                },
              ] as const
            ).map((toggle) => (
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
            className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
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
              update(
                'typicalOutdoorTime',
                e.target.value as FamilyProfile['typicalOutdoorTime']
              )
            }
            className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
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
            className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
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
            <span>
              {isAiLoading ? 'Tailoring your daily plan...' : 'Tailor Plan with AI'}
            </span>
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