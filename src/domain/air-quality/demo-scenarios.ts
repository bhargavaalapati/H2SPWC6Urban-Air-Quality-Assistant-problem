import type { DemoScenario } from './types';

/**
 * Clearly labeled simulated winter air-quality scenarios so judges and users
 * can test the full workflow immediately without configuring API keys or sharing GPS.
 */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'delhi-winter-smog',
    name: 'New Delhi — Severe Winter Smog',
    subtitle: 'Simulated high-pollution winter morning (AQI 268)',
    snapshot: {
      location: {
        name: 'New Delhi',
        region: 'Delhi',
        country: 'India',
        latitude: 28.6139,
        longitude: 77.209,
      },
      aqi: 268,
      category: 'very_unhealthy',
      pollutants: {
        pm25: 218,
        pm10: 312,
        no2: 64,
        o3: 28,
      },
      observedAt: '2026-11-23T07:30:00+05:30',
      provenance: 'demo',
      sourceLabel: 'Demo Scenario (Simulated Winter Inversion)',
      demoScenarioId: 'delhi-winter-smog',
      hourlyForecast: [
        { isoTime: '2026-11-23T08:00:00+05:30', aqi: 274 },
        { isoTime: '2026-11-23T11:00:00+05:30', aqi: 230 },
        { isoTime: '2026-11-23T14:00:00+05:30', aqi: 185 },
        { isoTime: '2026-11-23T17:00:00+05:30', aqi: 220 },
        { isoTime: '2026-11-23T20:00:00+05:30', aqi: 290 },
      ],
    },
  },
  {
    id: 'hyderabad-hazy-evening',
    name: 'Hyderabad — Hazy Winter Evening',
    subtitle: 'Simulated sensitive-group threshold (AQI 134)',
    snapshot: {
      location: {
        name: 'Hyderabad',
        region: 'Telangana',
        country: 'India',
        latitude: 17.385,
        longitude: 78.4867,
      },
      aqi: 134,
      category: 'unhealthy_sensitive',
      pollutants: {
        pm25: 48.5,
        pm10: 96,
        no2: 34,
        o3: 42,
      },
      observedAt: '2026-11-23T18:00:00+05:30',
      provenance: 'demo',
      sourceLabel: 'Demo Scenario (Simulated Evening Traffic Peak)',
      demoScenarioId: 'hyderabad-hazy-evening',
      hourlyForecast: [
        { isoTime: '2026-11-23T08:00:00+05:30', aqi: 122 },
        { isoTime: '2026-11-23T11:00:00+05:30', aqi: 92 },
        { isoTime: '2026-11-23T14:00:00+05:30', aqi: 84 },
        { isoTime: '2026-11-23T17:00:00+05:30', aqi: 118 },
        { isoTime: '2026-11-23T20:00:00+05:30', aqi: 146 },
      ],
    },
  },
  {
    id: 'bengaluru-crisp-morning',
    name: 'Bengaluru — Crisp Morning Breeze',
    subtitle: 'Simulated clean-air baseline (AQI 42)',
    snapshot: {
      location: {
        name: 'Bengaluru',
        region: 'Karnataka',
        country: 'India',
        latitude: 12.9716,
        longitude: 77.5946,
      },
      aqi: 42,
      category: 'good',
      pollutants: {
        pm25: 10.2,
        pm10: 24.5,
        no2: 14,
        o3: 36,
      },
      observedAt: '2026-11-23T09:00:00+05:30',
      provenance: 'demo',
      sourceLabel: 'Demo Scenario (Simulated Clean Morning)',
      demoScenarioId: 'bengaluru-crisp-morning',
      hourlyForecast: [
        { isoTime: '2026-11-23T08:00:00+05:30', aqi: 46 },
        { isoTime: '2026-11-23T11:00:00+05:30', aqi: 38 },
        { isoTime: '2026-11-23T14:00:00+05:30', aqi: 40 },
        { isoTime: '2026-11-23T17:00:00+05:30', aqi: 52 },
      ],
    },
  },
];

export function getDemoScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}