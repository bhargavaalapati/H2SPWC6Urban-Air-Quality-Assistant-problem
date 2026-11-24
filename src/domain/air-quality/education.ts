export interface EducationTopic {
  id: string;
  title: string;
  shortAnswer: string;
  practicalTakeaway: string;
  deeperDetail: string;
}

export const EDUCATION_TOPICS: readonly EducationTopic[] = [
  {
    id: 'aqi-meaning',
    title: 'What does AQI actually mean?',
    shortAnswer:
      'AQI (Air Quality Index) turns complex pollutant measurements into a 0–500 scale showing how clean or polluted the air is right now.',
    practicalTakeaway:
      'Under 100 is generally fine for normal routines; above 150 is your cue to close windows and move energetic play indoors.',
    deeperDetail:
      'We use the US AQI scale (0–50 Good, 51–100 Moderate, 101–150 Unhealthy for Sensitive Groups, 151–200 Unhealthy, 201–300 Very Unhealthy, 301+ Hazardous). The score reflects whichever major pollutant is highest at that hour.',
  },
  {
    id: 'pm25-vs-pm10',
    title: 'PM2.5 vs. PM10: Why size matters',
    shortAnswer:
      'PM10 is coarse dust you can sometimes see or feel in your throat; PM2.5 is 30 times thinner than a human hair and travels deep into the lungs.',
    practicalTakeaway:
      'Even when the sky only looks slightly hazy, high PM2.5 from vehicle exhaust or winter smoke matters most for children and older adults.',
    deeperDetail:
      'PM10 comes mostly from road dust, construction, and pollen. PM2.5 comes from combustion—tailpipes, coal, crop or waste burning, fireworks, and indoor smoke—and stays suspended in air much longer.',
  },
  {
    id: 'winter-inversion',
    title: 'Why winter mornings and nights get so smoky',
    shortAnswer:
      'Cold winter air acts like a lid over cities, trapping car exhaust and heating smoke close to the ground until midday sun warms it up.',
    practicalTakeaway:
      'Early morning walks and late-evening play often carry the highest winter exposure—midday is usually the cleaner window when AQI dips.',
    deeperDetail:
      'Normally, warm air near the ground rises and disperses pollution. During a winter temperature inversion, cooler dense air settles underneath a warmer upper layer, slowing wind dispersion and concentrating pollutants near street level.',
  },
  {
    id: 'indoor-vs-outdoor',
    title: 'Indoor air can be cleaner—or worse—than outside',
    shortAnswer:
      'Closing windows blocks outdoor smog, but indoor cooking fumes, incense, candles, and dry sweeping can quickly trap particles inside.',
    practicalTakeaway:
      'Pair closed windows with zero indoor smoke and damp mopping so your home actually stays a cleaner refuge.',
    deeperDetail:
      'Fine particles infiltrate through small window cracks and also build up from gas stoves, frying oil aerosols, mosquito coils, and tobacco smoke. Managing indoor sources is the fastest free way to improve indoor air quality.',
  },
];