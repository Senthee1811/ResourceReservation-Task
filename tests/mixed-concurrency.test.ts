import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { reservations, resources, users } from "../lib/db/schema";
import { encryptSession } from "../lib/auth";

let activeMockToken: string | undefined = undefined;

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      activeMockToken && name === "session" ? { value: activeMockToken } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { createReservationAction } from "../app/actions/reservation-actions";

let adminToken: string;
let memberToken: string;
let roomId: string;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);

  const [a, m] = await db
    .insert(users)
    .values([
      { name: "Concurrent Admin", email: "cadm@test.local", passwordHash: "x", role: "ADMIN" },
      { name: "Concurrent Member", email: "cmem@test.local", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();

  adminToken = await encryptSession({ sub: a.id, role: "ADMIN", name: a.name });
  memberToken = await encryptSession({ sub: m.id, role: "MEMBER", name: m.name });

  const [r] = await db
    .insert(resources)
    .values([{ name: "Concurrency Arena", type: "Room", capacity: 12, isActive: true }])
    .returning();
  roomId = r.id;
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.delete(reservations);
});

describe("Step 4: Mixed Concurrency Stress Test", () => {
  // Run 5 separate iterations to prove 0 flakiness under high concurrent contention
  for (let iteration = 1; iteration <= 5; iteration++) {
    it(`Iteration ${iteration}/5: 10 simultaneous requests (5 admin, 5 member) yields exactly 1 success and 9 CONFLICTs`, async () => {
      // Create request definitions
      const callers = [
        { role: "ADMIN", token: adminToken, title: "Admin Attempt" },
        { role: "MEMBER", token: memberToken, title: "Member Attempt" },
        { role: "ADMIN", token: adminToken, title: "Admin Attempt" },
        { role: "MEMBER", token: memberToken, title: "Member Attempt" },
        { role: "ADMIN", token: adminToken, title: "Admin Attempt" },
        { role: "MEMBER", token: memberToken, title: "Member Attempt" },
        { role: "ADMIN", token: adminToken, title: "Admin Attempt" },
        { role: "MEMBER", token: memberToken, title: "Member Attempt" },
        { role: "ADMIN", token: adminToken, title: "Admin Attempt" },
        { role: "MEMBER", token: memberToken, title: "Member Attempt" },
      ];

      const results = await Promise.allSettled(
        callers.map(async (caller, idx) => {
          const fd = new FormData();
          fd.set("resourceId", roomId);
          fd.set("title", `${caller.title} #${idx + 1}`);
          fd.set("date", "2030-02-15");
          fd.set("startTime", "10:00");
          fd.set("endTime", "11:00");

          // Note: In Node single-threaded async event loop, set session before calling action
          activeMockToken = caller.token;
          try {
            const res = await createReservationAction({}, fd);
            return { success: false, error: res.error, caller: caller.role };
          } catch (err: unknown) {
            const msg = (err as Error)?.message || "";
            if (msg.startsWith("REDIRECT:")) {
              return { success: true, caller: caller.role };
            }
            throw err;
          }
        }),
      );

      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value.success === true,
      );
      const conflicts = results.filter(
        (r) =>
          r.status === "fulfilled" &&
          r.value.success === false &&
          r.value.error === "This resource is already booked for that time",
      );

      expect(successful).toHaveLength(1);
      expect(conflicts).toHaveLength(9);

      // Verify the database has exactly 1 row
      const rows = await db.select().from(reservations);
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("CONFIRMED");
    });
  }
});
