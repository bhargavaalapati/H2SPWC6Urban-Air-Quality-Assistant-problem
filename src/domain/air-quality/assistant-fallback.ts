import { evaluateSafety, SAFETY_DISCLAIMER } from '@/domain/air-quality/thresholds';
import type {
  AirQualitySnapshot,
  FamilyProfile,
  SafetyAssessment,
} from '@/domain/air-quality/types';

export type AssistantResponseMode = 'ai' | 'deterministic_fallback';

export interface AssistantReply {
  answer: string;
  practicalSteps: string[];
  dataNote: string;
  disclaimer: string;
  responseMode: AssistantResponseMode;
  fallbackReason?: string;
}

interface ReplyMeta {
  dataNote: string;
  fallbackReason?: string;
}

function makeFallbackReply(
  answer: string,
  practicalSteps: string[],
  meta: ReplyMeta
): AssistantReply {
  return {
    answer,
    practicalSteps,
    dataNote: meta.dataNote,
    disclaimer: SAFETY_DISCLAIMER,
    responseMode: 'deterministic_fallback',
    fallbackReason: meta.fallbackReason,
  };
}

export function buildProvenanceNote(snapshot: AirQualitySnapshot): string {
  if (snapshot.provenance === 'unavailable' || snapshot.aqi === null) {
    return `Live air-quality readings for ${snapshot.location.name} are currently unavailable. This guidance is general exposure-reduction advice, not a live measurement.`;
  }
  if (snapshot.provenance === 'demo') {
    return `Based on a clearly labeled Demo Scenario for ${snapshot.location.name} (Simulated AQI ${snapshot.aqi}, PM2.5 ${snapshot.pollutants.pm25 ?? 'N/A'} µg/m³)—not live sensor data.`;
  }
  if (snapshot.provenance === 'delayed') {
    return `Based on delayed Open-Meteo data for ${snapshot.location.name} (AQI ${snapshot.aqi}, recorded ${snapshot.observedAt ?? 'earlier'}). Check local updates if conditions look hazier.`;
  }
  return `Based on current Open-Meteo data for ${snapshot.location.name} (AQI ${snapshot.aqi}, PM2.5 ${snapshot.pollutants.pm25 ?? 'N/A'} µg/m³).`;
}

function buildVentilationFallback(
  aqi: number,
  safety: SafetyAssessment,
  profile: FamilyProfile,
  meta: ReplyMeta
): AssistantReply {
  if (safety.ventilation === 'keep_closed') {
    return makeFallbackReply(
      `Keep windows closed right now. At AQI ${aqi} (${safety.label}), opening windows pulls fine particles indoors faster than it clears stale room air.`,
      [
        'Keep road-facing windows and balcony doors shut, especially during morning and evening inversion hours.',
        'Run your kitchen exhaust fan only while cooking with lids on, and pause incense or candles.',
        profile.hasAirPurifier
          ? 'Run your air purifier in the main living room or bedroom with doors closed.'
          : 'Seal noticeable door drafts with a rolled towel and damp-wipe dusty sills.',
      ],
      meta
    );
  }

  if (safety.ventilation === 'brief_cross_ventilation') {
    return makeFallbackReply(
      `Avoid opening windows during early morning or evening traffic peaks. At AQI ${aqi} (${safety.label}), limit ventilation to a brief midday cross-breeze when air is cleaner.`,
      [
        safety.saferWindowNote ??
          'Open opposite windows briefly for 10–15 minutes around midday, then close them before dusk.',
        'Keep windows facing busy roads shut during rush hours.',
        'Reduce indoor smoke from cooking or incense so you need less outdoor air exchange.',
      ],
      meta
    );
  }

  return makeFallbackReply(
    `Yes—it is a good time to ventilate. At AQI ${aqi} (${safety.label}), outdoor air is clean enough to flush out indoor buildup.`,
    [
      'Open windows on opposite sides of your home for 20–30 minutes to create cross-ventilation.',
      'Ventilate right after cooking or morning showers to clear indoor humidity and particles.',
    ],
    meta
  );
}

