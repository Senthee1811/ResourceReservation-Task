export const APP_TIMEZONE = "Asia/Colombo";
export const COLOMBO_OFFSET_MINUTES = 330; // +05:30 (no DST)
export const COLOMBO_OFFSET_MS = COLOMBO_OFFSET_MINUTES * 60 * 1000;

/**
 * Parses a local date/time input (e.g. from datetime-local input "2026-10-15T09:30")
 * treating the input as Asia/Colombo local time, and returns the UTC Date.
 */
export function parseLocalInput(input: string): Date {
  const trimmed = input.trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date/time input: "${input}"`);
    }
    return parsed;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 0;
  const minute = match[5] ? parseInt(match[5], 10) : 0;
  const second = match[6] ? parseInt(match[6], 10) : 0;

  const utcMs = Date.UTC(year, month, day, hour, minute, second) - COLOMBO_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Formats a date and time in Asia/Colombo timezone.
 */
export function formatDateTime(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
): string {
  const d = typeof date === "object" ? date : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Formats a date in Asia/Colombo timezone.
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  const d = typeof date === "object" ? date : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Formats time in Asia/Colombo timezone (24h by default).
 */
export function formatTime(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
): string {
  const d = typeof date === "object" ? date : new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Returns date in YYYY-MM-DD format as observed in Colombo.
 */
export function formatDateKey(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Returns a Date representing 00:00:00.000 in Colombo on the day of the given date.
 */
export function startOfDayColombo(date: Date): Date {
  const colomboTime = new Date(date.getTime() + COLOMBO_OFFSET_MS);
  const year = colomboTime.getUTCFullYear();
  const month = colomboTime.getUTCMonth();
  const day = colomboTime.getUTCDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - COLOMBO_OFFSET_MS);
}

/**
 * Adds an integer number of days to a Date.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Formats a Date into an HTML datetime-local input string (YYYY-MM-DDTHH:mm) in Colombo time.
 */
export function toColomboInputString(date: Date): string {
  const colomboTime = new Date(date.getTime() + COLOMBO_OFFSET_MS);
  const y = colomboTime.getUTCFullYear();
  const m = String(colomboTime.getUTCMonth() + 1).padStart(2, "0");
  const d = String(colomboTime.getUTCDate()).padStart(2, "0");
  const hh = String(colomboTime.getUTCHours()).padStart(2, "0");
  const mm = String(colomboTime.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}
