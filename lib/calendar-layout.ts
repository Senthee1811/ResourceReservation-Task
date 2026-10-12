import {
  COLOMBO_OFFSET_MS,
  formatTime,
  startOfDayColombo,
} from "./datetime";

export const CALENDAR_START_HOUR = 7; // 07:00
export const CALENDAR_END_HOUR = 21; // 21:00
export const TOTAL_MINUTES = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60; // 14 hours = 840 mins

export type RawBooking = {
  id: string;
  title: string;
  notes?: string | null;
  startAt: Date;
  endAt: Date;
  userName?: string | null;
  userId?: string;
  status: "CONFIRMED" | "CANCELLED";
};

export type CalendarBlock = {
  id: string;
  title: string;
  notes?: string | null;
  userName?: string | null;
  startAt: Date;
  endAt: Date;
  timeLabel: string;
  topPercent: number;
  heightPercent: number;
  isClippedStart: boolean;
  isClippedEnd: boolean;
};

/**
 * Given a Date (representing any point on a day), returns the Colombo day start (00:00:00)
 * and day end (24:00:00) in UTC.
 */
export function getColomboDayBounds(date: Date): { dayStart: Date; dayEnd: Date } {
  const dayStart = startOfDayColombo(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}

/**
 * Returns minute offset from midnight in Colombo time for a UTC Date.
 */
export function getColomboMinuteOfDay(date: Date): number {
  const colomboTime = new Date(date.getTime() + COLOMBO_OFFSET_MS);
  return colomboTime.getUTCHours() * 60 + colomboTime.getUTCMinutes();
}

/**
 * Computes calendar block layout coordinates for bookings falling within a specific Colombo day.
 * Clips bookings to the timeline window (07:00 - 21:00 Colombo).
 */
export function computeDayLayout(
  dayDate: Date,
  bookings: RawBooking[],
): CalendarBlock[] {
  const { dayStart, dayEnd } = getColomboDayBounds(dayDate);
  const windowStartMinute = CALENDAR_START_HOUR * 60; // 420
  const windowEndMinute = CALENDAR_END_HOUR * 60; // 1260

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const blocks: CalendarBlock[] = [];

  for (const b of confirmed) {
    // Only process bookings that intersect this Colombo day
    if (b.endAt <= dayStart || b.startAt >= dayEnd) {
      continue;
    }

    // Clip to current day bounds
    const effectiveStart = b.startAt < dayStart ? dayStart : b.startAt;
    const effectiveEnd = b.endAt > dayEnd ? dayEnd : b.endAt;

    const startMinuteOfDay =
      effectiveStart.getTime() <= dayStart.getTime()
        ? 0
        : getColomboMinuteOfDay(effectiveStart);

    const endMinuteOfDay =
      effectiveEnd.getTime() >= dayEnd.getTime()
        ? 24 * 60
        : getColomboMinuteOfDay(effectiveEnd);

    // If booking is completely outside the timeline window (07:00-21:00)
    if (endMinuteOfDay <= windowStartMinute || startMinuteOfDay >= windowEndMinute) {
      continue;
    }

    const isClippedStart = b.startAt < effectiveStart || startMinuteOfDay < windowStartMinute;
    const isClippedEnd = b.endAt > effectiveEnd || endMinuteOfDay > windowEndMinute;

    const clampedStartMinute = Math.max(startMinuteOfDay, windowStartMinute);
    const clampedEndMinute = Math.min(endMinuteOfDay, windowEndMinute);

    const durationMinutes = Math.max(clampedEndMinute - clampedStartMinute, 15); // min 15 mins for visual clickability
    const topPercent = ((clampedStartMinute - windowStartMinute) / TOTAL_MINUTES) * 100;
    const heightPercent = (durationMinutes / TOTAL_MINUTES) * 100;

    const timeLabel = `${formatTime(b.startAt)} - ${formatTime(b.endAt)}`;

    blocks.push({
      id: b.id,
      title: b.title,
      notes: b.notes,
      userName: b.userName,
      startAt: b.startAt,
      endAt: b.endAt,
      timeLabel,
      topPercent: Math.max(0, Math.min(topPercent, 100)),
      heightPercent: Math.max(1.5, Math.min(heightPercent, 100 - topPercent)),
      isClippedStart,
      isClippedEnd,
    });
  }

  // Sort by start time
  return blocks.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Calculates current time indicator position in Colombo time.
 * Returns percentage (0-100) if current time is between 07:00 and 21:00 on the specified day,
 * or null if current time is outside the visible timeline or on a different day.
 */
export function getCurrentTimePosition(
  dayDate: Date,
  now: Date = new Date(),
): number | null {
  const { dayStart, dayEnd } = getColomboDayBounds(dayDate);
  if (now < dayStart || now >= dayEnd) {
    return null;
  }

  const minuteOfDay = getColomboMinuteOfDay(now);
  const windowStartMinute = CALENDAR_START_HOUR * 60;
  const windowEndMinute = CALENDAR_END_HOUR * 60;

  if (minuteOfDay < windowStartMinute || minuteOfDay > windowEndMinute) {
    return null;
  }

  return ((minuteOfDay - windowStartMinute) / TOTAL_MINUTES) * 100;
}

/**
 * Generates hour slot labels from CALENDAR_START_HOUR to CALENDAR_END_HOUR.
 */
export function getHourSlots(): { hour: number; label: string; minute: number }[] {
  const slots: { hour: number; label: string; minute: number }[] = [];
  for (let h = CALENDAR_START_HOUR; h <= CALENDAR_END_HOUR; h++) {
    const formatted = `${String(h).padStart(2, "0")}:00`;
    slots.push({
      hour: h,
      label: formatted,
      minute: h * 60,
    });
  }
  return slots;
}
