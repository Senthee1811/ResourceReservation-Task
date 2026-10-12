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
  const title = (formData.get("title") as string) || "";
  const notes = (formData.get("notes") as string) || "";
  const date = (formData.get("date") as string) || "";
  const startTime = (formData.get("startTime") as string) || "";
  const endTime = (formData.get("endTime") as string) || "";

  const values: ReservationFormValues = {
    resourceId,
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
    return {
      error: "An unexpected error occurred while making your reservation.",
      values,
    };
  }

  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/reservations");
  revalidatePath("/admin/reservations");
  redirect(`/resources/${resourceId}?booked=true&date=${date}`);
}

export async function cancelReservationAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const reservationId = formData.get("reservationId") as string;
  const returnUrl = (formData.get("returnUrl") as string) || "/reservations";

  if (!reservationId) return;

  await cancelReservation(actor, reservationId, new Date());

  revalidatePath("/reservations");
  revalidatePath("/admin/reservations");
  revalidatePath("/resources");
  redirect(returnUrl);
}
