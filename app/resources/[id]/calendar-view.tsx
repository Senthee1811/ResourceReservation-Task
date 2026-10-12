"use client";

import React from "react";
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  computeDayLayout,
  getCurrentTimePosition,
  getHourSlots,
  type RawBooking,
} from "@/lib/calendar-layout";
import { addDays, formatDateKey, parseLocalInput } from "@/lib/datetime";

interface CalendarViewProps {
  viewMode: "day" | "week";
  selectedDateStr: string;
  bookings: RawBooking[];
  onSelectSlot: (dateStr: string, startTime: string, endTime: string) => void;
}

export function CalendarView({
  viewMode,
  selectedDateStr,
  bookings,
  onSelectSlot,
}: CalendarViewProps) {
  const hourSlots = getHourSlots();
  const selectedDate = parseLocalInput(`${selectedDateStr}T00:00`);

  // Days to display: 1 day for day view, 7 days for week view
  const days =
    viewMode === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i))
      : [selectedDate];

  const now = new Date();

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {/* Calendar Header with Days */}
      <div className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="p-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400">
            Time
          </div>
          {days.map((d) => {
            const dateStr = formatDateKey(d);
            const isToday = formatDateKey(now) === dateStr;
            const weekday = d.toLocaleDateString("en-US", {
              timeZone: "Asia/Colombo",
              weekday: "short",
            });
            const monthDay = d.toLocaleDateString("en-US", {
              timeZone: "Asia/Colombo",
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={dateStr}
                className={`p-3 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 ${
                  isToday ? "bg-slate-100/80 dark:bg-slate-800/60 font-bold" : ""
                }`}
              >
                <div>{weekday}</div>
                <div className={`text-xs ${isToday ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {monthDay}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="relative overflow-y-auto max-h-[640px] select-none">
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))`,
            height: `${(CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 56}px`, // 56px per hour
          }}
        >
          {/* Time Labels Column */}
          <div className="border-r border-slate-200 dark:border-slate-800 relative bg-slate-50/30 dark:bg-slate-950/20">
            {hourSlots.map((slot, index) => {
              const topPx = index * 56;
              return (
                <div
                  key={slot.label}
                  className="absolute right-2 text-[11px] font-mono text-slate-400 -translate-y-2"
                  style={{ top: `${topPx}px` }}
                >
                  {slot.label}
                </div>
              );
            })}
          </div>

          {/* Day Columns */}
          {days.map((dayDate) => {
            const dayDateStr = formatDateKey(dayDate);
            const blocks = computeDayLayout(dayDate, bookings);
            const currentTimePos = getCurrentTimePosition(dayDate, now);

            return (
              <div
                key={dayDateStr}
                className="relative border-r last:border-r-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group"
              >
                {/* Horizontal Hour Grid Lines & Clickable Empty Slots */}
                {hourSlots.slice(0, -1).map((slot, index) => {
                  const startHourStr = String(slot.hour).padStart(2, "0") + ":00";
                  const endHourStr = String(slot.hour + 1).padStart(2, "0") + ":00";
                  const topPx = index * 56;

                  return (
                    <div
                      key={slot.label}
                      onClick={() => onSelectSlot(dayDateStr, startHourStr, endHourStr)}
                      title={`Click to book ${dayDateStr} at ${startHourStr}`}
                      className="absolute left-0 right-0 border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      style={{ top: `${topPx}px`, height: "56px" }}
                    />
                  );
                })}

                {/* Confirmed Booking Blocks */}
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="absolute inset-x-1 z-10 rounded-md border border-slate-900/10 bg-slate-900 text-white p-2 shadow-xs transition-transform hover:scale-[1.01] dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200/20 overflow-hidden"
                    style={{
                      top: `${block.topPercent}%`,
                      height: `${block.heightPercent}%`,
                    }}
                    title={`${block.title}\n${block.timeLabel}${block.userName ? ` by ${block.userName}` : ""}${block.notes ? `\nNotes: ${block.notes}` : ""}`}
                  >
                    <div className="font-semibold text-xs leading-tight line-clamp-1">
                      {block.title}
                    </div>
                    <div className="text-[10px] opacity-80 font-mono mt-0.5">
                      {block.timeLabel}
                    </div>
                    {block.userName && (
                      <div className="text-[10px] opacity-75 truncate mt-0.5">
                        Booked by: {block.userName}
                      </div>
                    )}
                  </div>
                ))}

                {/* Current Time Indicator */}
                {currentTimePos !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: `${currentTimePos}%` }}
                  >
                    <div className="h-2 w-2 rounded-full bg-rose-500 shadow-xs -ml-1 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                    <div className="h-[2px] w-full bg-rose-500 shadow-xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
