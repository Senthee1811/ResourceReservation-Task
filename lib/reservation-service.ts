import { and, asc, desc, eq, gt, lt, type SQL } from "drizzle-orm";
import { db } from "./db";
import { reservations, resources, users } from "./db/schema";
import { DomainError } from "./errors";
import { reservationInputSchema } from "./validators";

export type Actor = { id: string; role: "ADMIN" | "MEMBER" };

// SQLSTATE 23P01 = exclusion_violation (our no-overlap constraint).
function isExclusionViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23P01" || e?.cause?.code === "23P01";
}

export async function createReservation(
  actor: Actor,
  rawInput: unknown,
  now: Date = new Date(),
) {
  const parsed = reservationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new DomainError("VALIDATION", parsed.error.issues[0].message);
  }
  const input = parsed.data;

  if (input.startAt < now) {
    throw new DomainError("PAST_BOOKING", "You cannot book a time in the past");
  }

  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, input.resourceId));
  if (!resource) throw new DomainError("NOT_FOUND", "Resource not found");
  if (!resource.isActive) {
    throw new DomainError(
      "INACTIVE_RESOURCE",
      "This resource is not available for booking",
    );
  }

  try {
    const [created] = await db
      .insert(reservations)
      .values({
        resourceId: input.resourceId,
        userId: actor.id,
        title: input.title,
        notes: input.notes || null,
        startAt: input.startAt,
        endAt: input.endAt,
      })
      .returning();
    return created;
  } catch (err) {
    // The database is the source of truth for overlaps: two simultaneous
    // requests cannot both pass, because PostgreSQL rejects the second.
    if (isExclusionViolation(err)) {
      throw new DomainError(
        "CONFLICT",
        "This resource is already booked for that time",
      );
    }
    throw err;
  }
}

export async function cancelReservation(
  actor: Actor,
  reservationId: string,
  now: Date = new Date(),
) {
  const [existing] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId));
  if (!existing) throw new DomainError("NOT_FOUND", "Reservation not found");

  if (actor.role !== "ADMIN" && existing.userId !== actor.id) {
    throw new DomainError("FORBIDDEN", "You can only cancel your own bookings");
  }
  if (existing.status === "CANCELLED") {
    throw new DomainError("ALREADY_CANCELLED", "Reservation is already cancelled");
  }
  if (existing.endAt < now) {
    throw new DomainError("PAST_BOOKING", "Past reservations cannot be cancelled");
  }

  // Soft cancel keeps history for usage reporting and frees the time slot.
  const [updated] = await db
    .update(reservations)
    .set({ status: "CANCELLED", updatedAt: now })
    .where(eq(reservations.id, reservationId))
    .returning();
  return updated;
}

export type ReservationFilters = {
  resourceId?: string;
  userId?: string;
  status?: "CONFIRMED" | "CANCELLED";
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
};

export async function listReservations(f: ReservationFilters = {}) {
  const conditions: SQL[] = [];
  if (f.resourceId) conditions.push(eq(reservations.resourceId, f.resourceId));
  if (f.userId) conditions.push(eq(reservations.userId, f.userId));
  if (f.status) conditions.push(eq(reservations.status, f.status));
  // Overlap-with-window semantics: reservation intersects [from, to).
  if (f.from) conditions.push(gt(reservations.endAt, f.from));
  if (f.to) conditions.push(lt(reservations.startAt, f.to));

  return db
    .select({
      id: reservations.id,
      title: reservations.title,
      notes: reservations.notes,
      startAt: reservations.startAt,
      endAt: reservations.endAt,
      status: reservations.status,
      resourceId: reservations.resourceId,
      resourceName: resources.name,
      userId: reservations.userId,
      userName: users.name,
    })
    .from(reservations)
    .innerJoin(resources, eq(resources.id, reservations.resourceId))
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(f.order === "desc" ? desc(reservations.startAt) : asc(reservations.startAt))
    .limit(Math.min(f.limit ?? 50, 200))
    .offset(f.offset ?? 0);
}

/** Confirmed bookings for one resource in a window — drives the availability calendar. */
export function getAvailability(resourceId: string, from: Date, to: Date) {
  return listReservations({
    resourceId,
    status: "CONFIRMED",
    from,
    to,
    limit: 200,
  });
}
