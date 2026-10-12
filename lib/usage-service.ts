import { pool } from "./db";
import { DomainError } from "./errors";
import type { Actor } from "./reservation-service";
import { addDays } from "./datetime";

export const OPEN_START_HOUR = 8;
export const OPEN_END_HOUR = 18;
export const OPEN_HOURS_PER_DAY = OPEN_END_HOUR - OPEN_START_HOUR; // 10 hours per day

export type ResourceUtilization = {
  id: string;
  name: string;
  type: string;
  bookingCount: number;
  bookedHours: number;
  utilizationPercent: number; // 0 to 100
};

export type UsageSummary = {
  days: number;
  windowStart: Date;
  windowEnd: Date;
  openHoursPerDay: number;
  totalOpenHoursPerResource: number;
  resources: ResourceUtilization[];
  topResources: ResourceUtilization[];
  totalConfirmedBookings: number;
  totalCancelledBookings: number;
  cancellationRate: number; // 0 to 100
  busiestWeekday: {
    dayName: string;
    count: number;
  } | null;
};

export async function getUsageSummary(
  actor: Actor,
  days: number = 30,
  now: Date = new Date(),
): Promise<UsageSummary> {
  if (actor.role !== "ADMIN") {
    throw new DomainError("FORBIDDEN", "Only administrators can view usage statistics");
  }

  const validDays = [7, 30, 90].includes(days) ? days : 30;
  const windowEnd = now;
  const windowStart = addDays(now, -validDays);
  const totalOpenHours = validDays * OPEN_HOURS_PER_DAY;

  // 1. Per-resource bookings, booked hours clipped to window, and utilization %
  const resourceQuery = `
    SELECT
      r.id,
      r.name,
      r.type,
      COUNT(b.id)::int AS booking_count,
      COALESCE(
        ROUND(
          SUM(
            CASE
              WHEN b.id IS NOT NULL THEN
                EXTRACT(EPOCH FROM (LEAST(b.end_at, $2) - GREATEST(b.start_at, $1))) / 3600
              ELSE NULL
            END
          )::numeric, 2
        ), 0
      )::float AS booked_hours
    FROM resources r
    LEFT JOIN reservations b ON b.resource_id = r.id
      AND b.status = 'CONFIRMED'
      AND b.end_at > $1
      AND b.start_at < $2
    GROUP BY r.id, r.name, r.type
    ORDER BY booked_hours DESC, booking_count DESC, r.name ASC
  `;
  const resourceResult = await pool.query(resourceQuery, [windowStart, windowEnd]);

  const resources: ResourceUtilization[] = resourceResult.rows.map((row) => {
    const bookedHours = Number(row.booked_hours) || 0;
    const utilizationPercent =
      totalOpenHours > 0
        ? Math.min(100, Math.round((bookedHours / totalOpenHours) * 100 * 10) / 10)
        : 0;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      bookingCount: Number(row.booking_count) || 0,
      bookedHours,
      utilizationPercent,
    };
  });

  // Top 5 most-booked resources (by booking count, then hours)
  const topResources = [...resources]
    .sort((a, b) => b.bookingCount - a.bookingCount || b.bookedHours - a.bookedHours)
    .slice(0, 5);

  // 2. Cancellation rate in the window
  const cancellationQuery = `
    SELECT
      COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed_count,
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_count
    FROM reservations
    WHERE end_at > $1 AND start_at < $2
  `;
  const cancelResult = await pool.query(cancellationQuery, [windowStart, windowEnd]);
  const confirmedCount = Number(cancelResult.rows[0]?.confirmed_count) || 0;
  const cancelledCount = Number(cancelResult.rows[0]?.cancelled_count) || 0;
  const totalBookings = confirmedCount + cancelledCount;
  const cancellationRate =
    totalBookings > 0
      ? Math.round((cancelledCount / totalBookings) * 100 * 10) / 10
      : 0;

  // 3. Busiest weekday (in Asia/Colombo timezone)
  const weekdayQuery = `
    SELECT
      TRIM(TO_CHAR(start_at AT TIME ZONE 'Asia/Colombo', 'Day')) AS day_name,
      EXTRACT(DOW FROM (start_at AT TIME ZONE 'Asia/Colombo'))::int AS day_dow,
      COUNT(*)::int AS count
    FROM reservations
    WHERE status = 'CONFIRMED'
      AND end_at > $1
      AND start_at < $2
    GROUP BY day_name, day_dow
    ORDER BY count DESC, day_dow ASC
    LIMIT 1
  `;
  const weekdayResult = await pool.query(weekdayQuery, [windowStart, windowEnd]);
  const busiestWeekday =
    weekdayResult.rows.length > 0 && Number(weekdayResult.rows[0].count) > 0
      ? {
          dayName: weekdayResult.rows[0].day_name,
          count: Number(weekdayResult.rows[0].count),
        }
      : null;

  return {
    days: validDays,
    windowStart,
    windowEnd,
    openHoursPerDay: OPEN_HOURS_PER_DAY,
    totalOpenHoursPerResource: totalOpenHours,
    resources,
    topResources,
    totalConfirmedBookings: confirmedCount,
    totalCancelledBookings: cancelledCount,
    cancellationRate,
    busiestWeekday,
  };
}
