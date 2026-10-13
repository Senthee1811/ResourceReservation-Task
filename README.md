# Resource Reservation Management System

A centralized, full-stack web application designed for organizations to organize shared resources (rooms, labs, equipment, vehicles), coordinate reservations, and inspect availability and utilization without scheduling confusion or double-bookings.

---

## How I Interpreted the Problem

Shared organizational asset scheduling suffers from three primary failure modes:
1. **Double-booking and Race Conditions:** Application-level validation checks (e.g. `SELECT` then `INSERT`) have inherent race windows under concurrent traffic where two users book the same slot simultaneously.
2. **Scheduling Uncertainty & Timezone Confusion:** Users struggle to visualize availability gaps and often encounter timezone drift when UTC dates shift across local midnight boundaries.
3. **Operational Bottlenecks as Organizations Scale:** Lack of centralized oversight makes tracking resource utilization, cancellations, and capacity bottlenecks difficult.

### Architectural Priorities
- **The database is the ultimate single source of truth:** Overlap prevention is enforced directly in PostgreSQL via a GiST exclusion constraint (`btree_gist`). Application-level pre-checks exist solely to provide friendly, immediate UI feedback.
- **Fixed timezone normalization:** Store all timestamps in UTC (`timestamptz`), but standardize all local parsing, calendar projection, and business hour calculations to `Asia/Colombo` (UTC+05:30, no daylight saving time).
- **Service-driven domain architecture:** All business rules reside strictly in `lib/*-service.ts`. Server actions and API routes act as thin controllers that authenticate, validate with Zod, and delegate execution.

---

## Feature List

### 1. Resource Catalog & Organization
- **Public & Member Browsing (`/resources`):** Real-time search by resource name and category filtering (`Room`, `Lab`, `Equipment`, `Vehicle`).
- **Resource Details & Capacity:** Displays capacity, location, and description tags for all active organizational assets.
- **Admin Resource Management (`/admin/resources`):** Full CRUD for resources (Create, Edit, Deactivate/Activate).
- **Safe Soft Deactivation:** Resources with reservation history cannot be deleted. Deactivating hides them from members and prevents future bookings while preserving upcoming and historical records. Administrators are presented with a warning count of upcoming bookings.

### 2. Interactive Availability Calendar & Booking (`/resources/[id]`)
- **Day View Timeline (07:00 – 21:00 Colombo):** Real-time vertical timeline showing confirmed bookings with title, time range, and booker name.
- **Week View Toggle:** 7-column multi-day overview for weekly planning.
- **Current Time Indicator:** Visual marker indicating the current local time in Colombo.
- **One-Click Prefill:** Clicking any unoccupied hour slot on the timeline automatically prefills the booking form with start and end times.
- **Conflict Prevention & Live Rules:** Rejects overlapping slots, past times, and bookings longer than 8 hours. Preserves user input upon conflict rejection with clear feedback.
- **Double-Submit Protection:** Form submission button is disabled and shows a spinner while the server action is pending.

### 3. Member Reservation Dashboard (`/reservations`)
- **Upcoming Bookings:** Chronologically sorted upcoming reservations with status badges and resource details.
- **Past & Cancelled Activity:** Historical activity log for reference.
- **Self-Service Cancellation:** Members can cancel their own upcoming bookings with an inline confirmation dialog. Cancellation frees the calendar slot immediately while keeping the audit record.

### 4. Admin Centralized Reservation Ledger (`/admin/reservations`)
- **Multi-Attribute Filters:** Filter by Resource, User, Status (`CONFIRMED`, `CANCELLED`, `ALL`), and Colombo Date Range (`From` / `To`).
- **Shareable URL Query State:** Filter states and pagination sync directly with URL parameters for bookmarking and sharing.
- **Server-Side Pagination:** 20 records per page with total reservation counts and responsive page navigation.
- **Administrative Override:** Administrators can cancel any reservation regardless of ownership.

### 5. Resource Usage & Analytics (`/admin/usage`)
- **Configurable Range Selector:** 7-day, 30-day, and 90-day analytics windows.
- **SQL Aggregation (Zero JS In-Memory Loops):**
  - **Utilization %:** Calculated as `(Booked Hours / (Operating Hours per Day × Days)) × 100` against an organizational benchmark of 08:00 – 18:00 Colombo (10 hours/day). Bookings spanning window boundaries are clipped via PostgreSQL `LEAST`/`GREATEST` epoch math.
  - **CSS Bar Visuals:** Utilization progress bars color-coded by load (emerald, amber, rose) without heavy third-party chart libraries.
  - **Top 5 Most-Booked Assets:** Ranked by reservation volume and booked hours.
  - **Cancellation Rate:** Calculated across total bookings created within the selected window.
  - **Busiest Weekday:** Computed using timezone-aware `TO_CHAR(start_at AT TIME ZONE 'Asia/Colombo', 'Day')`.

---

