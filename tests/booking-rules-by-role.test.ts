import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { reservations, resources, users } from "../lib/db/schema";
import {
  createReservation,
  type Actor,
} from "../lib/reservation-service";
import { encryptSession } from "../lib/auth";

// Mocks for Level (b) server action testing
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

let mockCookieToken: string | undefined = undefined;

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      mockCookieToken && name === "session" ? { value: mockCookieToken } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { createReservationAction } from "../app/actions/reservation-actions";

// Use a fixed reference time for testing
// 2030-01-01 00:00:00 UTC (05:30 Colombo)
const NOW = new Date("2030-01-01T00:00:00Z");

// Helpers for dates on 2030-01-02 in UTC
const atUtc = (h: number, m = 0) => new Date(Date.UTC(2030, 0, 2, h, m));

let adminActor: Actor;
let memberActor: Actor;
let otherMemberActor: Actor;

let adminToken: string;
let memberToken: string;

let room1Id: string;
let room2Id: string;
let inactiveRoomId: string;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);

  const [a, m, o] = await db
    .insert(users)
    .values([
      { name: "Admin Test", email: "admin@matrix.test", passwordHash: "x", role: "ADMIN" },
      { name: "Member Test", email: "member@matrix.test", passwordHash: "x", role: "MEMBER" },
      { name: "Other Test", email: "other@matrix.test", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();

  adminActor = { id: a.id, role: "ADMIN" };
  memberActor = { id: m.id, role: "MEMBER" };
  otherMemberActor = { id: o.id, role: "MEMBER" };

  adminToken = await encryptSession({ sub: a.id, role: "ADMIN", name: a.name });
  memberToken = await encryptSession({ sub: m.id, role: "MEMBER", name: m.name });

  const [r1, r2, inact] = await db
    .insert(resources)
    .values([
      { name: "Matrix Room 1", type: "Room", capacity: 10, isActive: true },
      { name: "Matrix Room 2", type: "Room", capacity: 8, isActive: true },
      { name: "Inactive Room", type: "Room", capacity: 4, isActive: false },
    ])
    .returning();

  room1Id = r1.id;
  room2Id = r2.id;
  inactiveRoomId = inact.id;
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.delete(reservations);
  redirectMock.mockClear();
});

describe("Booking Rules Matrix by Role", () => {
  const roles: Array<"MEMBER" | "ADMIN"> = ["MEMBER", "ADMIN"];

  for (const role of roles) {
    describe(`Role: ${role}`, () => {
      const getActor = () => (role === "ADMIN" ? adminActor : memberActor);
      const setSession = () => {
        mockCookieToken = role === "ADMIN" ? adminToken : memberToken;
      };

      // Helper to establish an existing confirmed booking: 10:00 to 12:00 on room1Id
      async function setupExistingBooking() {
        await createReservation(
          otherMemberActor,
          {
            resourceId: room1Id,
            title: "Existing Confirmed Meeting",
            startAt: atUtc(10),
            endAt: atUtc(12),
          },
          NOW,
        );
      }

      describe("Level (a): Directly against createReservation", () => {
        it("Scenario 1: Exact same window as an existing confirmed booking -> CONFLICT", async () => {
          await setupExistingBooking();
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Overlap Booking", startAt: atUtc(10), endAt: atUtc(12) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "CONFLICT" });
        });

        it("Scenario 2: Partial overlap at the start -> CONFLICT", async () => {
          await setupExistingBooking();
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Overlap Booking", startAt: atUtc(9), endAt: atUtc(11) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "CONFLICT" });
        });

        it("Scenario 3: Partial overlap at the end -> CONFLICT", async () => {
          await setupExistingBooking();
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Overlap Booking", startAt: atUtc(11), endAt: atUtc(13) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "CONFLICT" });
        });

        it("Scenario 4: New booking fully inside an existing one -> CONFLICT", async () => {
          await setupExistingBooking();
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Overlap Booking", startAt: atUtc(10, 30), endAt: atUtc(11, 30) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "CONFLICT" });
        });

        it("Scenario 5: New booking fully containing an existing one -> CONFLICT", async () => {
          await setupExistingBooking();
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Overlap Booking", startAt: atUtc(9, 30), endAt: atUtc(12, 30) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "CONFLICT" });
        });

        it("Scenario 6: Back-to-back (ends exactly when another starts) -> Allowed", async () => {
          await setupExistingBooking();
          const res = await createReservation(
            getActor(),
            { resourceId: room1Id, title: "Back to back Booking", startAt: atUtc(12), endAt: atUtc(13) },
            NOW,
          );
          expect(res.status).toBe("CONFIRMED");
        });

        it("Scenario 7: Same time, different resource -> Allowed", async () => {
          await setupExistingBooking();
          const res = await createReservation(
            getActor(),
            { resourceId: room2Id, title: "Different Room Booking", startAt: atUtc(10), endAt: atUtc(12) },
            NOW,
          );
          expect(res.status).toBe("CONFIRMED");
        });

        it("Scenario 8: Start time in the past -> PAST_BOOKING", async () => {
          const pastStart = new Date("2029-12-31T10:00:00Z");
          const pastEnd = new Date("2029-12-31T11:00:00Z");
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Past Booking", startAt: pastStart, endAt: pastEnd },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "PAST_BOOKING" });
        });

        it("Scenario 9: End before or equal to start -> VALIDATION", async () => {
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Inverted Booking", startAt: atUtc(12), endAt: atUtc(10) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "VALIDATION" });
        });

        it("Scenario 10: Longer than 8 hours -> VALIDATION", async () => {
          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "Too Long Booking", startAt: atUtc(8), endAt: atUtc(17) }, // 9h
              NOW,
            ),
          ).rejects.toMatchObject({ code: "VALIDATION" });
        });

        it("Scenario 11: Inactive resource -> INACTIVE_RESOURCE", async () => {
          await expect(
            createReservation(
              getActor(),
              { resourceId: inactiveRoomId, title: "Inactive Booking", startAt: atUtc(14), endAt: atUtc(15) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "INACTIVE_RESOURCE" });
        });

        it("Scenario 12: Non-existent resource id -> NOT_FOUND or VALIDATION", async () => {
          await expect(
            createReservation(
              getActor(),
              {
                resourceId: "00000000-0000-0000-0000-000000000000",
                title: "Ghost Room Booking",
                startAt: atUtc(14),
                endAt: atUtc(15),
              },
              NOW,
            ),
          ).rejects.toMatchObject({
            code: expect.stringMatching(/NOT_FOUND|VALIDATION/),
          });
        });

        it("Scenario 13: Invalid uuid or empty title -> VALIDATION", async () => {
          await expect(
            createReservation(
              getActor(),
              { resourceId: "not-a-uuid", title: "Invalid UUID Booking", startAt: atUtc(14), endAt: atUtc(15) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "VALIDATION" });

          await expect(
            createReservation(
              getActor(),
              { resourceId: room1Id, title: "   ", startAt: atUtc(14), endAt: atUtc(15) },
              NOW,
            ),
          ).rejects.toMatchObject({ code: "VALIDATION" });
        });
      });

      describe("Level (b): Through actual server action (createReservationAction)", () => {
        // Helper to invoke action with form data
        async function runAction(params: {
          resourceId: string;
          title: string;
          date?: string;
          startTime?: string;
          endTime?: string;
        }) {
          setSession();
          const fd = new FormData();
          fd.set("resourceId", params.resourceId);
          fd.set("title", params.title);
          fd.set("date", params.date ?? "2030-01-02");
          fd.set("startTime", params.startTime ?? "14:00");
          fd.set("endTime", params.endTime ?? "15:00");

          let redirectUrl = "";
          try {
            const res = await createReservationAction({}, fd);
            return { success: false, error: res.error };
          } catch (err: unknown) {
            const msg = (err as Error)?.message || "";
            if (msg.startsWith("REDIRECT:")) {
              redirectUrl = msg.replace("REDIRECT:", "");
              return { success: true, redirectUrl };
            }
            throw err;
          }
        }

        it("Scenario 1: Exact same window as an existing confirmed booking -> CONFLICT", async () => {
          await setupExistingBooking();
          // Existing booking is 10:00-12:00 UTC on 2030-01-02.
          // In Asia/Colombo (+05:30), that is 15:30-17:30.
          const res = await runAction({
            resourceId: room1Id,
            title: "Overlap Booking",
            date: "2030-01-02",
            startTime: "15:30",
            endTime: "17:30",
          });
          expect(res.success).toBe(false);
          expect(res.error).toBe("This resource is already booked for that time");
        });

        it("Scenario 2: Partial overlap at the start -> CONFLICT", async () => {
          await setupExistingBooking();
          // Overlap start: 14:30 to 16:30 Colombo (09:00 to 11:00 UTC)
          const res = await runAction({
            resourceId: room1Id,
            title: "Overlap Booking Start",
            date: "2030-01-02",
            startTime: "14:30",
            endTime: "16:30",
          });
          expect(res.success).toBe(false);
          expect(res.error).toBe("This resource is already booked for that time");
        });

        it("Scenario 3: Partial overlap at the end -> CONFLICT", async () => {
          await setupExistingBooking();
          // Overlap end: 16:30 to 18:30 Colombo (11:00 to 13:00 UTC)
          const res = await runAction({
            resourceId: room1Id,
            title: "Overlap Booking End",
            date: "2030-01-02",
            startTime: "16:30",
            endTime: "18:30",
          });
          expect(res.success).toBe(false);
          expect(res.error).toBe("This resource is already booked for that time");
        });

        it("Scenario 4: New booking fully inside an existing one -> CONFLICT", async () => {
          await setupExistingBooking();
          // Inside: 16:00 to 17:00 Colombo (10:30 to 11:30 UTC)
          const res = await runAction({
            resourceId: room1Id,
            title: "Overlap Booking Inside",
            date: "2030-01-02",
            startTime: "16:00",
            endTime: "17:00",
          });
          expect(res.success).toBe(false);
          expect(res.error).toBe("This resource is already booked for that time");
        });

        it("Scenario 5: New booking fully containing an existing one -> CONFLICT", async () => {
          await setupExistingBooking();
          // Containing: 15:00 to 18:00 Colombo (09:30 to 12:30 UTC)
          const res = await runAction({
            resourceId: room1Id,
            title: "Overlap Booking Containing",
            date: "2030-01-02",
            startTime: "15:00",
            endTime: "18:00",
          });
          expect(res.success).toBe(false);
          expect(res.error).toBe("This resource is already booked for that time");
        });

        it("Scenario 6: Back-to-back (ends exactly when another starts) -> Allowed", async () => {
          await setupExistingBooking();
          // Back to back: 17:30 to 18:30 Colombo (12:00 to 13:00 UTC)
          const res = await runAction({
            resourceId: room1Id,
            title: "Back to back Booking",
            date: "2030-01-02",
            startTime: "17:30",
            endTime: "18:30",
          });
          expect(res.success).toBe(true);
        });

        it("Scenario 7: Same time, different resource -> Allowed", async () => {
          await setupExistingBooking();
          const res = await runAction({
            resourceId: room2Id,
            title: "Different Room Booking",
            date: "2030-01-02",
            startTime: "15:30",
            endTime: "17:30",
          });
          expect(res.success).toBe(true);
        });

        it("Scenario 8: Start time in the past -> PAST_BOOKING", async () => {
          const res = await runAction({
            resourceId: room1Id,
            title: "Past Booking",
            date: "2020-01-01",
            startTime: "10:00",
            endTime: "11:00",
          });
          expect(res.success).toBe(false);
          expect(res.error).toBe("You cannot book a time in the past");
        });

        it("Scenario 9: End before or equal to start -> VALIDATION", async () => {
          const res = await runAction({
            resourceId: room1Id,
            title: "Inverted Booking",
            date: "2030-01-02",
            startTime: "16:00",
            endTime: "15:00",
          });
          expect(res.success).toBe(false);
          expect(res.error).toMatch(/End time must be after start time|valid/i);
        });

        it("Scenario 10: Longer than 8 hours -> VALIDATION", async () => {
          const res = await runAction({
            resourceId: room1Id,
            title: "Too Long Booking",
            date: "2030-01-02",
            startTime: "08:00",
            endTime: "17:30", // 9.5 hours
          });
          expect(res.success).toBe(false);
          expect(res.error).toMatch(/cannot exceed 8 hours/i);
        });

        it("Scenario 11: Inactive resource -> INACTIVE_RESOURCE", async () => {
          const res = await runAction({
            resourceId: inactiveRoomId,
            title: "Inactive Room Booking",
            date: "2030-01-02",
            startTime: "10:00",
            endTime: "11:00",
          });
          expect(res.success).toBe(false);
          expect(res.error).toBe("This resource is not available for booking");
        });

        it("Scenario 12: Non-existent resource id -> NOT_FOUND or VALIDATION", async () => {
          const res = await runAction({
            resourceId: "00000000-0000-0000-0000-000000000000",
            title: "Ghost Room Booking",
            date: "2030-01-02",
            startTime: "10:00",
            endTime: "11:00",
          });
          expect(res.success).toBe(false);
          expect(res.error).toMatch(/Resource not found|Invalid resource/i);
        });

        it("Scenario 13: Invalid uuid or empty title -> VALIDATION", async () => {
          const invalidUuidRes = await runAction({
            resourceId: "not-a-uuid",
            title: "Invalid UUID Booking",
            date: "2030-01-02",
            startTime: "10:00",
            endTime: "11:00",
          });
          expect(invalidUuidRes.success).toBe(false);
          expect(invalidUuidRes.error).toMatch(/Invalid resource|valid/i);

          const emptyTitleRes = await runAction({
            resourceId: room1Id,
            title: "   ",
            date: "2030-01-02",
            startTime: "10:00",
            endTime: "11:00",
          });
          expect(emptyTitleRes.success).toBe(false);
          expect(emptyTitleRes.error).toMatch(/fill in all required fields|title is required/i);
        });
      });
    });
  }
});
