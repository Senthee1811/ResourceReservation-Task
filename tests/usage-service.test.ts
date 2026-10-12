import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { reservations, resources, users } from "../lib/db/schema";
import {
  getUsageSummary,
  OPEN_HOURS_PER_DAY,
} from "../lib/usage-service";
import type { Actor } from "../lib/reservation-service";
import { DomainError } from "../lib/errors";

let adminActor: Actor;
let memberActor: Actor;
let roomAId: string;
let roomBId: string;
let roomCId: string;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);

  const [adminUser, memberUser] = await db
    .insert(users)
    .values([
      { name: "Admin User", email: "admin@usage.test", passwordHash: "x", role: "ADMIN" },
      { name: "Member User", email: "member@usage.test", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();

  adminActor = { id: adminUser.id, role: "ADMIN" };
  memberActor = { id: memberUser.id, role: "MEMBER" };

  const [rA, rB, rC] = await db
    .insert(resources)
    .values([
      { name: "Alpha Lab", type: "Lab", capacity: 10 },
      { name: "Beta Room", type: "Room", capacity: 4 },
      { name: "Gamma Studio", type: "Room", capacity: 8 },
    ])
    .returning();

  roomAId = rA.id;
  roomBId = rB.id;
  roomCId = rC.id;
});

beforeEach(async () => {
  await db.delete(reservations);
});

afterAll(async () => {
  await pool.end();
});

describe("usage-service", () => {
  it("rejects non-admin access with FORBIDDEN DomainError", async () => {
    await expect(getUsageSummary(memberActor, 7)).rejects.toThrow(DomainError);
    await expect(getUsageSummary(memberActor, 7)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("calculates exact clipped hours, utilization %, and ranking", async () => {
    // Reference date: 2026-10-15T12:00:00Z, range = 7 days
    // Window: 2026-10-08T12:00:00Z to 2026-10-15T12:00:00Z
    // Total open hours per resource: 7 * 10 = 70 hours
    const now = new Date("2026-10-15T12:00:00Z");

    // 1. Fully inside window for Alpha Lab: 2.0 hours
    await db.insert(reservations).values({
      resourceId: roomAId,
      userId: memberActor.id,
      title: "Alpha Inside",
      startAt: new Date("2026-10-10T10:00:00Z"),
      endAt: new Date("2026-10-10T12:00:00Z"),
      status: "CONFIRMED",
    });

    // 2. Clipped across windowStart for Alpha Lab:
    // Starts 2026-10-08T10:00:00Z, ends 2026-10-08T14:00:00Z
    // Overlap with window [10-08T12:00:00Z, 10-15T12:00:00Z] is exactly 2.0 hours (12:00 to 14:00)
    await db.insert(reservations).values({
      resourceId: roomAId,
      userId: memberActor.id,
      title: "Alpha Start Clip",
      startAt: new Date("2026-10-08T10:00:00Z"),
      endAt: new Date("2026-10-08T14:00:00Z"),
      status: "CONFIRMED",
    });

    // 3. Clipped across windowEnd for Alpha Lab:
    // Starts 2026-10-15T11:00:00Z, ends 2026-10-15T14:00:00Z
    // Overlap with window is exactly 1.0 hour (11:00 to 12:00)
    await db.insert(reservations).values({
      resourceId: roomAId,
      userId: memberActor.id,
      title: "Alpha End Clip",
      startAt: new Date("2026-10-15T11:00:00Z"),
      endAt: new Date("2026-10-15T14:00:00Z"),
      status: "CONFIRMED",
    });

    // 4. Outside window (before): not counted
    await db.insert(reservations).values({
      resourceId: roomAId,
      userId: memberActor.id,
      title: "Alpha Past Outside",
      startAt: new Date("2026-10-01T10:00:00Z"),
      endAt: new Date("2026-10-01T12:00:00Z"),
      status: "CONFIRMED",
    });

    // Beta Room: 1 booking of 3.5 hours inside window
    await db.insert(reservations).values({
      resourceId: roomBId,
      userId: memberActor.id,
      title: "Beta Booking",
      startAt: new Date("2026-10-12T08:00:00Z"),
      endAt: new Date("2026-10-12T11:30:00Z"),
      status: "CONFIRMED",
    });

    // Gamma Studio: 1 cancelled booking of 4 hours inside window (should NOT count as confirmed)
    await db.insert(reservations).values({
      resourceId: roomCId,
      userId: memberActor.id,
      title: "Gamma Cancelled",
      startAt: new Date("2026-10-11T09:00:00Z"),
      endAt: new Date("2026-10-11T13:00:00Z"),
      status: "CANCELLED",
    });

    const summary = await getUsageSummary(adminActor, 7, now);

    expect(summary.days).toBe(7);
    expect(summary.openHoursPerDay).toBe(OPEN_HOURS_PER_DAY);
    expect(summary.totalOpenHoursPerResource).toBe(70);

    // Alpha Lab checks
    const alpha = summary.resources.find((r) => r.id === roomAId);
    expect(alpha).toBeDefined();
    expect(alpha?.bookingCount).toBe(3);
    // 2.0 + 2.0 + 1.0 = 5.0 hours
    expect(alpha?.bookedHours).toBe(5);
    // 5.0 / 70 = 0.071428... -> 7.1%
    expect(alpha?.utilizationPercent).toBe(7.1);

    // Beta Room checks
    const beta = summary.resources.find((r) => r.id === roomBId);
    expect(beta).toBeDefined();
    expect(beta?.bookingCount).toBe(1);
    expect(beta?.bookedHours).toBe(3.5);
    // 3.5 / 70 = 0.05 -> 5.0%
    expect(beta?.utilizationPercent).toBe(5);

    // Gamma Studio checks (only had a cancelled booking)
    const gamma = summary.resources.find((r) => r.id === roomCId);
    expect(gamma).toBeDefined();
    expect(gamma?.bookingCount).toBe(0);
    expect(gamma?.bookedHours).toBe(0);
    expect(gamma?.utilizationPercent).toBe(0);

    // Total confirmed bookings: 3 for Alpha + 1 for Beta = 4
    expect(summary.totalConfirmedBookings).toBe(4);
    // Total cancelled bookings: 1 for Gamma
    expect(summary.totalCancelledBookings).toBe(1);
    // Cancellation rate: 1 / (4 + 1) = 20.0%
    expect(summary.cancellationRate).toBe(20);

    // Top resources ranking: Alpha (3 bookings) then Beta (1 booking)
    expect(summary.topResources[0]?.id).toBe(roomAId);
    expect(summary.topResources[1]?.id).toBe(roomBId);
  });

  it("calculates busiest weekday according to Asia/Colombo timezone", async () => {
    // Friday night UTC = Saturday early morning in Colombo (+05:30)
    // 2026-10-09T20:00:00Z is 2026-10-10 01:30:00 Colombo (Saturday)
    const now = new Date("2026-10-15T12:00:00Z");

    await db.insert(reservations).values([
      {
        resourceId: roomAId,
        userId: memberActor.id,
        title: "Saturday Colombo Booking 1",
        startAt: new Date("2026-10-09T20:00:00Z"),
        endAt: new Date("2026-10-09T22:00:00Z"),
        status: "CONFIRMED",
      },
      {
        resourceId: roomBId,
        userId: memberActor.id,
        title: "Saturday Colombo Booking 2",
        startAt: new Date("2026-10-09T22:30:00Z"),
        endAt: new Date("2026-10-09T23:30:00Z"),
        status: "CONFIRMED",
      },
      {
        resourceId: roomCId,
        userId: memberActor.id,
        title: "Monday Colombo Booking",
        startAt: new Date("2026-10-12T04:00:00Z"), // Monday 09:30 Colombo
        endAt: new Date("2026-10-12T06:00:00Z"),
        status: "CONFIRMED",
      },
    ]);

    const summary = await getUsageSummary(adminActor, 7, now);

    expect(summary.busiestWeekday).not.toBeNull();
    expect(summary.busiestWeekday?.dayName).toBe("Saturday");
    expect(summary.busiestWeekday?.count).toBe(2);
  });
});
