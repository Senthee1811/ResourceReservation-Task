import { z } from "zod";

export const MAX_BOOKING_HOURS = 8;

export const booleanCheckbox = z.preprocess((val) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "on";
  }
  return false;
}, z.boolean());

export const resourceInputSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  type: z.string().trim().min(2).max(50),
  capacity: z.coerce.number().int().min(1).max(10_000),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: booleanCheckbox,
});
export type ResourceInput = z.infer<typeof resourceInputSchema>;

export const reservationInputSchema = z
  .object({
    resourceId: z.string().uuid("Invalid resource"),
    title: z.string().trim().min(2, "Title is required").max(120),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
  })
  .superRefine((v, ctx) => {
    if (Number.isNaN(v.startAt.getTime()) || Number.isNaN(v.endAt.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date/time" });
      return;
    }
    if (v.endAt <= v.startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End time must be after start time",
      });
    }
    const hours = (v.endAt.getTime() - v.startAt.getTime()) / 3_600_000;
    if (hours > MAX_BOOKING_HOURS) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: `A single booking cannot exceed ${MAX_BOOKING_HOURS} hours`,
      });
    }
  });
export type ReservationInput = z.infer<typeof reservationInputSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
