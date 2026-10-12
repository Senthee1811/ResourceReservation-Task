import { describe, expect, it } from "vitest";
import {
  computeDayLayout,
  getCurrentTimePosition,
  getHourSlots,
  TOTAL_MINUTES,
} from "../lib/calendar-layout";
import { parseLocalInput } from "../lib/datetime";

describe("lib/calendar-layout", () => {
  const day = parseLocalInput("2026-10-15T00:00");

  it("computes exact top and height for booking inside 07:00-21:00 window", () => {
    // 09:00 to 11:00 Colombo
    // Window starts at 07:00 (420 min). 09:00 is +120 min. Total is 840 min.
    // topPercent = 120 / 840 * 100 = 14.2857%
    // heightPercent = 120 / 840 * 100 = 14.2857%
    const startAt = parseLocalInput("2026-10-15T09:00");
    const endAt = parseLocalInput("2026-10-15T11:00");

    const blocks = computeDayLayout(day, [
      {
        id: "b1",
        title: "Sprint Planning",
        startAt,
        endAt,
        status: "CONFIRMED",
      },
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].topPercent).toBeCloseTo((120 / TOTAL_MINUTES) * 100, 2);
    expect(blocks[0].heightPercent).toBeCloseTo((120 / TOTAL_MINUTES) * 100, 2);
    expect(blocks[0].isClippedStart).toBe(false);
    expect(blocks[0].isClippedEnd).toBe(false);
  });

  it("clips booking that starts before 07:00 Colombo", () => {
    // 06:00 to 08:00 -> clipped start at 07:00, height is 1 hour (60 min)
    const startAt = parseLocalInput("2026-10-15T06:00");
    const endAt = parseLocalInput("2026-10-15T08:00");

    const blocks = computeDayLayout(day, [
      {
        id: "b2",
        title: "Early Setup",
        startAt,
        endAt,
        status: "CONFIRMED",
      },
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].topPercent).toBe(0);
    expect(blocks[0].heightPercent).toBeCloseTo((60 / TOTAL_MINUTES) * 100, 2);
    expect(blocks[0].isClippedStart).toBe(true);
  });

  it("clips booking that ends after 21:00 Colombo", () => {
    // 20:00 to 22:30 -> starts at 20:00 (+780 min), clipped at 21:00 (+840 min)
    const startAt = parseLocalInput("2026-10-15T20:00");
    const endAt = parseLocalInput("2026-10-15T22:30");

    const blocks = computeDayLayout(day, [
      {
        id: "b3",
        title: "Late Lab Test",
        startAt,
        endAt,
        status: "CONFIRMED",
      },
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].topPercent).toBeCloseTo((780 / TOTAL_MINUTES) * 100, 2);
    expect(blocks[0].heightPercent).toBeCloseTo((60 / TOTAL_MINUTES) * 100, 2);
    expect(blocks[0].isClippedEnd).toBe(true);
  });

  it("clips booking crossing midnight to the day's timeline", () => {
    // Booking from 2026-10-15 20:00 to 2026-10-16 02:00
    const startAt = parseLocalInput("2026-10-15T20:00");
    const endAt = parseLocalInput("2026-10-16T02:00");

    const day1Blocks = computeDayLayout(day, [
      {
        id: "b4",
        title: "Overnight Experiment",
        startAt,
        endAt,
        status: "CONFIRMED",
      },
    ]);

    expect(day1Blocks).toHaveLength(1);
    expect(day1Blocks[0].topPercent).toBeCloseTo((780 / TOTAL_MINUTES) * 100, 2);
    expect(day1Blocks[0].heightPercent).toBeCloseTo((60 / TOTAL_MINUTES) * 100, 2);
    expect(day1Blocks[0].isClippedEnd).toBe(true);

    // Day 2 check (ends at 02:00 which is before 07:00, so not rendered in 07:00-21:00 timeline)
    const nextDay = parseLocalInput("2026-10-16T00:00");
    const day2Blocks = computeDayLayout(nextDay, [
      {
        id: "b4",
        title: "Overnight Experiment",
        startAt,
        endAt,
        status: "CONFIRMED",
      },
    ]);
    expect(day2Blocks).toHaveLength(0);
  });

  it("ignores CANCELLED reservations in layout", () => {
    const startAt = parseLocalInput("2026-10-15T10:00");
    const endAt = parseLocalInput("2026-10-15T11:00");

    const blocks = computeDayLayout(day, [
      {
        id: "b5",
        title: "Cancelled Meeting",
        startAt,
        endAt,
        status: "CANCELLED",
      },
    ]);

    expect(blocks).toHaveLength(0);
  });

  it("calculates current time position accurately", () => {
    // Current time at 14:00 Colombo (+420 min into 840 min window = 50%)
    const now = parseLocalInput("2026-10-15T14:00");
    const pos = getCurrentTimePosition(day, now);
    expect(pos).toBeCloseTo(50, 2);

    // Current time at 05:00 Colombo (outside window)
    const early = parseLocalInput("2026-10-15T05:00");
    expect(getCurrentTimePosition(day, early)).toBeNull();

    // Current time on another day
    const otherDay = parseLocalInput("2026-10-16T14:00");
    expect(getCurrentTimePosition(day, otherDay)).toBeNull();
  });

  it("generates hour slots from 07:00 to 21:00", () => {
    const slots = getHourSlots();
    expect(slots).toHaveLength(15);
    expect(slots[0].label).toBe("07:00");
    expect(slots[slots.length - 1].label).toBe("21:00");
  });
});
