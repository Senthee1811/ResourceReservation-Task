import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { reservations, resources, users } from "../lib/db/schema";
import {
  createResource,
  deactivateResource,
  deleteResource,
  getResource,
  listResources,
  listResourceTypes,
  updateResource,
} from "../lib/resource-service";
import type { Actor } from "../lib/reservation-service";

const NOW = new Date("2030-01-01T00:00:00Z");

let admin: Actor;
let member: Actor;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE reservations, resources, users RESTART IDENTITY CASCADE`);
  const [a, m] = await db
    .insert(users)
    .values([
      { name: "Admin", email: "admin@res.test", passwordHash: "x", role: "ADMIN" },
      { name: "Member", email: "member@res.test", passwordHash: "x", role: "MEMBER" },
    ])
    .returning();
  admin = { id: a.id, role: "ADMIN" };
  member = { id: m.id, role: "MEMBER" };
});

beforeEach(async () => {
  await db.delete(reservations);
  await db.delete(resources);
});

afterAll(async () => {
  await pool.end();
});

describe("resource-service", () => {
  it("allows admin to create a resource", async () => {
    const created = await createResource(admin, {
      name: "Bio Lab 1",
      type: "Laboratory",
      capacity: 15,
      location: "Building C",
      isActive: "on",
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Bio Lab 1");
    expect(created.isActive).toBe(true);
  });

  it("forbids non-admin from creating a resource", async () => {
    await expect(
      createResource(member, {
        name: "Bio Lab 2",
        type: "Laboratory",
        capacity: 10,
        isActive: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("maps duplicate resource name to CONFLICT domain error", async () => {
    await createResource(admin, {
      name: "Unique Room",
      type: "Room",
      capacity: 5,
      isActive: true,
    });

    await expect(
      createResource(admin, {
        name: "Unique Room",
        type: "Room",
        capacity: 10,
        isActive: true,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "A resource with this name already exists",
    });
  });

  it("filters resources by active status, type, and search term", async () => {
    await createResource(admin, { name: "Auditorium", type: "Hall", capacity: 200, isActive: true });
    await createResource(admin, { name: "Small Hall", type: "Hall", capacity: 50, isActive: false });
    await createResource(admin, { name: "Physics Lab", type: "Lab", capacity: 20, isActive: true });

    const all = await listResources();
    expect(all).toHaveLength(3);

    const activeOnly = await listResources({ onlyActive: true });
    expect(activeOnly).toHaveLength(2);

    const hallsOnly = await listResources({ type: "Hall" });
    expect(hallsOnly).toHaveLength(2);

    const searched = await listResources({ search: "physics" });
    expect(searched).toHaveLength(1);
    expect(searched[0].name).toBe("Physics Lab");

    const types = await listResourceTypes();
    expect(types).toContain("Hall");
    expect(types).toContain("Lab");
  });

  it("updates an existing resource", async () => {
    const r = await createResource(admin, {
      name: "Old Name",
      type: "Room",
      capacity: 4,
      isActive: true,
    });

    const updated = await updateResource(admin, r.id, {
      name: "New Name",
      type: "Conference Room",
      capacity: 8,
      isActive: true,
    });

    expect(updated.name).toBe("New Name");
    expect(updated.capacity).toBe(8);
  });

  it("deactivates resource and reports upcoming bookings count", async () => {
    const r = await createResource(admin, {
      name: "Meeting Pod",
      type: "Room",
      capacity: 4,
      isActive: true,
    });

    // Insert upcoming booking
    await db.insert(reservations).values({
      resourceId: r.id,
      userId: member.id,
      title: "Sync",
      startAt: new Date("2030-01-02T10:00:00Z"),
      endAt: new Date("2030-01-02T11:00:00Z"),
      status: "CONFIRMED",
    });

    const result = await deactivateResource(admin, r.id, NOW);
    expect(result.resource.isActive).toBe(false);
    expect(result.upcomingCount).toBe(1);

    const updated = await getResource(r.id);
    expect(updated.isActive).toBe(false);
  });

  it("prevents deletion of resource with reservations", async () => {
    const r = await createResource(admin, {
      name: "Projector X",
      type: "Equipment",
      capacity: 1,
      isActive: true,
    });

    await db.insert(reservations).values({
      resourceId: r.id,
      userId: member.id,
      title: "Screening",
      startAt: new Date("2030-01-02T10:00:00Z"),
      endAt: new Date("2030-01-02T11:00:00Z"),
      status: "CONFIRMED",
    });

    await expect(deleteResource(admin, r.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
