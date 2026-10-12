# 4-Minute Video Demo Script: Resource Reservation Management System

This video script guides a 4-minute technical walkthrough demonstrating the system, its architecture, and the problem it solves.

---

## Overview & Demo Timeline

| Timestamp | Phase | Topic | Key Talking Points |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | Introduction | Problem & Interpretation | Shared organizational asset scheduling chaos; double-bookings; concurrency. |
| **0:30 – 2:30** | Live Demo | End-to-End User Flow | Admin resource creation, member booking, calendar, conflict rejection, cancellation, filters, and usage. |
| **2:30 – 3:45** | Architecture | Key Technical Decisions | DB `EXCLUDE USING gist` constraint, UTC storage with `Asia/Colombo` display, service layer isolation. |
| **3:45 – 4:15** | Summary | Trade-offs & Next Steps | In-memory throttling vs Redis, deactivation vs deletion, recurring bookings roadmap. |

---

## Demo Accounts

- **Administrator:** `admin@example.com` / `Admin@123`
- **Member:** `member@example.com` / `Member@123`

---

## Detailed Script & Click-by-Click Guide

### 0:00 – 0:30 | Problem & Interpretation
- **On Screen:** Application landing page (`/login`).
- **Narrator:**
  > "Welcome. Organizations sharing rooms, labs, vehicles, and equipment frequently struggle with double bookings, scheduling confusion, and lack of visibility.
  > In this technical assessment, I built a high-reliability Resource Reservation System. Our core engineering principle: application-level pre-checks are nice for UX, but **the database is the ultimate single source of truth** for reservation integrity."

---

### 0:30 – 2:30 | Live Walkthrough

#### 1. Admin Adds a Resource (0:30 – 0:50)
- **Action:** Sign in as `admin@example.com` with password `Admin@123`.
- **Navigation:** Click **Admin: Resources** in top navigation, then click **+ Add Resource**.
- **Form Input:**
  - Name: `Electronics Prototyping Lab`
  - Type: `Lab`
  - Capacity: `12`
  - Location: `Engineering Block B, Level 3`
  - Description: `Equipped with oscilloscopes, soldering stations, and signal generators.`
  - Active: Checked (`on`)
- **Action:** Click **Create Resource**.
- **Narrator:**
  > "First, as an Administrator, I create a new shared asset. Notice our role-aware navigation bar immediately unlocks administrative controls. The new resource is saved and immediately visible to the organization."

#### 2. Member Explores & Books (0:50 – 1:20)
- **Action:** Sign out, then sign in as `member@example.com` with `Member@123`.
- **Navigation:** Navigate to **Resources** (`/resources`). Search for `Electronics` or filter by `Lab`.
- **Action:** Click **View Availability** on `Electronics Prototyping Lab`.
- **Action:** Point out the **Day View Timeline** (07:00 – 21:00 in Asia/Colombo time). Switch to **Week View** to demonstrate the 7-day multi-column layout. Switch back to **Day View**.
- **Action:** Click the empty `10:00` slot on the timeline.
  - Notice the booking form automatically prefills `10:00` to `11:00` with today's date!
  - Set Title: `IoT Sensor Testing`
  - Notes: `Testing low-power sensor array.`
- **Action:** Click **Confirm Reservation**.
- **Narrator:**
  > "Now as a regular member, I search for the lab and open its interactive timeline. Times are calculated in Asia/Colombo without DST ambiguities. Clicking any open slot prefills our booking form. Submitting reserves the slot and renders a green block on the timeline."

#### 3. Conflicting Booking Is Rejected (1:20 – 1:45)
- **Action:** Stay on the same resource page. Attempt to book an overlapping time slot:
  - Title: `Conflicting Hardware Session`
  - Start Time: `10:30` (overlapping with the existing `10:00 - 11:00` booking)
  - End Time: `11:30`
- **Action:** Click **Confirm Reservation**.
- **On Screen:** The form button disables while pending, double-submit is blocked, and an alert appears:
  - *"This resource is already booked for that time"*
  - The user's input in the form is preserved!
