# Architectural & Technical Decisions Log

- **Phase 0 (Database Isolation):** Configured Vitest `globalSetup` to automatically provision, migrate, and target an isolated `reservation_test` database, preventing tests from truncating development seed data.
- **Phase 0 (Form Boolean Handling):** Replaced `z.coerce.boolean()` with explicit checkbox handling (`"on"`/`"true"`/`true` => true, absent/falsy => false) to prevent the known bug where string `"false"` coerced to `true`.
- **Phase 0 (Timezone Standardization):** Pinned system timezone display and local input parsing to `Asia/Colombo` (UTC+05:30, no DST) in `lib/datetime.ts` while storing UTC in PostgreSQL (`timestamptz`).
- **Phase 0 (Domain Services):** Centralized resource business rules in `lib/resource-service.ts` and reservation rules in `lib/reservation-service.ts`, enforcing server-side authorization and mapping PostgreSQL `23505` to friendly conflict errors.
- **Phase 1 (Session Strategy):** Implemented signed JWT sessions (`jose` HS256) stored in `httpOnly, SameSite=Lax, Secure-in-production` cookies, with `requireUser()` re-verifying the active user against PostgreSQL so role changes take effect immediately.
- **Phase 1 (In-Memory Throttle Trade-off):** Implemented an in-memory 5-attempt/10-minute throttle per email for failed logins to prevent brute force while avoiding external Redis dependencies for assessment simplicity.
- **Phase 2 (Design System):** Built a lightweight, accessible UI component kit in Tailwind CSS without third-party component libraries or calendar packages, guaranteeing zero dependency bloat and straightforward code explainability.
