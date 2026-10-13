"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createReservationAction,
  type ReservationActionState,
} from "@/app/actions/reservation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { MAX_BOOKING_HOURS } from "@/lib/validators";

// 24-hour time slots in 15-minute intervals from 00:00 to 23:45
const BASE_TIME_SLOTS_24H: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    BASE_TIME_SLOTS_24H.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  }
}

interface BookingFormProps {
  resourceId: string;
  resourceName: string;
  defaultDate: string;
  prefillStartTime?: string;
  prefillEndTime?: string;
}

export function BookingForm({
  resourceId,
  resourceName,
  defaultDate,
  prefillStartTime = "09:00",
  prefillEndTime = "10:00",
}: BookingFormProps) {
  const [state, formAction, isPending] = useActionState<
    ReservationActionState,
    FormData
  >(createReservationAction, {});

  const currentTitle = state?.values?.title || "";
  const currentNotes = state?.values?.notes || "";
  const currentDate = state?.values?.date || defaultDate;
  const initialStart = state?.values?.startTime || prefillStartTime;
  const initialEnd = state?.values?.endTime || prefillEndTime;

  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Ensure current/prefilled values are present in options list
  const timeOptions: SelectOption[] = useMemo(() => {
    const list = [...BASE_TIME_SLOTS_24H];
    if (startTime && !list.includes(startTime)) {
      list.push(startTime);
    }
    if (endTime && !list.includes(endTime)) {
      list.push(endTime);
    }
    list.sort();
    return list.map((time) => ({ value: time, label: time }));
  }, [startTime, endTime]);

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    // Automatically advance endTime by 1 hour if end time is before or equal to new start time
    const [startH, startM] = newStart.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    if (!Number.isNaN(startH) && !Number.isNaN(endH)) {
      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);
      if (endMinutes <= startMinutes) {
        const nextMinutes = Math.min(startMinutes + 60, 23 * 60 + 45);
        const nextH = Math.floor(nextMinutes / 60);
        const nextM = nextMinutes % 60;
        setEndTime(
          `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`,
        );
      }
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Book {resourceName}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Times are scheduled in Asia/Colombo time (UTC+05:30) • 24-hour format
        </p>
      </div>

      {state?.error && (
        <Alert variant="error" className="mb-5">
          {state.error}
        </Alert>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="resourceId" value={resourceId} />

        <Input
          label="Reservation Title"
          id="booking-title"
          name="title"
          required
          defaultValue={currentTitle}
          placeholder="e.g. Project Review, Lab Experiment, Team Offsite"
        />

        <div>
          <Input
            label="Date"
            id="booking-date"
            name="date"
            type="date"
            required
            defaultValue={currentDate}
          />
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-3">
            {isCustomMode ? (
              <>
                <Input
                  label="Start Time (24h)"
                  id="booking-start"
                  name="startTime"
                  type="text"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="09:00"
                  pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                  helperText="Format: HH:mm (e.g. 14:00)"
                />

                <Input
                  label="End Time (24h)"
                  id="booking-end"
                  name="endTime"
                  type="text"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="10:00"
                  pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                  helperText="Format: HH:mm (e.g. 15:00)"
                />
              </>
            ) : (
              <>
                <Select
                  label="Start Time (24h)"
                  id="booking-start"
                  name="startTime"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  options={timeOptions}
                />

                <Select
                  label="End Time (24h)"
                  id="booking-end"
                  name="endTime"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  options={timeOptions}
                />
              </>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
            >
              {isCustomMode ? "← Choose from 24h slot list" : "Type custom 24h time →"}
            </button>
          </div>
        </div>

        <Textarea
          label="Notes / Special Requirements"
          id="booking-notes"
          name="notes"
          rows={2}
          defaultValue={currentNotes}
          placeholder="Optional notes or required equipment"
        />

        {/* Live booking rules checklist */}
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            Booking Policy:
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">•</span>
            <span>Maximum duration: {MAX_BOOKING_HOURS} hours per booking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">•</span>
            <span>Past times cannot be reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">•</span>
            <span>End time must be strictly after start time</span>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full cursor-pointer"
          disabled={isPending}
          isLoading={isPending}
        >
          {isPending ? "Confirming Booking..." : "Confirm Reservation"}
        </Button>
      </form>
    </div>
  );
}

