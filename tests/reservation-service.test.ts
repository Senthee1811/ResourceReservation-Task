import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { reservations, resources, users } from "../lib/db/schema";
import {
  cancelReservation,
  countReservations,
  createReservation,
  type Actor,
} from "../lib/reservation-service";

// Runs against the real PostgreSQL database in DATABASE_URL (migrations applied).
const NOW = new Date("2030-01-01T00:00:00Z");
const at = (h: number, m = 0) => new Date(Date.UTC(2030, 0, 2, h, m));

let admin: Actor;
let member: Actor;
let other: Actor;
let roomId: string;
let vanId: string;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);
  const [a, m, o] = await db
    .insert(users)
    .values([
      { name: "A", email: "a@t.dev", passwordHash: "x", role: "ADMIN" },
      { name: "M", email: "m@t.dev", passwordHash: "x", role: "MEMBER" },
      { name: "O", email: "o@t.dev", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();
  admin = { id: a.id, role: "ADMIN" };
  member = { id: m.id, role: "MEMBER" };
  other = { id: o.id, role: "MEMBER" };
  const [room, van] = await db
    .insert(resources)
    .values([
      { name: "Room", type: "Room", capacity: 10 },
      { name: "Van", type: "Vehicle", capacity: 8 },
    ])
    .returning();
  roomId = room.id;
  vanId = van.id;
});

beforeEach(async () => {
  await db.delete(reservations);
});

afterAll(async () => {
  await pool.end();
});

const book = (actor: Actor, resourceId: string, s: Date, e: Date) =>
  createReservation(actor, { resourceId, title: "Meeting", startAt: s, endAt: e }, NOW);

describe("overlap prevention", () => {
  it("accepts a booking on a free slot", async () => {
    const r = await book(member, roomId, at(9), at(10));
    expect(r.status).toBe("CONFIRMED");
  });

  it("rejects an overlapping booking on the same resource", async () => {
    await book(member, roomId, at(9), at(11));
    await expect(book(other, roomId, at(10), at(12))).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejects a booking fully contained in an existing one", async () => {
    await book(member, roomId, at(9), at(12));
    await expect(book(other, roomId, at(10), at(11))).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("allows back-to-back bookings (half-open ranges)", async () => {
    await book(member, roomId, at(9), at(10));
    await expect(book(other, roomId, at(10), at(11))).resolves.toBeDefined();
  });

  it("allows the same time on a different resource", async () => {
    await book(member, roomId, at(9), at(10));
    await expect(book(other, vanId, at(9), at(10))).resolves.toBeDefined();
  });

  it("frees the slot after cancellation", async () => {
    const r = await book(member, roomId, at(9), at(10));
    await cancelReservation(member, r.id, NOW);
    await expect(book(other, roomId, at(9), at(10))).resolves.toBeDefined();
  });

  it("lets only one of many simultaneous requests win", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () => book(other, roomId, at(14), at(15))),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled");
    const conflicts = attempts.filter(
      (a) => a.status === "rejected" && (a.reason as { code?: string }).code === "CONFLICT",
    );
    expect(ok).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
  });
});

describe("business rules", () => {
  it("rejects end before start", async () => {
    await expect(book(member, roomId, at(10), at(9))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects bookings longer than the maximum duration", async () => {
    await expect(book(member, roomId, at(0), at(12))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects bookings in the past", async () => {
    const past = new Date("2029-12-31T10:00:00Z");
    await expect(
      book(member, roomId, past, new Date("2029-12-31T11:00:00Z")),
    ).rejects.toMatchObject({ code: "PAST_BOOKING" });
  });

  it("rejects bookings for inactive resources", async () => {
    await db.update(resources).set({ isActive: false }).where(sql`id = ${vanId}`);
    await expect(book(member, vanId, at(9), at(10))).rejects.toMatchObject({
      code: "INACTIVE_RESOURCE",
    });
    await db.update(resources).set({ isActive: true }).where(sql`id = ${vanId}`);
  });
});

describe("cancellation permissions", () => {
  it("prevents a member cancelling someone else's booking", async () => {
    const r = await book(member, roomId, at(9), at(10));
    await expect(cancelReservation(other, r.id, NOW)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an admin cancel any booking", async () => {
    const r = await book(member, roomId, at(9), at(10));
    const c = await cancelReservation(admin, r.id, NOW);
    expect(c.status).toBe("CANCELLED");
  });

  it("rejects cancelling twice", async () => {
    const r = await book(member, roomId, at(9), at(10));
    await cancelReservation(member, r.id, NOW);
    await expect(cancelReservation(member, r.id, NOW)).rejects.toMatchObject({
      code: "ALREADY_CANCELLED",
    });
  });
});

describe("countReservations", () => {
  it("counts reservations according to filters", async () => {
    await book(member, roomId, at(9), at(10));
    const r2 = await book(member, roomId, at(11), at(12));
    await cancelReservation(member, r2.id, NOW);

    const total = await countReservations({ resourceId: roomId });
    expect(total).toBe(2);

    const confirmed = await countReservations({ resourceId: roomId, status: "CONFIRMED" });
    expect(confirmed).toBe(1);

    const cancelled = await countReservations({ resourceId: roomId, status: "CANCELLED" });
    expect(cancelled).toBe(1);
  });
});

