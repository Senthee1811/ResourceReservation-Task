import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { resources, users } from "../lib/db/schema";
import { createReservation, type Actor } from "../lib/reservation-service";

const NOW = new Date("2030-01-01T00:00:00Z");
const atUtc = (h: number, m = 0) => new Date(Date.UTC(2030, 0, 2, h, m));

let adminActor: Actor;
let memberActor: Actor;
let otherMemberActor: Actor;
let roomId: string;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);

  const [a, m, o] = await db
    .insert(users)
    .values([
      { name: "Admin Guard", email: "admin@guard.test", passwordHash: "x", role: "ADMIN" },
      { name: "Member Guard", email: "member@guard.test", passwordHash: "x", role: "MEMBER" },
      { name: "Target Member", email: "target@guard.test", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();

  adminActor = { id: a.id, role: "ADMIN" };
  memberActor = { id: m.id, role: "MEMBER" };
  otherMemberActor = { id: o.id, role: "MEMBER" };

  const [r] = await db
    .insert(resources)
    .values([{ name: "Guard Room", type: "Room", capacity: 6, isActive: true }])
    .returning();
  roomId = r.id;
});

afterAll(async () => {
  await pool.end();
});

describe("Guard Rail 1: Database Integrity Constraints in pg_constraint", () => {
  it("verifies reservations_no_overlap (EXCLUDE USING gist) is present in PostgreSQL", async () => {
    const result = await db.execute<{ conname: string; contype: string }>(sql`
      SELECT c.conname, c.contype
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'reservations'
        AND c.conname = 'reservations_no_overlap'
    `);

    expect(result.rows).toHaveLength(1);
    // 'x' = exclusion constraint in PostgreSQL pg_constraint
    expect(result.rows[0].contype).toBe("x");
  });

  it("verifies reservations_valid_range (CHECK end_at > start_at) is present in PostgreSQL", async () => {
    const result = await db.execute<{ conname: string; contype: string }>(sql`
      SELECT c.conname, c.contype
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'reservations'
        AND c.conname = 'reservations_valid_range'
    `);

    expect(result.rows).toHaveLength(1);
    // 'c' = check constraint in PostgreSQL pg_constraint
    expect(result.rows[0].contype).toBe("c");
  });
});

describe("Guard Rail 2: Architecture Rule - Single Reservation Insert Path", () => {
  function getTsFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...getTsFiles(fullPath));
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("asserts insert(reservations) appears only in lib/reservation-service.ts across application source code", () => {
    const appFiles = getTsFiles(join(process.cwd(), "app"));
    const libFiles = getTsFiles(join(process.cwd(), "lib"));
    const allSourceFiles = [...appFiles, ...libFiles];

    const violations: string[] = [];

    for (const filePath of allSourceFiles) {
      // Normalize path separators
      const normalizedPath = filePath.replace(/\\/g, "/");
      if (normalizedPath.endsWith("lib/reservation-service.ts")) {
        continue;
      }

      const content = readFileSync(filePath, "utf-8");
      if (
        content.includes("insert(reservations") ||
        content.includes(".insert(reservations")
      ) {
        violations.push(normalizedPath);
      }
    }

    expect(
      violations,
      `Detected unauthorized reservation insert outside lib/reservation-service.ts: ${violations.join(", ")}`,
    ).toEqual([]);
  });
});

describe("Guard Rail 3: Admin On-Behalf-Of Attribution & Rule Enforcement", () => {
  it("allows admin to book on behalf of an existing user and attributes reservation to that user", async () => {
    const booking = await createReservation(
      adminActor,
      {
        resourceId: roomId,
        userId: otherMemberActor.id,
        title: "Admin On Behalf Booking",
        startAt: atUtc(9),
        endAt: atUtc(10),
      },
      NOW,
    );

    expect(booking.userId).toBe(otherMemberActor.id);
    expect(booking.status).toBe("CONFIRMED");
  });

  it("rejects admin on-behalf-of booking if target user does not exist", async () => {
    await expect(
      createReservation(
        adminActor,
        {
          resourceId: roomId,
          userId: "00000000-0000-0000-0000-000000000000",
          title: "Ghost User Booking",
          startAt: atUtc(10),
          endAt: atUtc(11),
        },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("prevents member from spoofing another user's booking (attributes to member)", async () => {
    const booking = await createReservation(
      memberActor,
      {
        resourceId: roomId,
        userId: otherMemberActor.id,
        title: "Member Spoof Attempt",
        startAt: atUtc(11),
        endAt: atUtc(12),
      },
      NOW,
    );

    // Reservation is assigned to the authenticated member, not the target user
    expect(booking.userId).toBe(memberActor.id);
  });

  it("enforces conflict rules identically on admin on-behalf bookings", async () => {
    // 09:00 - 10:00 already booked above
    await expect(
      createReservation(
        adminActor,
        {
          resourceId: roomId,
          userId: otherMemberActor.id,
          title: "Conflicting Admin On Behalf Booking",
          startAt: atUtc(9, 30),
          endAt: atUtc(10, 30),
        },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
