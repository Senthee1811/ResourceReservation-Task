# Architectural & Technical Decisions Log

- **Phase 0 (Database Isolation):** Configured Vitest `globalSetup` to automatically provision, migrate, and target an isolated `reservation_test` database, preventing tests from truncating development seed data.
- **Phase 0 (Form Boolean Handling):** Replaced `z.coerce.boolean()` with explicit checkbox handling (`"on"`/`"true"`/`true` => true, absent/falsy => false) to prevent the known bug where string `"false"` coerced to `true`.
- **Phase 0 (Timezone Standardization):** Pinned system timezone display and local input parsing to `Asia/Colombo` (UTC+05:30, no DST) in `lib/datetime.ts` while storing UTC in PostgreSQL (`timestamptz`).
- **Phase 0 (Domain Services):** Centralized resource business rules in `lib/resource-service.ts` and reservation rules in `lib/reservation-service.ts`, enforcing server-side authorization and mapping PostgreSQL `23505` to friendly conflict errors.
