import pool from "../../config/database";

//  Notification 

export interface Notification {
  id: string;
  couple_id: string;
  event_id: string | null;
  message: string;
  created_at: Date;
  type?: string;
}

export interface CreateNotificationInput {
  couple_id: string;
  event_id?: string | null;
  message: string;
}

//  Device Token 

export interface UserDeviceToken {
  id: string;
  couple_id: string;
  token: string;
  platform: "web" | "android" | "ios";
  created_at: Date;
}

export interface CreateDeviceTokenInput {
  couple_id: string;
  token: string;
  platform: "web" | "android" | "ios";
  access_token?: string;
}

//  Repository class 

class NotificationRepository {
  //  Notifications 

  async createNotification(data: CreateNotificationInput): Promise<Notification> {
    const result = await pool.query<Notification>(
      `INSERT INTO notifications (couple_id, event_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.couple_id, data.event_id ?? null, data.message]
    );
    return result.rows[0];
  }

  async getNotificationsByCoupleId(coupleId: string): Promise<Notification[]> {
    const result = await pool.query<Notification>(
      `SELECT *, CASE WHEN event_id IS NULL THEN 'global' ELSE 'event' END as type 
       FROM notifications WHERE couple_id = $1 ORDER BY created_at DESC`,
      [coupleId]
    );
    return result.rows;
  }

  async getNotificationsForGuest(coupleId: string, allowedEventIds: string[] | 'all'): Promise<Notification[]> {
    if (allowedEventIds === 'all') {
      return this.getNotificationsByCoupleId(coupleId);
    }

    if (allowedEventIds.length === 0) {
      // Only global notifications
      const result = await pool.query<Notification>(
        `SELECT *, 'global' as type 
         FROM notifications WHERE couple_id = $1 AND event_id IS NULL ORDER BY created_at DESC`,
        [coupleId]
      );
      return result.rows;
    }

    const result = await pool.query<Notification>(
      `SELECT *, CASE WHEN event_id IS NULL THEN 'global' ELSE 'event' END as type 
       FROM notifications 
       WHERE couple_id = $1 
         AND (event_id IS NULL OR event_id = ANY($2::uuid[]))
       ORDER BY created_at DESC`,
      [coupleId, allowedEventIds]
    );
    return result.rows;
  }

  async updateNotification(id: string, coupleId: string, message: string): Promise<Notification | null> {
    const result = await pool.query<Notification>(
      `UPDATE notifications 
       SET message = $1 
       WHERE id = $2 AND couple_id = $3 
       RETURNING *`,
      [message, id, coupleId]
    );
    return result.rows[0] ?? null;
  }

  async deleteNotification(id: string, coupleId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND couple_id = $2`,
      [id, coupleId]
    );
    return (result.rowCount ?? 0) > 0;
  }


  //  Device Tokens 

  async upsertDeviceToken(data: CreateDeviceTokenInput): Promise<UserDeviceToken> {
    const result = await pool.query<UserDeviceToken>(
      `INSERT INTO user_device_tokens (couple_id, token, platform, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token)
       DO UPDATE SET couple_id = EXCLUDED.couple_id,
                     platform  = EXCLUDED.platform,
                     access_token = COALESCE(EXCLUDED.access_token, user_device_tokens.access_token)
       RETURNING *`,
      [data.couple_id, data.token, data.platform, data.access_token || null]
    );
    return result.rows[0];
  }

  async findDeviceTokenByToken(token: string): Promise<UserDeviceToken | null> {
    const result = await pool.query<UserDeviceToken>(
      `SELECT * FROM user_device_tokens WHERE token = $1`,
      [token]
    );
    return result.rows[0] ?? null;
  }

  async getTokensByCoupleId(coupleId: string): Promise<UserDeviceToken[]> {
    const result = await pool.query<UserDeviceToken>(
      `SELECT * FROM user_device_tokens WHERE couple_id = $1`,
      [coupleId]
    );
    return result.rows;
  }

  //  Event Access helpers 

  async findAccessByToken(
    accessToken: string,
    coupleId: string
  ): Promise<{ id: string; couple_id: string; access_type: string; expires_at: Date | null } | null> {
    const result = await pool.query(
      `SELECT id, couple_id, access_type, expires_at
         FROM event_access
        WHERE token = $1 AND couple_id = $2`,
      [accessToken, coupleId]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Return all event_ids that the given access_id is allowed to see.
   */
  async getAllowedEventIds(accessId: string): Promise<string[]> {
    const result = await pool.query<{ event_id: string }>(
      `SELECT event_id FROM event_access_events WHERE access_id = $1`,
      [accessId]
    );
    return result.rows.map((r) => r.event_id);
  }

  /**
   * Return all event_ids that belong to a couple (used for "all" access type).
   */
  async getAllEventIdsByCoupleId(coupleId: string): Promise<string[]> {
    const result = await pool.query<{ id: string }>(
      `SELECT id FROM events WHERE couple_id = $1`,
      [coupleId]
    );
    return result.rows.map((r) => r.id);
  }

  /**
   * Verify that an event belongs to the given couple.
   */
  async eventBelongsToCouple(eventId: string, coupleId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM events WHERE id = $1 AND couple_id = $2`,
      [eventId, coupleId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export default new NotificationRepository();
