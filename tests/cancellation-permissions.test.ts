import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { reservations, resources, users } from "../lib/db/schema";
import {
  cancelReservation,
  createReservation,
  type Actor,
} from "../lib/reservation-service";

const NOW = new Date("2030-01-01T00:00:00Z");
const at = (h: number, m = 0) => new Date(Date.UTC(2030, 0, 2, h, m));

let adminActor: Actor;
let memberActor1: Actor;
let memberActor2: Actor;
let roomId: string;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);
  const [a, m1, m2] = await db
    .insert(users)
    .values([
      { name: "Admin", email: "admin@perm.test", passwordHash: "x", role: "ADMIN" },
      { name: "Member 1", email: "m1@perm.test", passwordHash: "x", role: "MEMBER" },
      { name: "Member 2", email: "m2@perm.test", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();

  adminActor = { id: a.id, role: "ADMIN" };
  memberActor1 = { id: m1.id, role: "MEMBER" };
  memberActor2 = { id: m2.id, role: "MEMBER" };

  const [room] = await db
    .insert(resources)
    .values([{ name: "Perm Test Room", type: "Room", capacity: 6 }])
    .returning();
  roomId = room.id;
});

beforeEach(async () => {
  await db.delete(reservations);
});

afterAll(async () => {
  await pool.end();
});

describe("cancellation permissions and guards", () => {
  it("prevents Member 2 from cancelling Member 1's booking (forged ID)", async () => {
    const booking = await createReservation(
      memberActor1,
      {
        resourceId: roomId,
        title: "Member 1 Meeting",
        startAt: at(10),
        endAt: at(11),
      },
      NOW,
    );

    await expect(
      cancelReservation(memberActor2, booking.id, NOW),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You can only cancel your own bookings",
    });
  });

  it("allows Member 1 to cancel their own upcoming booking", async () => {
    const booking = await createReservation(
      memberActor1,
      {
        resourceId: roomId,
        title: "Member 1 Meeting",
        startAt: at(10),
        endAt: at(11),
      },
      NOW,
    );

    const cancelled = await cancelReservation(memberActor1, booking.id, NOW);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("allows Admin to cancel any member's booking", async () => {
    const booking = await createReservation(
      memberActor1,
      {
        resourceId: roomId,
        title: "Member 1 Meeting",
        startAt: at(10),
        endAt: at(11),
      },
      NOW,
    );

    const cancelled = await cancelReservation(adminActor, booking.id, NOW);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancelling an already cancelled booking", async () => {
    const booking = await createReservation(
      memberActor1,
      {
        resourceId: roomId,
        title: "Member 1 Meeting",
        startAt: at(10),
        endAt: at(11),
      },
      NOW,
    );

    await cancelReservation(memberActor1, booking.id, NOW);

    await expect(
      cancelReservation(memberActor1, booking.id, NOW),
    ).rejects.toMatchObject({
      code: "ALREADY_CANCELLED",
    });
  });

  it("rejects cancelling past reservations", async () => {
    // Booking in the past relative to execution timestamp
    const pastStart = new Date("2029-12-01T10:00:00Z");
    const pastEnd = new Date("2029-12-01T11:00:00Z");

    const [pastBooking] = await db
      .insert(reservations)
      .values({
        resourceId: roomId,
        userId: memberActor1.id,
        title: "Old Booking",
        startAt: pastStart,
        endAt: pastEnd,
        status: "CONFIRMED",
      })
      .returning();

    await expect(
      cancelReservation(memberActor1, pastBooking.id, NOW),
    ).rejects.toMatchObject({
      code: "PAST_BOOKING",
      message: "Past reservations cannot be cancelled",
    });
  });
});
