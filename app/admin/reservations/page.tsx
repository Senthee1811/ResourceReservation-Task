import Link from "next/link";
import { requireAdmin, listAllUsers } from "@/lib/auth";
import { listResources } from "@/lib/resource-service";
import {
  countReservations,
  listReservations,
  type ReservationFilters,
} from "@/lib/reservation-service";
import { adminReservationFilterSchema } from "@/lib/validators";
import {
  formatDate,
  formatTime,
  parseLocalInput,
} from "@/lib/datetime";
import { cancelReservationAction } from "@/app/actions/reservation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";

export const instant = false;

const PAGE_SIZE = 20;

interface AdminReservationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminReservationsPage({
  searchParams,
}: AdminReservationsPageProps) {
  await requireAdmin();
  const rawParams = await searchParams;

  // Flatten searchParams
  const paramsObj: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") paramsObj[k] = v;
    else if (Array.isArray(v) && v[0]) paramsObj[k] = v[0];
  }

  // Validate filter params with Zod (ignoring invalid params rather than crashing)
  const filters = adminReservationFilterSchema.parse(paramsObj);

  // Compute UTC date boundaries for Colombo date range
  let fromUtc: Date | undefined;
  let toUtc: Date | undefined;
  if (filters.from) {
    try {
      fromUtc = parseLocalInput(`${filters.from}T00:00:00`);
    } catch {
      fromUtc = undefined;
    }
  }
  if (filters.to) {
    try {
      toUtc = parseLocalInput(`${filters.to}T23:59:59`);
    } catch {
      toUtc = undefined;
    }
  }

  const queryFilters: ReservationFilters = {
    resourceId: filters.resourceId,
    userId: filters.userId,
    status: filters.status === "ALL" ? undefined : filters.status,
    from: fromUtc,
    to: toUtc,
    order: "desc",
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  };

  const [reservationList, totalCount, allResources, allUsers] =
    await Promise.all([
      listReservations(queryFilters),
      countReservations(queryFilters),
      listResources(),
      listAllUsers(),
    ]);

  const now = new Date();

  // Helper to generate page URL while retaining active filters
  const createPageUrl = (newPage: number) => {
    const sp = new URLSearchParams();
    if (filters.resourceId) sp.set("resourceId", filters.resourceId);
    if (filters.userId) sp.set("userId", filters.userId);
    if (filters.status && filters.status !== "ALL") sp.set("status", filters.status);
    if (filters.from) sp.set("from", filters.from);
    if (filters.to) sp.set("to", filters.to);
    sp.set("page", String(newPage));
    return `/admin/reservations?${sp.toString()}`;
  };

  const currentUrl = createPageUrl(filters.page);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="All Reservations"
        description="Filter, inspect, and manage bookings across the entire organization."
      />

      {/* Filter Toolbar */}
      <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
          {/* Resource Filter */}
          <div>
            <label htmlFor="filter-resource" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Resource
            </label>
            <select
              id="filter-resource"
              name="resourceId"
              defaultValue={filters.resourceId || ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All Resources</option>
              {allResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label htmlFor="filter-user" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              User
            </label>
            <select
              id="filter-user"
              name="userId"
              defaultValue={filters.userId || ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All Users</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="filter-status" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              id="filter-status"
              name="status"
              defaultValue={filters.status || "ALL"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label htmlFor="filter-from" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              From Date
            </label>
            <input
              id="filter-from"
              type="date"
              name="from"
              defaultValue={filters.from || ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* To Date */}
          <div>
            <label htmlFor="filter-to" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              To Date
            </label>
            <input
              id="filter-to"
              type="date"
              name="to"
              defaultValue={filters.to || ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" className="w-full">
              Apply Filters
            </Button>
            <Link href="/admin/reservations">
              <Button type="button" variant="outline" size="sm">
                Reset
              </Button>
            </Link>
          </div>
        </form>
      </div>

      {/* Results Table */}
      {reservationList.length === 0 ? (
        <EmptyState
          title="No reservations found"
          description="No bookings match your current filter criteria."
          action={
            <Link href="/admin/reservations">
              <Button variant="outline">Clear Filters</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0 border-slate-200 shadow-2xs dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Title & Notes
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Resource
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Booked By
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Date & Time (Colombo)
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {reservationList.map((res) => {
                  const isConfirmed = res.status === "CONFIRMED";
                  const isUpcoming = isConfirmed && res.endAt > now;

                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div>{res.title}</div>
                        {res.notes && (
                          <div className="text-xs font-normal text-slate-500 line-clamp-1 max-w-xs">
                            {res.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/resources/${res.resourceId}`}
                          className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {res.resourceName}
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {res.userName}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                        <div>{formatDate(res.startAt)}</div>
                        <div className="font-mono text-slate-500">
                          {formatTime(res.startAt)} – {formatTime(res.endAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            res.status === "CANCELLED"
                              ? "danger"
                              : isUpcoming
                              ? "success"
                              : "neutral"
                          }
                        >
                          {res.status === "CANCELLED"
                            ? "Cancelled"
                            : isUpcoming
                            ? "Confirmed"
                            : "Completed"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isUpcoming ? (
                          <form
                            action={cancelReservationAction}
                            className="inline"
                          >
                            <input type="hidden" name="reservationId" value={res.id} />
                            <input type="hidden" name="returnUrl" value={currentUrl} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              Cancel Booking
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={filters.page}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            createPageUrl={createPageUrl}
          />
        </Card>
      )}
    </div>
  );
}
