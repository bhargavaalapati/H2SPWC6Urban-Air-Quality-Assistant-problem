function formatGoogleCalendarUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export interface CalendarReminderInput {
  title: string;
  details: string;
  locationName: string;
  targetIsoTime?: string;
  fallbackHourLocal?: number;
  durationMinutes?: number;
}

/**
 * Generates a plain Google Calendar template link for a time-specific air-quality action.
 * Loads zero third-party scripts or Google SDKs.
 */
export function buildGoogleCalendarUrl(input: CalendarReminderInput): string {
  let start: Date;

  if (input.targetIsoTime) {
    const parsed = new Date(input.targetIsoTime);
    start = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(input.fallbackHourLocal ?? 13, 0, 0, 0);
  }

  const durationMs = (input.durationMinutes ?? 30) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `AirNest: ${input.title}`,
    details: `${input.details}\n\nScheduled via AirNest Urban Air Quality Assistant.`,
    location: input.locationName,
    dates: `${formatGoogleCalendarUtc(start)}/${formatGoogleCalendarUtc(end)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}