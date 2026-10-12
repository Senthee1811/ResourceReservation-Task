"use client";

import { useState } from "react";
import { cancelReservationAction } from "@/app/actions/reservation-actions";
import { Button } from "@/components/ui/button";

interface CancelReservationButtonProps {
  reservationId: string;
  reservationTitle: string;
}

export function CancelReservationButton({
  reservationId,
  reservationTitle,
}: CancelReservationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

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
    <div className="flex items-center gap-2">
      <span className="text-xs text-rose-600 font-medium dark:text-rose-400">
        Cancel &ldquo;{reservationTitle}&rdquo;?
      </span>
      <form
        action={async (formData) => {
          setIsPending(true);
          await cancelReservationAction(formData);
        }}
        className="inline"
      >
        <input type="hidden" name="reservationId" value={reservationId} />
        <input type="hidden" name="returnUrl" value="/reservations" />
        <Button
          type="submit"
          variant="danger"
          size="sm"
          disabled={isPending}
          isLoading={isPending}
        >
          Yes, Cancel
        </Button>
      </form>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => setIsOpen(false)}
      >
        Keep
      </Button>
    </div>
  );
}
