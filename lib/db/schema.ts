import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "MEMBER"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "CONFIRMED",
  "CANCELLED",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("MEMBER"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull().unique(),
    type: text("type").notNull(),
    capacity: integer("capacity").notNull().default(1),
    location: text("location"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("resources_type_idx").on(t.type)],
);

// The overlap-prevention EXCLUDE constraint and the end_at > start_at CHECK
// cannot be expressed in Drizzle's schema DSL. They live in a hand-written SQL
// migration: drizzle/*_reservation_constraints.sql
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    notes: text("notes"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: reservationStatusEnum("status").notNull().default("CONFIRMED"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reservations_resource_start_idx").on(t.resourceId, t.startAt),
    index("reservations_user_idx").on(t.userId),
    index("reservations_status_start_idx").on(t.status, t.startAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
