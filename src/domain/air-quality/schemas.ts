import { z } from 'zod';

export const familyProfileSchema = z.object({
  audienceMode: z.enum(['household', 'community']).default('household'),
  householdSize: z.number().int().min(1).max(20),
  communityType: z.enum(['rwa', 'school', 'neighbourhood']).default('rwa'),
  communitySize: z.number().int().min(5).max(50000).default(150),
  hasChildren: z.boolean(),
  hasOlderAdults: z.boolean(),
  sensitivity: z.enum(['standard', 'elevated']),
  hasAirPurifier: z.boolean(),
  cookingFuel: z.enum(['lpg_induction', 'mixed_or_solid']).default('lpg_induction'),
  openWasteBurningNearby: z.boolean().default(false),
  typicalOutdoorTime: z.enum(['morning', 'afternoon', 'evening', 'flexible']),
  primaryCommute: z.enum([
    'walk_cycle',
    'public_transit',
    'car_two_wheeler',
    'work_from_home',
  ]),
});

export const locationQuerySchema = z.object({
  city: z
    .string()
    .trim()
    .min(2, 'Please enter at least 2 characters for a city name.')
    .max(100, 'City name is too long.'),
});

export const assistantRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, 'Please enter a question.')
    .max(600, 'Please keep your question under 600 characters.'),
  profile: familyProfileSchema,
  snapshot: z.object({
    location: z.object({
      name: z.string(),
      region: z.string().optional(),
      country: z.string().optional(),
      latitude: z.number(),
      longitude: z.number(),
    }),
    aqi: z.number().min(0).max(500).nullable(),
    category: z
      .enum([
        'good',
        'moderate',
        'unhealthy_sensitive',
        'unhealthy',
        'very_unhealthy',
        'hazardous',
      ])
      .nullable(),
    pollutants: z.object({
      pm25: z.number().min(0).nullable(),
      pm10: z.number().min(0).nullable(),
      no2: z.number().min(0).nullable().optional(),
      o3: z.number().min(0).nullable().optional(),
    }),
    observedAt: z.string().nullable(),
    provenance: z.enum(['live', 'delayed', 'demo', 'unavailable']),
    sourceLabel: z.string(),
    hourlyForecast: z
      .array(
        z.object({
          isoTime: z.string(),
          aqi: z.number().min(0).max(500),
        })
      )
      .max(48)
      .optional(),
  }),
});

export const aiActionItemSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(4).max(120),
  whyItMatters: z.string().min(8).max(240),
  howToDoIt: z.string().min(8).max(260),
  whenLabel: z.string().min(2).max(60),
  timeSlot: z.enum(['morning', 'midday', 'evening', 'anytime']),
  category: z.enum([
    'outdoor',
    'indoor_hack',
    'low_emission',
    'sustainable_alternative',
    'family_alternative',
  ]),
  isLowCost: z.boolean(),
});

export const aiPlanResponseSchema = z.object({
  dailyHeadline: z.string().min(10).max(200),
  actions: z.array(aiActionItemSchema).min(3).max(8),
});

export const DEFAULT_FAMILY_PROFILE = familyProfileSchema.parse({
  audienceMode: 'household',
  householdSize: 4,
  communityType: 'rwa',
  communitySize: 150,
  hasChildren: true,
  hasOlderAdults: false,
  sensitivity: 'standard',
  hasAirPurifier: false,
  cookingFuel: 'lpg_induction',
  openWasteBurningNearby: false,
  typicalOutdoorTime: 'evening',
  primaryCommute: 'public_transit',
});