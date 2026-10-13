"use client";

import { useState } from "react";
import { CalendarView } from "./calendar-view";
import { BookingForm } from "./booking-form";
import type { RawBooking } from "@/lib/calendar-layout";

interface CalendarContainerProps {
  resourceId: string;
  resourceName: string;
  selectedDateStr: string;
  viewMode: "day" | "week";
  bookings: RawBooking[];
  isAdmin?: boolean;
  userList?: Array<{ id: string; name: string; email: string; role: "ADMIN" | "MEMBER" }>;
}

export function CalendarContainer({
  resourceId,
  resourceName,
  selectedDateStr,
  viewMode,
  bookings,
  isAdmin = false,
  userList = [],
}: CalendarContainerProps) {
  const [formDate, setFormDate] = useState(selectedDateStr);
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");

  const handleSlotSelect = (dateStr: string, startTime: string, endTime: string) => {
    setFormDate(dateStr);
    setFormStart(startTime);
    setFormEnd(endTime);

    // Scroll to booking form if on small mobile screens
    if (window.innerWidth < 1024) {
      document.getElementById("booking-form-section")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
      {/* Calendar Timeline Column */}
      <div className="lg:col-span-7 xl:col-span-8">
        <CalendarView
          viewMode={viewMode}
          selectedDateStr={selectedDateStr}
          bookings={bookings}
          onSelectSlot={handleSlotSelect}
        />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Tip: Click on any empty hour slot above to instantly prefill the booking form.
        </p>
      </div>

      {/* Booking Form Column */}
      <div id="booking-form-section" className="lg:col-span-5 xl:col-span-4 sticky top-20">
        <BookingForm
          key={`${formDate}-${formStart}-${formEnd}`}
          resourceId={resourceId}
          resourceName={resourceName}
          defaultDate={formDate}
          prefillStartTime={formStart}
          prefillEndTime={formEnd}
          isAdmin={isAdmin}
          userList={userList}
        />
      </div>
    </div>
  );
}
