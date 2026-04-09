import { z } from "zod";

/**
 * Validates a time string in HH:MM or HH:MM:SS format
 */
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
  message: "Invalid time format. Expected HH:MM or HH:MM:SS (24-hour format).",
});

/**
 * Validates the event date. It must be a valid date and not in the past.
 */
const eventDateSchema = z.string().refine((dateStr) => {
  const inputDate = new Date(dateStr);
  if (isNaN(inputDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Set input date to midnight as well for accurate day comparison
  const compareDate = new Date(inputDate);
  compareDate.setHours(0, 0, 0, 0);

  return compareDate >= today;
}, {
  message: "Event date cannot be in the past.",
});

export const createEventValidator = z.object({
  name: z
    .string()
    .min(2, "Event name must be at least 2 characters.")
    .max(100, "Event name cannot exceed 100 characters."),
  event_date: eventDateSchema,
  start_time: timeStringSchema,
  end_time: timeStringSchema,
  location: z.string().min(1, "Location is required."),
  dress_code: z
    .string()
    .max(100, "Dress code description is too long.")
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
}).refine((data) => {
  if (data.start_time && data.end_time) {
    return data.start_time < data.end_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["end_time"],
});

export const updateEventValidator = z.object({
  name: z
    .string()
    .min(2, "Event name must be at least 2 characters.")
    .max(100, "Event name cannot exceed 100 characters.")
    .optional(),
  event_date: eventDateSchema.optional(),
  start_time: timeStringSchema.optional(),
  end_time: timeStringSchema.optional(),
  location: z.string().min(1, "Location cannot be empty.").optional(),
  dress_code: z
    .string()
    .max(100, "Dress code description is too long.")
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
}).refine((data) => {
  if (data.start_time && data.end_time) {
    return data.start_time < data.end_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["end_time"],
});


export type CreateEventInput = z.infer<typeof createEventValidator>;
export type UpdateEventInput = z.infer<typeof updateEventValidator>;
