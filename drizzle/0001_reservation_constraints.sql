-- Custom migration: database-level integrity rules for reservations.
-- These cannot be expressed in the ORM schema, so they are hand-written.

CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

-- A reservation must end after it starts.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_valid_range" CHECK ("end_at" > "start_at");--> statement-breakpoint

-- No two CONFIRMED reservations for the same resource may overlap in time.
-- Half-open range '[)' means a 09:00-10:00 booking and a 10:00-11:00 booking
-- do NOT conflict. Cancelled reservations are excluded, so a cancelled slot
-- can be re-booked. Because this is enforced by PostgreSQL itself, two
-- simultaneous requests cannot both succeed (the second raises SQLSTATE 23P01).
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "resource_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE ("status" = 'CONFIRMED');
