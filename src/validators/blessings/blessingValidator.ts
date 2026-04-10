import { z } from "zod";

export const createBlessingValidator = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),
  message: z
    .string()
    .min(1, "Message is required.")
    .max(1000, "Message cannot exceed 1000 characters."),
  image_url: z.string().url("Invalid image URL.").optional().nullable(),
});

export type CreateBlessingInput = z.infer<typeof createBlessingValidator>;
