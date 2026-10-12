import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  getUsageSummary,
  OPEN_START_HOUR,
  OPEN_END_HOUR,
  OPEN_HOURS_PER_DAY,
} from "@/lib/usage-service";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const instant = false;

interface AdminUsagePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsagePage({ searchParams }: AdminUsagePageProps) {
  const user = await requireAdmin();
  const rawParams = await searchParams;

  const daysParam = typeof rawParams.days === "string" ? rawParams.days : "30";
  const daysNum = parseInt(daysParam, 10);
  const selectedDays = [7, 30, 90].includes(daysNum) ? daysNum : 30;

  const usage = await getUsageSummary(user, selectedDays);

  const rangeOptions = [
    { label: "Last 7 Days", value: 7 },
    { label: "Last 30 Days", value: 30 },
    { label: "Last 90 Days", value: 90 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Resource Utilization & Analytics"
          description={`Aggregated booking activity and utilization over the last ${selectedDays} days (08:00 - 18:00 Colombo benchmark).`}
        />

        {/* Range Selector */}
        <div
          role="group"
          aria-label="Time range selector"
          className="inline-flex self-start rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
        >
          {rangeOptions.map((opt) => {
            const isActive = selectedDays === opt.value;
            return (
              <Link
                key={opt.value}
                href={`/admin/usage?days=${opt.value}`}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Confirmed Bookings
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {usage.totalConfirmedBookings}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {usage.resources.length} resource{usage.resources.length === 1 ? "" : "s"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Cancellation Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {usage.cancellationRate}%
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {usage.totalCancelledBookings} cancelled booking{usage.totalCancelledBookings === 1 ? "" : "s"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Busiest Weekday
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {usage.busiestWeekday?.dayName || "None"}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {usage.busiestWeekday
              ? `${usage.busiestWeekday.count} confirmed booking${usage.busiestWeekday.count === 1 ? "" : "s"}`
              : "No confirmed reservations"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Capacity Window
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {OPEN_HOURS_PER_DAY} hrs/day
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {String(OPEN_START_HOUR).padStart(2, "0")}:00 – {OPEN_END_HOUR}:00 Colombo ({usage.totalOpenHoursPerResource} hrs max)
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Utilization Table (2 columns wide on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Resource Utilization Breakdown
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Denominator: {usage.totalOpenHoursPerResource} open hrs
            </span>
          </div>

          <Card className="overflow-hidden">
            {usage.resources.length === 0 ? (
              <EmptyState
                title="No resources found"
                description="Create resources to track their usage and utilization."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        Resource
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Bookings
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Booked Hours
                      </th>
                      <th scope="col" className="px-5 py-3.5 w-56">
                        Utilization
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {usage.resources.map((item) => {
                      const pct = Math.min(100, Math.max(0, item.utilizationPercent));
                      const barColor =
                        pct >= 75
                          ? "bg-rose-500 dark:bg-rose-400"
                          : pct >= 40
                          ? "bg-amber-500 dark:bg-amber-400"
                          : pct > 0
                          ? "bg-emerald-500 dark:bg-emerald-400"
                          : "bg-slate-300 dark:bg-slate-700";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {item.name}
                              </span>
                              <Badge variant="neutral">
                                {item.type}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-900 dark:text-slate-100">
                            {item.bookingCount}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-900 dark:text-slate-100">
                            {item.bookedHours.toFixed(1)} hrs
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-slate-700 dark:text-slate-300">
                                  {pct}%
                                </span>
                              </div>
                              <div
                                role="progressbar"
                                aria-label={`${item.name} utilization`}
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                              >
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Top 5 Most-Booked Resources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Top 5 Most Booked
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">By booking count</span>
          </div>

          <Card className="p-4">
            {usage.topResources.length === 0 || usage.topResources.every((r) => r.bookingCount === 0) ? (
              <EmptyState
                title="No active bookings"
                description="Bookings created in this period will rank here."
              />
            ) : (
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {usage.topResources.map((item, idx) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.type} • {item.bookedHours.toFixed(1)} hrs
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {item.bookingCount} {item.bookingCount === 1 ? "booking" : "bookings"}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
