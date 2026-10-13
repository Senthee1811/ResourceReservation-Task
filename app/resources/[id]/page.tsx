import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, listAllUsers } from "@/lib/auth";
import { getResource } from "@/lib/resource-service";
import { getAvailability } from "@/lib/reservation-service";
import {
  addDays,
  formatDate,
  formatDateKey,
  parseLocalInput,
  startOfDayColombo,
} from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CalendarContainer } from "./calendar-container";
import { DomainError } from "@/lib/errors";

export const instant = false;

interface ResourceDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    date?: string;
    view?: "day" | "week";
    booked?: string;
  }>;
}

export default async function ResourceDetailsPage({
  params,
  searchParams,
}: ResourceDetailsPageProps) {
  const currentUser = await requireUser();
  const allUsers = currentUser.role === "ADMIN" ? await listAllUsers() : [];
  const { id } = await params;
  const { date: rawDate, view: rawView, booked } = await searchParams;

  const now = new Date();
  const defaultDateStr = formatDateKey(now);
  const selectedDateStr = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : defaultDateStr;
  const viewMode = rawView === "week" ? "week" : "day";

  let resource;
  try {
    resource = await getResource(id);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  // Calculate window bounds in UTC
  const selectedDate = parseLocalInput(`${selectedDateStr}T00:00`);
  const windowStart = startOfDayColombo(selectedDate);
  const windowEnd = addDays(windowStart, viewMode === "week" ? 7 : 1);

  // Fetch confirmed reservations for availability timeline
  const rawReservations = await getAvailability(id, windowStart, windowEnd);

  // Compute navigation dates
  const stepDays = viewMode === "week" ? 7 : 1;
  const prevDateStr = formatDateKey(addDays(selectedDate, -stepDays));
  const nextDateStr = formatDateKey(addDays(selectedDate, stepDays));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Success Booking Notice */}
      {booked === "true" && (
        <Alert variant="success" title="Booking Confirmed!" className="mb-6">
          Your reservation has been successfully booked and confirmed. It is now reserved on the timeline below.
        </Alert>
      )}

      {/* Inactive Resource Notice */}
      {!resource.isActive && (
        <Alert variant="warning" title="Resource Currently Deactivated" className="mb-6">
          This resource is marked as inactive by an administrator and cannot accept new bookings.
        </Alert>
      )}

      {/* Resource Header */}
      <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                {resource.name}
              </h1>
              <Badge variant="info">{resource.type}</Badge>
              <Badge variant={resource.isActive ? "success" : "danger"}>
                {resource.isActive ? "Active" : "Deactivated"}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span>Capacity: <strong>{resource.capacity}</strong> persons</span>
              </div>

              {resource.location && (
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>Location: <strong>{resource.location}</strong></span>
                </div>
              )}
            </div>

            {resource.description && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                {resource.description}
              </p>
            )}
          </div>

          <Link href="/resources">
            <Button variant="outline" size="sm">
              ← Back to Resources
            </Button>
          </Link>
        </div>
      </div>

      {/* Date & View Controls Toolbar */}
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Link
            href={`/resources/${id}?date=${prevDateStr}&view=${viewMode}`}
            className="inline-flex"
          >
            <Button variant="outline" size="sm" aria-label="Previous Period">
              ← Prev
            </Button>
          </Link>

          <Link
            href={`/resources/${id}?date=${defaultDateStr}&view=${viewMode}`}
            className="inline-flex"
          >
            <Button variant="secondary" size="sm">
              Today
            </Button>
          </Link>

          <Link
            href={`/resources/${id}?date=${nextDateStr}&view=${viewMode}`}
            className="inline-flex"
          >
            <Button variant="outline" size="sm" aria-label="Next Period">
              Next →
            </Button>
          </Link>

          <span className="ml-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatDate(selectedDate)}
            {viewMode === "week" && ` – ${formatDate(addDays(selectedDate, 6))}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Date Picker Form */}
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="view" value={viewMode} />
            <input
              type="date"
              name="date"
              defaultValue={selectedDateStr}
              aria-label="Select date"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <Button type="submit" variant="ghost" size="sm">
              Go
            </Button>
          </form>

          {/* Day / Week View Toggle */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <Link
              href={`/resources/${id}?date=${selectedDateStr}&view=day`}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "day"
                  ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Day
            </Link>
            <Link
              href={`/resources/${id}?date=${selectedDateStr}&view=week`}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "week"
                  ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Week
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content: Calendar Timeline & Booking Form */}
      <CalendarContainer
        resourceId={id}
        resourceName={resource.name}
        selectedDateStr={selectedDateStr}
        viewMode={viewMode}
        bookings={rawReservations}
        isAdmin={currentUser.role === "ADMIN"}
        userList={allUsers}
      />
    </div>
  );
}
