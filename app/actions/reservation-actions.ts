"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseLocalInput } from "@/lib/datetime";
import { DomainError } from "@/lib/errors";
import {
  cancelReservation,
  createReservation,
} from "@/lib/reservation-service";

export type ReservationFormValues = {
  resourceId: string;
  userId?: string;
  title: string;
  notes?: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type ReservationActionState = {
  error?: string;
  success?: boolean;
  message?: string;
  values?: ReservationFormValues;
};

export async function createReservationAction(
  _prevState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const actor = await requireUser();

  const resourceId = formData.get("resourceId") as string;
  const userId = (formData.get("userId") as string) || undefined;
  const title = (formData.get("title") as string) || "";
  const notes = (formData.get("notes") as string) || "";
  const date = (formData.get("date") as string) || "";
  const startTime = (formData.get("startTime") as string) || "";
  const endTime = (formData.get("endTime") as string) || "";

  const values: ReservationFormValues = {
    resourceId,
    userId,
    title,
    notes,
    date,
    startTime,
    endTime,
  };

  if (!resourceId || !title.trim() || !date || !startTime || !endTime) {
    return {
      error: "Please fill in all required fields (title, date, start time, end time).",
      values,
    };
  }

  let startAt: Date;
  let endAt: Date;
  try {
    startAt = parseLocalInput(`${date}T${startTime}`);
    endAt = parseLocalInput(`${date}T${endTime}`);
  } catch {
    return {
      error: "Invalid date or time format.",
      values,
    };
  }

  try {
    await createReservation(
      actor,
      {
        resourceId,
        userId: actor.role === "ADMIN" ? userId : undefined,
        title,
        notes,
        startAt,
        endAt,
      },
      new Date(),
    );
  } catch (err) {
    if (err instanceof DomainError) {
      return {
        error: err.message,
        values,
      };
    }
    console.error("Unhandled error creating reservation:", err);
    return {
      error: "An unexpected error occurred while making your reservation.",
      values,
    };
  }

  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/reservations");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/usage");
  revalidatePath("/resources");
  redirect(`/resources/${resourceId}?booked=true&date=${date}`);
}

export async function cancelReservationAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const reservationId = formData.get("reservationId") as string;
  const returnUrl = (formData.get("returnUrl") as string) || "/reservations";

  if (!reservationId) return;

  let cancelled;
  try {
    cancelled = await cancelReservation(actor, reservationId, new Date());
  } catch (err) {
    if (err instanceof DomainError) {
      const sep = returnUrl.includes("?") ? "&" : "?";
      redirect(`${returnUrl}${sep}error=${encodeURIComponent(err.message)}`);
    }
    console.error("Unhandled error cancelling reservation:", err);
    const sep = returnUrl.includes("?") ? "&" : "?";
    redirect(`${returnUrl}${sep}error=${encodeURIComponent("An unexpected error occurred while cancelling the reservation.")}`);
  }

  if (cancelled?.resourceId) {
    revalidatePath(`/resources/${cancelled.resourceId}`);
  }
  revalidatePath("/reservations");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/usage");
  revalidatePath("/resources");
  redirect(returnUrl);
}