function buildOutdoorKidsFallback(
  aqi: number,
  safety: SafetyAssessment,
  meta: ReplyMeta
): AssistantReply {
  if (safety.outdoorKids === 'move_indoors') {
    return makeFallbackReply(
      `Skip outdoor park play right now. At AQI ${aqi} (${safety.label}), active running increases how much polluted air children breathe in.`,
      [
        'Shift park time indoors—try a 20-minute living-room balance/stretch circuit, story-and-sketch hour, or tabletop games.',
        'Keep windows closed and wipe indoor floors with a damp mop rather than a dry broom.',
        safety.recommendOfficialAdvisory
          ? 'Follow local school and municipal air-quality advisories today.'
          : 'If you must step outside briefly, keep trips short and away from idling traffic.',
      ],
      meta
    );
  }

  if (safety.outdoorKids === 'prefer_light_or_shorter') {
    return makeFallbackReply(
      `Light, shorter outdoor play is reasonable, but skip intense running beside busy roads. At AQI ${aqi} (${safety.label}), sensitive family members benefit from shorter sessions.`,
      [
        'Limit active outdoor play to 20–30 minutes in a park or courtyard away from traffic.',
        'Take indoor water breaks and watch for throat or eye irritation.',
        'Have a low-key indoor backup activity ready if haze thickens toward evening.',
      ],
      meta
    );
  }

  return makeFallbackReply(
    `Yes, outdoor play is suitable today. At AQI ${aqi} (${safety.label}), air conditions are comfortable for children and family walks.`,
    [
      'Enjoy parks, walking, or cycling away from heavy road intersections.',
      'Take advantage of clean air to air out living areas while you are home.',
    ],
    meta
  );
}

function buildBedroomFallback(
  aqi: number,
  safety: SafetyAssessment,
  profile: FamilyProfile,
  meta: ReplyMeta
): AssistantReply {
  return makeFallbackReply(
    `You can make your bedroom noticeably cleaner tonight using zero-cost habits—even without buying an air purifier. At AQI ${aqi} (${safety.label}), reducing infiltration and indoor dust makes the biggest impact overnight.`,
    [
      safety.ventilation === 'keep_closed'
        ? 'Keep bedroom windows and doors closed from late afternoon onward.'
        : 'Briefly air out the bedroom during cleaner midday hours, then close windows before evening haze settles.',
      'Skip incense, mosquito coils, candles, and aerosol room sprays inside the bedroom.',
      'Damp-wipe nightstands and floors (no dry dusting), and leave outdoor clothes and shoes outside the bedroom.',
      profile.hasAirPurifier
        ? 'Run your purifier on medium for 60 minutes before bedtime with the bedroom door shut.'
        : 'Wash pillowcases regularly and place a folded towel along wide gaps under exterior doors on hazy nights.',
    ],
    meta
  );
}

/**
 * Deterministic, honest fallback for the conversational assistant when Gemini
 * is not configured, times out, or returns an unsafe/unparseable response.
 */
export function buildDeterministicAssistantReply(
  question: string,
  snapshot: AirQualitySnapshot,
  profile: FamilyProfile,
  fallbackReason?: string
): AssistantReply {
  const q = question.toLowerCase();
  const meta: ReplyMeta = { dataNote: buildProvenanceNote(snapshot), fallbackReason };

  if (snapshot.aqi === null || snapshot.provenance === 'unavailable') {
    return makeFallbackReply(
      `I don't have current AQI readings for ${snapshot.location.name} right now, so I can't confirm whether outdoor air is safe. Until you verify a local official bulletin, treat hazy or smoky air cautiously and focus on keeping indoor air clean.`,
      [
        'Check your local city pollution board or look for visible haze/smoke before sending children out to play.',
        'Avoid indoor smoke sources such as incense, candles, and smoky frying, and switch on the kitchen exhaust fan.',
        'Damp-mop floors instead of dry sweeping so settled dust does not circulate indoors.',
      ],
      meta
    );
  }

  const safety = evaluateSafety(snapshot.aqi, profile, snapshot.hourlyForecast);

  if (/\b(?:window|ventilat|fresh air)/i.test(q)) {
    return buildVentilationFallback(snapshot.aqi, safety, profile, meta);
  }

  if (/\b(?:kid|child|play|park|outside|outdoor)/i.test(q)) {
    return buildOutdoorKidsFallback(snapshot.aqi, safety, meta);
  }

  if (/\b(?:bedroom|sleep|tonight|cheap|expensive)/i.test(q)) {
    return buildBedroomFallback(snapshot.aqi, safety, profile, meta);
  }

  return makeFallbackReply(
    `For ${snapshot.location.name} at AQI ${snapshot.aqi} (${safety.label}): ${safety.summary}`,
    [
      safety.ventilation === 'keep_closed'
        ? 'Keep windows closed today and focus on eliminating indoor smoke (incense, candles, smoky frying).'
        : 'Use natural ventilation only during cleaner daytime hours and keep indoor cooking well-exhausted.',
      safety.outdoorGeneral === 'move_indoors'
        ? 'Replace outdoor exercise and park trips with low-intensity indoor activities.'
        : 'Prefer parks or quiet side streets over high-traffic roads for outdoor routines.',
      safety.lowEmissionMobility === 'walk_or_cycle_safe'
        ? 'Walk or cycle for short neighborhood errands today.'
        : 'Consolidate vehicle trips and switch off engines instead of idling.',
    ],
    meta
  );
}