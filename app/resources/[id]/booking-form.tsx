"use client";

import { useActionState } from "react";
import {
  createReservationAction,
  type ReservationActionState,
} from "@/app/actions/reservation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { MAX_BOOKING_HOURS } from "@/lib/validators";

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
  const currentStart = state?.values?.startTime || prefillStartTime;
  const currentEnd = state?.values?.endTime || prefillEndTime;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Book {resourceName}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Times are scheduled in Asia/Colombo time (UTC+05:30)
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

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Time"
            id="booking-start"
            name="startTime"
            type="time"
            required
            defaultValue={currentStart}
          />

          <Input
            label="End Time"
            id="booking-end"
            name="endTime"
            type="time"
            required
            defaultValue={currentEnd}
          />
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
          className="w-full"
          disabled={isPending}
          isLoading={isPending}
        >
          {isPending ? "Confirming Booking..." : "Confirm Reservation"}
        </Button>
      </form>
    </div>
  );
}
