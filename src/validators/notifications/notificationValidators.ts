import { z } from "zod";

//  Device Registration 

export const registerDeviceSchema = z.object({
  token: z.string().min(1, "token is required"),
  couple_id: z.string().uuid("couple_id must be a valid UUID"),
  access_token: z.string().min(1, "access_token is required"),
  platform: z.enum(["web", "android", "ios"], {
    message: 'platform must be "web", "android", or "ios"',
  }),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

//  Send Notification 

const globalNotificationSchema = z.object({
  type: z.literal("global"),
  couple_id: z.string().uuid("couple_id must be a valid UUID"),
  message: z.string().min(1, "message is required"),
});

const eventNotificationSchema = z.object({
  type: z.literal("event"),
  couple_id: z.string().uuid("couple_id must be a valid UUID"),
  event_id: z.string().uuid("event_id must be a valid UUID"),
  message: z.string().min(1, "message is required"),
});

export const sendNotificationSchema = z.discriminatedUnion("type", [
  globalNotificationSchema,
  eventNotificationSchema,
]);

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
