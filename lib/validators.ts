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
    userId: z.string().uuid("Invalid user").optional().or(z.literal("")),
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
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(100),
});

export const createMemberInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
});
export type CreateMemberInput = z.infer<typeof createMemberInputSchema>;

export const signupSchema = createMemberInputSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const adminReservationFilterSchema = z.object({
  resourceId: z.string().uuid().optional().or(z.literal("")).catch(undefined),
  userId: z.string().uuid().optional().or(z.literal("")).catch(undefined),
  status: z.enum(["CONFIRMED", "CANCELLED", "ALL"]).optional().catch("ALL"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .catch(undefined),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});
export type AdminReservationFilterInput = z.infer<
  typeof adminReservationFilterSchema
>;

