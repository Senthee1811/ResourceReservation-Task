# Resource Reservation Management System

A web app for an organization to manage shared resources (rooms, labs, equipment, vehicles) and book them without double-booking.

> Built for the PrimeWave Lab Software Engineering Internship technical assessment.

## How I interpreted the problem

The scenario's pain points are *overlapping reservations*, *uncertainty about availability*, and *reliability as usage grows*. So the design priorities are:

1. **Double-booking must be impossible**, not just unlikely. Overlap prevention is enforced by PostgreSQL itself.
2. **Availability must be visible** per resource (calendar) and per person ("my reservations").
3. **Roles**: admins manage resources and see everything; members book and cancel their own reservations.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Database | PostgreSQL 16 (Docker Compose) |
| ORM / migrations | Drizzle ORM + SQL migrations |
| Validation | Zod |
| Auth | bcrypt password hashes + signed JWT session cookie (`jose`) |
| Tests | Vitest (integration tests against real PostgreSQL) |

## Key engineering decisions

- **Overlap prevention in the database.** A PostgreSQL exclusion constraint (`btree_gist` + `tstzrange`) rejects overlapping `CONFIRMED` reservations for the same resource. Application-level checks have a race condition (two requests can both pass the check, then both insert). The constraint cannot be raced; the service catches SQLSTATE `23P01` and returns a friendly message. See `drizzle/0001_reservation_constraints.sql`.
- **Half-open time ranges `[start, end)`** so 09:00-10:00 and 10:00-11:00 do not conflict.
- **Soft cancellation** (`status = CANCELLED`) preserves history for usage reporting, and the partial constraint (`WHERE status = 'CONFIRMED'`) frees the slot immediately.
- **UTC storage (`timestamptz`)**, displayed in the user's local time (Asia/Colombo for the demo).
- **Service layer** (`lib/reservation-service.ts`) holds all business rules; UI and routes stay thin.
- **Business rules:** no past bookings, max 8 hours per booking, inactive resources can't be booked, members can only cancel their own bookings (admins can cancel any).
- **Indexes** on `(resource_id, start_at)`, `(user_id)`, `(status, start_at)` for calendar and listing queries; list queries are paginated.

## Data model

```
users(id, name, email UNIQUE, password_hash, role, created_at)
resources(id, name UNIQUE, type, capacity, location, description, is_active, created_at)
reservations(id, resource_id -> resources, user_id -> users, title, notes,
             start_at, end_at, status, created_at, updated_at)
  CHECK (end_at > start_at)
  EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)
    WHERE (status = 'CONFIRMED')
```

ER diagram: _add shareable link here_

## Getting started

**Prerequisites:** Node.js 20+, Docker (for PostgreSQL).

```bash
git clone <this-repo-url> && cd resource-reservation
cp .env.example .env            # then set SESSION_SECRET
docker compose up -d            # starts PostgreSQL on localhost:5433
npm install
npm run db:setup                # applies migrations + seeds demo data
npm run dev                     # http://localhost:3000
```

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | Admin@123 |
| Member | member@example.com | Member@123 |

### Tests

```bash
npm test
```

The tests are integration tests against the real database (the exclusion constraint is the thing being tested), so PostgreSQL must be running. **They truncate all tables**, so run `npm run db:seed` afterwards to restore demo data, or point `DATABASE_URL` at a separate database.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:seed` | Insert demo users and resources (idempotent) |
| `npm run db:generate` | Generate a migration after editing `lib/db/schema.ts` |
| `npm test` | Run the test suite |
| `npm run typecheck` | TypeScript check |

## Assumptions and trade-offs

- Resources are generic (name, type, capacity, location) so the same model fits rooms, equipment, and vehicles.
- No approval workflow, recurring bookings, or notifications; out of scope for a focused exercise.
- Prisma was my first choice, but Drizzle was used to keep the toolchain pure npm with plain SQL migrations.

## Project structure

```
app/                     Next.js routes and UI
lib/db/                  schema + connection
lib/reservation-service.ts   business rules and conflict handling
lib/validators.ts        Zod schemas
drizzle/                 SQL migrations (incl. hand-written constraints)
scripts/                 migrate + seed
tests/                   integration tests
```
