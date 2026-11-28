'use client';

import { Building2, Home } from 'lucide-react';
import type { CommunityType, FamilyProfile } from '@/domain/air-quality/types';

export const PROFILE_SELECT_CLASS =
  'mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 transition-colors focus:border-[#1f5c4d] focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-900 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100';

interface ProfileAudienceFieldsProps {
  profile: FamilyProfile;
  onUpdate: <K extends keyof FamilyProfile>(key: K, value: FamilyProfile[K]) => void;
}

export function ProfileAudienceFields({ profile, onUpdate }: ProfileAudienceFieldsProps) {
  const isCommunity = profile.audienceMode === 'community';

  return (
    <>
      <div
        role="group"
        aria-label="Plan audience mode"
        className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-950"
      >
        <button
          type="button"
          aria-pressed={!isCommunity}
          onClick={() => onUpdate('audienceMode', 'household')}
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
          onClick={() => onUpdate('audienceMode', 'community')}
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

      <div className="mt-4">
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
                onChange={(e) => onUpdate('communityType', e.target.value as CommunityType)}
                className={PROFILE_SELECT_CLASS}
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
                    onUpdate('communitySize', Math.min(50000, Math.max(5, Math.round(val))));
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
              onChange={(e) => onUpdate('householdSize', Number(e.target.value))}
              className="mt-1.5 h-2 w-full cursor-pointer accent-[#1f5c4d] dark:accent-emerald-400"
            />
          </div>
        )}
      </div>
    </>
  );
}