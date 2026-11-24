'use client';

import { Loader2, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import type { FamilyProfile } from '@/domain/air-quality/types';

interface FamilyProfilePanelProps {
  profile: FamilyProfile;
  onChange: (next: FamilyProfile) => void;
  onRequestAiPlan: () => Promise<void>;
  isAiLoading: boolean;
  aiNote: string | null;
  planMode: 'deterministic' | 'ai_enhanced';
}

export function FamilyProfilePanel({
  profile,
  onChange,
  onRequestAiPlan,
  isAiLoading,
  aiNote,
  planMode,
}: FamilyProfilePanelProps) {
  const update = <K extends keyof FamilyProfile>(key: K, value: FamilyProfile[K]) => {
    onChange({ ...profile, [key]: value });
  };

  return (
    <section
      aria-label="Household personalization"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#1f5c4d]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">Your Household</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          <Users className="h-3 w-3" aria-hidden="true" />
          {profile.householdSize} {profile.householdSize === 1 ? 'person' : 'people'}
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
        Adjust a few quick details—your daily actions adapt immediately without needing an account.
      </p>

      <div className="mt-4 space-y-4">
        {/* Household Size */}
        <div>
          <label
            htmlFor="household-size-input"
            className="flex items-center justify-between text-xs font-semibold text-slate-700"
          >
            <span>Household size</span>
            <span className="font-normal text-slate-500">{profile.householdSize} members</span>
          </label>
          <input
            id="household-size-input"
            type="range"
            min={1}
            max={10}
            value={profile.householdSize}
            onChange={(e) => update('householdSize', Number(e.target.value))}
            className="mt-1.5 h-2 w-full cursor-pointer accent-[#1f5c4d]"
          />
        </div>

        {/* Toggle Pills */}
        <fieldset>
          <legend className="text-xs font-semibold text-slate-700">Household context</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={profile.hasChildren}
              onClick={() => update('hasChildren', !profile.hasChildren)}
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                profile.hasChildren
                  ? 'border-[#1f5c4d] bg-emerald-50/70 text-[#143d33]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Children at home
            </button>

            <button
              type="button"
              aria-pressed={profile.hasOlderAdults}
              onClick={() => update('hasOlderAdults', !profile.hasOlderAdults)}
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                profile.hasOlderAdults
                  ? 'border-[#1f5c4d] bg-emerald-50/70 text-[#143d33]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Older adults (60+)
            </button>

            <button
              type="button"
              aria-pressed={profile.sensitivity === 'elevated'}
              onClick={() =>
                update('sensitivity', profile.sensitivity === 'elevated' ? 'standard' : 'elevated')
              }
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                profile.sensitivity === 'elevated'
                  ? 'border-[#1f5c4d] bg-emerald-50/70 text-[#143d33]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Extra air sensitivity
            </button>

            <button
              type="button"
              aria-pressed={profile.hasAirPurifier}
              onClick={() => update('hasAirPurifier', !profile.hasAirPurifier)}
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                profile.hasAirPurifier
                  ? 'border-[#1f5c4d] bg-emerald-50/70 text-[#143d33]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Have air purifier
            </button>
          </div>
        </fieldset>

        {/* Typical Outdoor Time */}
        <div>
          <label htmlFor="outdoor-time-select" className="block text-xs font-semibold text-slate-700">
            Usual outdoor play / walk time
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
            className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:border-[#1f5c4d] focus:bg-white"
          >
            <option value="morning">Morning (6–10 AM)</option>
            <option value="afternoon">Afternoon (12–4 PM)</option>
            <option value="evening">Evening (5–8 PM)</option>
            <option value="flexible">Flexible schedule</option>
          </select>
        </div>

        {/* Primary Commute */}
        <div>
          <label htmlFor="commute-select" className="block text-xs font-semibold text-slate-700">
            Typical daily travel
          </label>
          <select
            id="commute-select"
            value={profile.primaryCommute}
            onChange={(e) =>
              update('primaryCommute', e.target.value as FamilyProfile['primaryCommute'])
            }
            className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:border-[#1f5c4d] focus:bg-white"
          >
            <option value="public_transit">Public transit (Metro / Bus)</option>
            <option value="walk_cycle">Walking or cycling</option>
            <option value="car_two_wheeler">Car or two-wheeler</option>
            <option value="work_from_home">Mostly at home</option>
          </select>
        </div>

        {/* AI Personalization Trigger */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onRequestAiPlan}
            disabled={isAiLoading}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1f5c4d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#17483c] disabled:cursor-not-allowed disabled:opacity-60"
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

          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">
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