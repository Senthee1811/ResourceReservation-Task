import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { reservations, resources, users } from "../lib/db/schema";
import { createReservation, type Actor } from "../lib/reservation-service";
import { DomainError } from "../lib/errors";

const NOW = new Date("2030-01-01T00:00:00Z");
const at = (h: number, m = 0) => new Date(Date.UTC(2030, 0, 2, h, m));

let member: Actor;
let other: Actor;
let roomId: string;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);
  const [m, o] = await db
    .insert(users)
    .values([
      { name: "Member 1", email: "m1@action.test", passwordHash: "x", role: "MEMBER" },
      { name: "Member 2", email: "m2@action.test", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();
  member = { id: m.id, role: "MEMBER" };
  other = { id: o.id, role: "MEMBER" };

  const [room] = await db
    .insert(resources)
    .values([{ name: "Action Test Room", type: "Room", capacity: 8 }])
    .returning();
  roomId = room.id;
});

beforeEach(async () => {
  await db.delete(reservations);
});

afterAll(async () => {
  await pool.end();
});

describe("action-level reservation conflict handling", () => {
  it("rejects an overlapping booking with friendly CONFLICT error", async () => {
    // Member 1 books 09:00 - 11:00
    await createReservation(
      member,
      {
        resourceId: roomId,
        title: "Sprint Planning",
        startAt: at(9),
        endAt: at(11),
      },
      NOW,
    );

    // Member 2 attempts conflicting 10:00 - 12:00
    let caughtError: DomainError | null = null;
    try {
      await createReservation(
        other,
        {
          resourceId: roomId,
          title: "Design Review",
          startAt: at(10),
          endAt: at(12),
        },
        NOW,
      );
    } catch (err) {
      if (err instanceof DomainError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe("CONFLICT");
    expect(caughtError?.message).toBe(
      "This resource is already booked for that time",
    );
  });

  it("rejects past bookings with PAST_BOOKING error", async () => {
    let caughtError: DomainError | null = null;
    try {
      await createReservation(
        member,
        {
          resourceId: roomId,
          title: "Past meeting",
          startAt: new Date(NOW.getTime() - 3600000), // 1 hr before NOW
          endAt: NOW,
        },
        NOW,
      );
    } catch (err) {
      if (err instanceof DomainError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe("PAST_BOOKING");
    expect(caughtError?.message).toBe("You cannot book a time in the past");
  });

  it("rejects bookings exceeding 8 hours with VALIDATION error", async () => {
    let caughtError: DomainError | null = null;
    try {
      await createReservation(
        member,
        {
          resourceId: roomId,
          title: "9 Hour Workshop",
          startAt: at(8),
          endAt: at(17, 30), // 9.5 hours
        },
        NOW,
      );
    } catch (err) {
      if (err instanceof DomainError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe("VALIDATION");
    expect(caughtError?.message).toContain("cannot exceed 8 hours");
  });
});