## Tech Stack & Rationale

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router) + React 19** | Server Actions eliminate boilerplate API routes; Partial Prerendering (PPR) and streaming deliver instant navigation. |
| **Language** | **TypeScript (Strict Mode)** | End-to-end type safety across database schemas, service models, and client components. |
| **Styling** | **Tailwind CSS v4** | Lightweight utility-first styling with custom UI components, responsive layouts, and dark mode support without UI kit bloat. |
| **Database** | **PostgreSQL 16 (Docker)** | Enterprise ACID compliance; native support for `btree_gist` exclusion constraints, range types (`tstzrange`), and rich SQL analytics. |
| **ORM / Migrations** | **Drizzle ORM + Plain SQL Migrations** | Type-safe query building with zero runtime overhead; plain SQL migrations allow expressing custom PostgreSQL constraints (`EXCLUDE USING gist`) cleanly. |
| **Validation** | **Zod** | Runtime input validation on all form submissions, URL search parameters, and domain mutations. |
| **Authentication** | **jose (HS256) + bcryptjs** | Stateless signed JWT stored in `httpOnly, SameSite=Lax, Secure-in-production` cookies, re-verified against live database records on every request. |
| **Testing** | **Vitest** | Fast integration testing against a dedicated, isolated test database (`reservation_test`). |

---

## Key Architectural & Engineering Decisions

1. **Database-Level Exclusion Constraint (`btree_gist`):**
   In `drizzle/0001_reservation_constraints.sql`, reservations enforce:
   ```sql
   ALTER TABLE "reservations"
     ADD CONSTRAINT "reservations_no_overlap"
     EXCLUDE USING gist (
       "resource_id" WITH =,
       tstzrange("start_at", "end_at", '[)') WITH &&
     ) WHERE ("status" = 'CONFIRMED');
   ```
   This prevents concurrent double-bookings at the storage engine level. When a conflict occurs, PostgreSQL raises error code `23P01`, which `lib/reservation-service.ts` catches and maps to a clean `DomainError("CONFLICT")`.
2. **Half-Open Ranges `[start, end)`:**
   Using half-open interval semantics allows contiguous reservations without artificial buffer gaps. A booking from 09:00 to 10:00 and another from 10:00 to 11:00 do not overlap.
3. **UTC Storage with Asia/Colombo Display:**
   All dates are stored as UTC `timestamptz`. In `lib/datetime.ts`, dates are converted to/from `Asia/Colombo` (+05:30) via native `Intl.DateTimeFormat`. A reservation made for 00:30 Colombo correctly spans across the prior UTC day without date-shifting anomalies.
4. **Soft Cancellation (`status = CANCELLED`):**
   Reservations are never deleted. Updating status to `CANCELLED` preserves audit history for utilization reporting, while the partial constraint index (`WHERE status = 'CONFIRMED'`) immediately releases the time slot for other users.
5. **Decoupled Service Layer:**
   All business logic lives inside `lib/reservation-service.ts`, `lib/resource-service.ts`, and `lib/usage-service.ts`. Server actions and pages only parse input, check authorization, call services, and handle error presentation.
6. **Optimized Indexes & Query Execution:**
   - `reservations_resource_start_idx (resource_id, start_at)`: Powers the availability timeline and calendar lookups.
   - `reservations_user_idx (user_id)`: Accelerates member dashboard queries.
   - `reservations_status_start_idx (status, start_at)`: Powers admin date filtering and usage analytics.
   - *Index verification:* Benchmarked via `EXPLAIN ANALYZE` on a dataset of 5,000 reservations (`scripts/seed-bulk.ts`), confirming Index Scans executing in 0.063ms.

---

## Data Model

```
Table: users
- id: uuid (PK, default: gen_random_uuid())
- name: text
- email: text (UNIQUE)
- password_hash: text
- role: roleEnum ('ADMIN', 'MEMBER')
- created_at: timestamptz

Table: resources
- id: uuid (PK, default: gen_random_uuid())
- name: text (UNIQUE)
- type: text (Index: resources_type_idx)
- capacity: integer
- location: text
- description: text
- is_active: boolean
- created_at: timestamptz

Table: reservations
- id: uuid (PK, default: gen_random_uuid())
- resource_id: uuid (FK -> resources.id, ON DELETE RESTRICT)
- user_id: uuid (FK -> users.id, ON DELETE RESTRICT)
- title: text
- notes: text
- start_at: timestamptz
- end_at: timestamptz
- status: reservationStatusEnum ('CONFIRMED', 'CANCELLED')
- created_at: timestamptz
- updated_at: timestamptz

Constraints:
- CHECK (end_at > start_at)
- EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE (status = 'CONFIRMED')

Indexes:
- (resource_id, start_at)
- (user_id)
- (status, start_at)
```

