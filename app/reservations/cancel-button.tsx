"use client";

import { useState } from "react";
import { cancelReservationAction } from "@/app/actions/reservation-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CancelReservationButtonProps {
  reservationId: string;
  reservationTitle: string;
  returnUrl?: string;
}

export function CancelReservationButton({
  reservationId,
  reservationTitle,
  returnUrl = "/reservations",
}: CancelReservationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
        onClick={() => setIsOpen(true)}
      >
        Cancel Booking
      </Button>
    );
  }

  return (
    <div className="w-full max-w-md animate-in fade-in duration-200">
      <Alert
        variant="warning"
        className="border-amber-300/80 bg-amber-50/90 p-3 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40"
      >
        <div className="space-y-2">
          <div>
            <AlertTitle className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Confirm Cancellation
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
              Cancel &ldquo;{reservationTitle}&rdquo;? This will immediately free the time slot for other members.
            </AlertDescription>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <form
              action={async (formData) => {
                setIsPending(true);
                setErrorMessage(null);
                try {
                  await cancelReservationAction(formData);
                } catch (err: unknown) {
                  const msg =
                    err instanceof Error ? err.message : "Failed to cancel reservation";
                  setErrorMessage(msg);
                  setIsPending(false);
                }
              }}
              className="inline"
            >
              <input type="hidden" name="reservationId" value={reservationId} />
              <input type="hidden" name="returnUrl" value={returnUrl} />
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isPending}
                isLoading={isPending}
                className="h-7 text-xs px-2.5"
              >
                Yes, Cancel
              </Button>
            </form>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setIsOpen(false);
                setErrorMessage(null);
              }}
              className="h-7 text-xs px-2.5"
            >
              Keep Booking
            </Button>
          </div>

          {errorMessage && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
        </div>
      </Alert>
    </div>
  );
}

