import { and, asc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { reservations, resources, type Resource } from "./db/schema";
import { DomainError } from "./errors";
import { resourceInputSchema } from "./validators";
import type { Actor } from "./reservation-service";

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

function requireAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") {
    throw new DomainError("FORBIDDEN", "Only administrators can manage resources");
  }
}

export type ResourceFilters = {
  onlyActive?: boolean;
  search?: string;
  type?: string;
};

export async function listResources(f: ResourceFilters = {}): Promise<Resource[]> {
  const conditions: SQL[] = [];
  if (f.onlyActive) {
    conditions.push(eq(resources.isActive, true));
  }
  if (f.type && f.type.trim() && f.type !== "ALL") {
    conditions.push(eq(resources.type, f.type.trim()));
  }
  if (f.search && f.search.trim()) {
    conditions.push(ilike(resources.name, `%${f.search.trim()}%`));
  }

  return db
    .select()
    .from(resources)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(resources.name));
}

export async function getResource(id: string): Promise<Resource> {
  const [resource] = await db.select().from(resources).where(eq(resources.id, id));
  if (!resource) {
    throw new DomainError("NOT_FOUND", "Resource not found");
  }
  return resource;
}

export async function listResourceTypes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ type: resources.type })
    .from(resources)
    .orderBy(asc(resources.type));
  return rows.map((r) => r.type);
}

export async function createResource(
  actor: Actor,
  rawInput: unknown,
): Promise<Resource> {
  requireAdmin(actor);

  const parsed = resourceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new DomainError("VALIDATION", parsed.error.issues[0].message);
  }
  const input = parsed.data;

  try {
    const [created] = await db
      .insert(resources)
      .values({
        name: input.name,
        type: input.type,
        capacity: input.capacity,
        location: input.location || null,
        description: input.description || null,
        isActive: input.isActive,
      })
      .returning();
    return created;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new DomainError("CONFLICT", "A resource with this name already exists");
    }
    throw err;
  }
}

export async function updateResource(
  actor: Actor,
  id: string,
  rawInput: unknown,
): Promise<Resource> {
  requireAdmin(actor);

  await getResource(id);

  const parsed = resourceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new DomainError("VALIDATION", parsed.error.issues[0].message);
  }
  const input = parsed.data;

  try {
    const [updated] = await db
      .update(resources)
      .set({
        name: input.name,
        type: input.type,
        capacity: input.capacity,
        location: input.location || null,
        description: input.description || null,
        isActive: input.isActive,
      })
      .where(eq(resources.id, id))
      .returning();
    return updated;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new DomainError("CONFLICT", "A resource with this name already exists");
    }
    throw err;
  }
}

export async function deactivateResource(
  actor: Actor,
  id: string,
  now: Date = new Date(),
): Promise<{ resource: Resource; upcomingCount: number }> {
  requireAdmin(actor);

  const existing = await getResource(id);

  // Count upcoming active reservations to warn admin
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reservations)
    .where(
      and(
        eq(reservations.resourceId, id),
        eq(reservations.status, "CONFIRMED"),
        sql`${reservations.endAt} > ${now}`,
      ),
    );

  const upcomingCount = row?.count ?? 0;

  const [updated] = await db
    .update(resources)
    .set({ isActive: false })
    .where(eq(resources.id, id))
    .returning();

  return { resource: updated || existing, upcomingCount };
}

export async function deleteResource(
  actor: Actor,
  id: string,
): Promise<Resource> {
  requireAdmin(actor);

  const [resCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reservations)
    .where(eq(reservations.resourceId, id));

  if ((resCount?.count ?? 0) > 0) {
    throw new DomainError(
      "FORBIDDEN",
      "Cannot delete a resource with existing reservations. Deactivate it instead.",
    );
  }

  const [deleted] = await db.delete(resources).where(eq(resources.id, id)).returning();
  if (!deleted) throw new DomainError("NOT_FOUND", "Resource not found");
  return deleted;
}
