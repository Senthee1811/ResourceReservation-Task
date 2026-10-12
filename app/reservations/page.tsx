import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listReservations } from "@/lib/reservation-service";
import { formatDate, formatTime } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CancelReservationButton } from "./cancel-button";

export const instant = false;

interface ReservationsPageProps {
  searchParams: Promise<{
    tab?: "upcoming" | "history";
  }>;
}

export default async function ReservationsPage({
  searchParams,
}: ReservationsPageProps) {
  const user = await requireUser();
  const { tab = "upcoming" } = await searchParams;

  const now = new Date();
  const allUserReservations = await listReservations({
    userId: user.id,
    limit: 200,
  });

  // Partition into Upcoming and Past/Cancelled
  const upcoming = allUserReservations
    .filter((r) => r.status === "CONFIRMED" && r.endAt > now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const pastAndCancelled = allUserReservations
    .filter((r) => r.status === "CANCELLED" || r.endAt <= now)
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  const activeTab = tab === "history" ? "history" : "upcoming";
  const displayList = activeTab === "upcoming" ? upcoming : pastAndCancelled;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="My Reservations"
        description="View and manage your upcoming bookings and review your past activity."
        action={
          <Link href="/resources">
            <Button variant="primary">
              <svg
                className="mr-1.5 -ml-0.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Book a Resource
            </Button>
          </Link>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/reservations?tab=upcoming"
          className={`relative pb-3.5 px-4 text-sm font-semibold transition-colors ${
            activeTab === "upcoming"
              ? "text-slate-900 border-b-2 border-slate-900 dark:text-slate-100 dark:border-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Upcoming Bookings
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {upcoming.length}
          </span>
        </Link>

        <Link
          href="/reservations?tab=history"
          className={`relative pb-3.5 px-4 text-sm font-semibold transition-colors ${
            activeTab === "history"
              ? "text-slate-900 border-b-2 border-slate-900 dark:text-slate-100 dark:border-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Past & Cancelled
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {pastAndCancelled.length}
          </span>
        </Link>
      </div>

      {/* Reservation List */}
      {displayList.length === 0 ? (
        <EmptyState
          title={
            activeTab === "upcoming"
              ? "No upcoming reservations"
              : "No past or cancelled reservations"
          }
          description={
            activeTab === "upcoming"
              ? "You do not have any confirmed future bookings scheduled at the moment."
              : "Your reservation history is currently empty."
          }
          action={
            activeTab === "upcoming" && (
              <Link href="/resources">
                <Button variant="primary">Browse Available Resources</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {displayList.map((reservation) => {
            const isConfirmed = reservation.status === "CONFIRMED";
            const isUpcoming = isConfirmed && reservation.endAt > now;
            const isCompleted = isConfirmed && reservation.endAt <= now;

            return (
              <Card
                key={reservation.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                      {reservation.title}
                    </h3>
                    {isUpcoming && <Badge variant="success">Confirmed</Badge>}
                    {isCompleted && <Badge variant="neutral">Completed</Badge>}
                    {reservation.status === "CANCELLED" && (
                      <Badge variant="danger">Cancelled</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <Link
                      href={`/resources/${reservation.resourceId}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100 flex items-center gap-1"
                    >
                      <svg
                        className="h-3.5 w-3.5 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                      {reservation.resourceName}
                    </Link>

                    <span>•</span>

                    <span>
                      {formatDate(reservation.startAt)}, {formatTime(reservation.startAt)} – {formatTime(reservation.endAt)} (Colombo Time)
                    </span>
                  </div>

                  {reservation.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                      Notes: {reservation.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/resources/${reservation.resourceId}`}>
                    <Button variant="ghost" size="sm">
                      View Resource
                    </Button>
                  </Link>

                  {isUpcoming && (
                    <CancelReservationButton
                      reservationId={reservation.id}
                      reservationTitle={reservation.title}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