The database diagram source is available in [docs/er-diagram.dbml](docs/er-diagram.dbml) and can be visualized at [dbdiagram.io](https://dbdiagram.io).

---

## How to Run the Application

### Prerequisites
- **Node.js:** v20.x or higher
- **Docker Desktop & Docker Compose:** for PostgreSQL 16
- **npm:** v10.x or higher

---

### Quick Start (Local Development)

Run the following commands from the repository root:

```bash
# 1. Start the PostgreSQL 16 database in Docker (listens on host port 5433)
docker compose up -d

# 2. Configure environment variables (if not already present)
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Apply database migrations & seed demo accounts
npm run db:setup

# 5. Start the Next.js local development server
npm run dev
```

Once started, open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### Running in Production Mode

To test or run the optimized production bundle locally:

```bash
# Build the production application
npm run build

# Start the production server on port 3000
npm run start
```

---

### Database & Docker Management

| Action | Command |
| :--- | :--- |
| **Start database container** | `docker compose up -d` |
| **Check container health & status** | `docker compose ps` |
| **View database logs** | `docker compose logs -f db` |
| **Stop database container** | `docker compose down` |
| **Fresh database reset (wipe volume & reseed)** | `docker compose down -v && docker compose up -d && npm run db:setup` |
| **Re-seed demo accounts only** | `npm run db:seed` |
| **Seed 5,000 reservations (benchmark)** | `npm run db:seed-bulk` |

---

### Cloud Deployment (Vercel)

To deploy on [Vercel](https://vercel.com):
1. Create a free cloud PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com) (both natively support the required `btree_gist` extension).
2. Run migrations and seed from your local terminal against the cloud database:
   ```bash
   DATABASE_URL="your-neon-or-supabase-connection-string" npm run db:setup
   ```
3. In your Vercel Project Settings, add the environment variables:
   - `DATABASE_URL`: Cloud PostgreSQL connection string (`postgresql://...@...neon.tech/...`)
   - `SESSION_SECRET`: A long secure random string (`openssl rand -base64 32`)
4. Trigger deploy.

---

## Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@example.com` | `Admin@123` | Full access: Resource CRUD, all reservations, overrides, usage analytics |
| **Member** | `member@example.com` | `Member@123` | Browse resources, view availability, book slots, cancel own reservations |

---

## Running Tests

Integration tests run against an **isolated test database** (`reservation_test`). A Vitest `globalSetup` script automatically provisions `reservation_test` on startup and applies all migrations, preventing test execution from truncating development data.

```bash
# Run all integration and unit tests
npm test

# Run tests once with full output
npx vitest run

# Run complete quality gate (typecheck, lint, test, build)
npm run typecheck && npm run lint && npm test && npm run build
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server on port 3000 |
| `npm run build` | Builds optimized production bundle |
| `npm run start` | Starts production server |
| `npm run db:setup` | Runs migrations and seeds standard demo accounts and resources |
| `npm run db:migrate` | Applies pending SQL migrations via Drizzle |
| `npm run db:seed` | Seeds demo accounts and sample resources |
| `npm run db:seed-bulk` | Seeds 5,000 non-overlapping reservations for performance benchmarking |
| `npm run typecheck` | Validates TypeScript types across the entire project |
| `npm run lint` | Runs ESLint rules |
| `npm test` | Executes Vitest test suite |

---

## Assumptions & Trade-offs

1. **In-Memory Login Throttling:**
   Failed login attempts are throttled after 5 consecutive failures per 10 minutes using an in-memory sliding window map. This avoids adding an external Redis dependency for assessment simplicity. In a multi-replica production deployment, this would be backed by Redis.
2. **Minimal Dependency Principle:**
   Rather than importing third-party UI libraries or heavy calendar packages (e.g. FullCalendar), custom Tailwind components and a pure timeline layout engine (`lib/calendar-layout.ts`) were hand-built. This eliminates bundle bloat and ensures every line of code is explainable in a technical review.
3. **Soft Resource Deactivation vs Deletion:**
   Hard-deleting resources breaks historical reservation integrity and analytics. Deactivating resources preserves all past records and ongoing analytics while preventing new bookings.
4. **Rescheduling Model:**
   Rescheduling is modeled as cancelling and rebooking. This maintains atomic exclusion checks without complex multi-slot mutation transactions.

---

## What I Would Add Next

- **Recurring Bookings:** Supporting daily, weekly, or custom recurrence rules (RRULE) with conflict-detection preflight reports across the entire series.
- **Approval Workflows:** Multi-tiered approval queues for high-value resources (e.g., specialized lab equipment or organizational vehicles) requiring manager sign-off.
- **Automated Email & Push Notifications:** Notification dispatch for booking confirmations, 24-hour reminders, and cancellation alerts using transactional email (e.g. Resend / SendGrid).
- **Per-Team Resource Ownership:** Resource groupings with granular team permissions (e.g., Engineering vs Operations access).
- **Audit Logging:** An immutable append-only event log capturing every reservation creation, override, and cancellation with actor IP and user-agent metadata.
- **Distributed Rate Limiting:** Redis-backed rate limiting and token bucket algorithms for API and action protection under high-concurrency DDoS loads.
