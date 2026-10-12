import { describe, expect, it } from "vitest";
import {
  APP_TIMEZONE,
  addDays,
  formatDate,
  formatDateKey,
  formatDateTime,
  formatTime,
  parseLocalInput,
  startOfDayColombo,
  toColomboInputString,
} from "../lib/datetime";

describe("lib/datetime", () => {
  it("uses Asia/Colombo as default timezone", () => {
    expect(APP_TIMEZONE).toBe("Asia/Colombo");
  });

  it("parses daytime Colombo input into UTC", () => {
    // 2026-10-15 09:30 in Colombo is 2026-10-15 04:00 UTC (UTC + 5:30)
    const date = parseLocalInput("2026-10-15T09:30");
    expect(date.toISOString()).toBe("2026-10-15T04:00:00.000Z");
  });

  it("handles a booking at 00:30 Colombo which is the previous day in UTC", () => {
    // 2026-10-15 00:30 Colombo is 2026-10-14 19:00 UTC
    const date = parseLocalInput("2026-10-15T00:30");
    expect(date.toISOString()).toBe("2026-10-14T19:00:00.000Z");

    // Formatting in Colombo shows Oct 15, 00:30
    expect(formatDate(date)).toContain("Oct 15");
    expect(formatTime(date)).toBe("00:30");
    expect(formatDateKey(date)).toBe("2026-10-15");
  });

  it("formats dates and times consistently in Colombo time", () => {
    const utcDate = new Date("2026-10-15T04:00:00.000Z");
    expect(formatDate(utcDate)).toContain("Oct 15, 2026");
    expect(formatTime(utcDate)).toBe("09:30");
    expect(formatDateTime(utcDate)).toContain("Oct 15, 2026");
    expect(formatDateTime(utcDate)).toContain("09:30");
  });

  it("calculates startOfDayColombo correctly across UTC date boundaries", () => {
    // 2026-10-14 20:00 UTC is 2026-10-15 01:30 Colombo
    const date = new Date("2026-10-14T20:00:00.000Z");
    const start = startOfDayColombo(date);
    // Start of 2026-10-15 in Colombo is 2026-10-14 18:30 UTC
    expect(start.toISOString()).toBe("2026-10-14T18:30:00.000Z");
    expect(formatTime(start)).toBe("00:00");
    expect(formatDateKey(start)).toBe("2026-10-15");
  });

  it("adds days correctly", () => {
    const d1 = parseLocalInput("2026-10-15T10:00");
    const d2 = addDays(d1, 3);
    expect(formatDateKey(d2)).toBe("2026-10-18");
  });

  it("serializes to Colombo datetime-local input format", () => {
    const d = new Date("2026-10-14T19:00:00.000Z");
    expect(toColomboInputString(d)).toBe("2026-10-15T00:30");
  });
});
