"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createReservationAction,
  type ReservationActionState,
} from "@/app/actions/reservation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { MAX_BOOKING_HOURS } from "@/lib/validators";

// 24-hour hour list: 00 to 23
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

// 5-minute interval minute list: 00 to 55
const BASE_MINUTES = [
  "00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55",
];

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

  const [initStartH, initStartM] = (initialStart || "09:00").split(":");
  const [initEndH, initEndM] = (initialEnd || "10:00").split(":");

  const [startHour, setStartHour] = useState(initStartH?.padStart(2, "0") || "09");
  const [startMinute, setStartMinute] = useState(initStartM?.padStart(2, "0") || "00");
  const [endHour, setEndHour] = useState(initEndH?.padStart(2, "0") || "10");
  const [endMinute, setEndMinute] = useState(initEndM?.padStart(2, "0") || "00");
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Fallback string values for custom input mode
  const [customStart, setCustomStart] = useState(`${startHour}:${startMinute}`);
  const [customEnd, setCustomEnd] = useState(`${endHour}:${endMinute}`);

  const startMinutesList = useMemo(() => {
    const list = [...BASE_MINUTES];
    if (startMinute && !list.includes(startMinute)) {
      list.push(startMinute);
      list.sort();
    }
    return list;
  }, [startMinute]);

  const endMinutesList = useMemo(() => {
    const list = [...BASE_MINUTES];
    if (endMinute && !list.includes(endMinute)) {
      list.push(endMinute);
      list.sort();
    }
    return list;
  }, [endMinute]);

  const handleStartChange = (newHour: string, newMinute: string) => {
    setStartHour(newHour);
    setStartMinute(newMinute);
    setCustomStart(`${newHour}:${newMinute}`);

    const startTotalMinutes = parseInt(newHour, 10) * 60 + parseInt(newMinute, 10);
    const endTotalMinutes = parseInt(endHour, 10) * 60 + parseInt(endMinute, 10);

    // If End Time is before or equal to Start Time, automatically advance End Time by 1 hour
    if (endTotalMinutes <= startTotalMinutes) {
      const nextTotal = Math.min(startTotalMinutes + 60, 23 * 60 + 55);
      const nextH = String(Math.floor(nextTotal / 60)).padStart(2, "0");
      const nextM = String(nextTotal % 60).padStart(2, "0");
      setEndHour(nextH);
      setEndMinute(nextM);
      setCustomEnd(`${nextH}:${nextM}`);
    }
  };

  const handleEndChange = (newHour: string, newMinute: string) => {
    setEndHour(newHour);
    setEndMinute(newMinute);
    setCustomEnd(`${newHour}:${newMinute}`);
  };

  const formattedStartTime = isCustomMode ? customStart : `${startHour}:${startMinute}`;
  const formattedEndTime = isCustomMode ? customEnd : `${endHour}:${endMinute}`;

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
        {/* Hidden inputs ensure server action receives full HH:mm format */}
        <input type="hidden" name="startTime" value={formattedStartTime} />
        <input type="hidden" name="endTime" value={formattedEndTime} />

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

        {/* Time Selection Section */}
        <div className="space-y-2">
          {isCustomMode ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Time (24h)"
                id="booking-start"
                type="text"
                required
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                placeholder="09:00"
                pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                helperText="Format: HH:mm (e.g. 14:00)"
              />

              <Input
                label="End Time (24h)"
                id="booking-end"
                type="text"
                required
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                placeholder="10:00"
                pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                helperText="Format: HH:mm (e.g. 15:00)"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Time: Split Hour & Minute */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Start Time (24h) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="booking-start-hour" className="sr-only">
                      Start Hour
                    </label>
                    <select
                      id="booking-start-hour"
                      value={startHour}
                      onChange={(e) => handleStartChange(e.target.value, startMinute)}
                      aria-label="Start Hour"
                      className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm text-slate-900 shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-100 dark:focus:ring-slate-100/10"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {h} hr
                        </option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-center text-[10px] text-slate-400">
                      Hour (00–23)
                    </span>
                  </div>

                  <div>
                    <label htmlFor="booking-start-minute" className="sr-only">
                      Start Minute
                    </label>
                    <select
                      id="booking-start-minute"
                      value={startMinute}
                      onChange={(e) => handleStartChange(startHour, e.target.value)}
                      aria-label="Start Minute"
                      className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm text-slate-900 shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-100 dark:focus:ring-slate-100/10"
                    >
                      {startMinutesList.map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-center text-[10px] text-slate-400">
                      Min (00–55)
                    </span>
                  </div>
                </div>
              </div>

              {/* End Time: Split Hour & Minute */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  End Time (24h) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="booking-end-hour" className="sr-only">
                      End Hour
                    </label>
                    <select
                      id="booking-end-hour"
                      value={endHour}
                      onChange={(e) => handleEndChange(e.target.value, endMinute)}
                      aria-label="End Hour"
                      className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm text-slate-900 shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-100 dark:focus:ring-slate-100/10"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {h} hr
                        </option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-center text-[10px] text-slate-400">
                      Hour (00–23)
                    </span>
                  </div>

                  <div>
                    <label htmlFor="booking-end-minute" className="sr-only">
                      End Minute
                    </label>
                    <select
                      id="booking-end-minute"
                      value={endMinute}
                      onChange={(e) => handleEndChange(endHour, e.target.value)}
                      aria-label="End Minute"
                      className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm text-slate-900 shadow-sm transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-100 dark:focus:ring-slate-100/10"
                    >
                      {endMinutesList.map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-center text-[10px] text-slate-400">
                      Min (00–55)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
            >
              {isCustomMode ? "← Use split Hour & Minute dropdowns" : "Type custom 24h time →"}
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