- **Narrator:**
  > "Watch what happens if someone attempts an overlapping booking—even a partial overlap like 10:30 to 11:30. The system rejects it immediately with a clear conflict message and keeps the user's input intact. This is backed by PostgreSQL's GiST exclusion constraint, meaning even ten simultaneous requests at the exact same millisecond cannot double-book."

#### 4. Member Cancels Own Reservation (1:45 – 2:05)
- **Navigation:** Click **My reservations** in the navigation bar.
- **Action:** Notice `IoT Sensor Testing` is listed under the **Upcoming Bookings** tab.
- **Action:** Click **Cancel Booking**. An inline confirmation appears (`Cancel "IoT Sensor Testing"? Keep / Yes, Cancel`).
- **Action:** Click **Yes, Cancel**. The reservation status updates to `CANCELLED` and moves to the **Past & Cancelled** tab. The slot on the calendar is immediately freed!
- **Narrator:**
  > "Members have self-service control over their upcoming bookings. A cancelled reservation frees the time slot immediately, while preserving the audit record for administrative analytics."

#### 5. Admin Filter Overview & Usage Analytics (2:05 – 2:30)
- **Action:** Sign back in as `admin@example.com`.
- **Navigation:** Navigate to **Admin: Reservations** (`/admin/reservations`).
  - Demonstrate shareable URL query filters: filter by Status (`CONFIRMED`), Resource, or User.
  - Point out server-side pagination (Page Size 20 with total count).
- **Navigation:** Click **Admin: Usage** (`/admin/usage`).
  - Toggle between **Last 7 Days**, **30 Days**, and **90 Days**.
  - Show the KPI cards: Total Confirmed Bookings, Cancellation Rate, Busiest Weekday (Colombo time), Operating Window (08:00–18:00 benchmark).
  - Point out the per-resource utilization percentage bars and Top 5 Most-Booked rankings.
- **Narrator:**
  > "Finally, administrators gain full visibility: a query-filterable reservation ledger supporting server-side pagination on thousands of records, and an executive Usage Dashboard showing real-time utilization % against standard operating hours."

---

### 2:30 – 3:45 | Key Technical Decisions

- **Visual:** Display `drizzle/0001_reservation_constraints.sql` and `lib/usage-service.ts`.
- **Narrator:**
  > "Three core technical decisions define the robustness of this system:
  >
  > 1. **PostgreSQL GiST Exclusion Constraint:** We enforce `EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE (status = 'CONFIRMED')`. Half-open `[)` ranges prevent double-booking at the database engine level, allowing back-to-back bookings (e.g. 10:00-11:00 and 11:00-12:00) without race conditions.
  >
  > 2. **UTC Storage with Fixed Colombo Time Display:** We store all timestamps in PostgreSQL as UTC `timestamptz`. In `lib/datetime.ts`, all calendar layouts, inputs, and weekday calculations are pinned to `Asia/Colombo` (UTC+05:30). A booking at 00:30 Colombo correctly spans across UTC day boundaries without date shifting bugs.
  >
  > 3. **Service Layer Architecture & Server-Side Security:** All business logic lives in `lib/*-service.ts`. Next.js Server Actions and Route handlers are thin controllers that authenticate via `requireUser()` / `requireAdmin()`, validate with Zod, and delegate to domain services. Every action re-verifies user roles from the database so permissions take effect immediately."

---

### 3:45 – 4:15 | Trade-offs & Next Steps

- **Visual:** Display `README.md` and `docs/er-diagram.dbml`.
- **Narrator:**
  > "For this assessment, we prioritized correctness and minimal dependencies:
  > - We avoided bulky third-party UI libraries and calendar packages in favor of clean Tailwind components and pure layout math.
  > - Login throttling uses an in-memory sliding window; for multi-instance production clusters, this would migrate to Redis.
  > - What I would build next: recurring reservations with series management, automated email reminders, and approval workflows for high-demand resources.
  >
  > Thank you for reviewing the Resource Reservation System!"

---

## Re-Seed Verification Checklist Before Recording

Run these commands in terminal prior to recording to ensure a fresh demo state:
```bash
npm run db:setup
```
This resets migrations and inserts clean demo data:
- `admin@example.com` / `Admin@123`
- `member@example.com` / `Member@123`
- Pre-seeded rooms, labs, vehicles, and equipment.
