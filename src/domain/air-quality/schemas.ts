import { z } from 'zod';

export const familyProfileSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  hasChildren: z.boolean(),
  hasOlderAdults: z.boolean(),
  sensitivity: z.enum(['standard', 'elevated']),
  hasAirPurifier: z.boolean(),
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
  }),
});

export const aiActionItemSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(4).max(120),
  whyItMatters: z.string().min(8).max(220),
  howToDoIt: z.string().min(8).max(240),
  whenLabel: z.string().min(2).max(60),
  timeSlot: z.enum(['morning', 'midday', 'evening', 'anytime']),
  category: z.enum(['outdoor', 'indoor_hack', 'low_emission', 'family_alternative']),
  isLowCost: z.boolean(),
});

export const aiPlanResponseSchema = z.object({
  dailyHeadline: z.string().min(10).max(180),
  actions: z.array(aiActionItemSchema).min(3).max(8),
});

export const DEFAULT_FAMILY_PROFILE = familyProfileSchema.parse({
  householdSize: 4,
  hasChildren: true,
  hasOlderAdults: false,
  sensitivity: 'standard',
  hasAirPurifier: false,
  typicalOutdoorTime: 'evening',
  primaryCommute: 'public_transit',
});