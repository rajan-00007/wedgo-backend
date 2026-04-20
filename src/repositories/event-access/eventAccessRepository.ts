import pool from "../../config/database";

export interface EventAccess {
  id: string;
  couple_id: string;
  token: string;
  access_type: 'all' | 'custom';
  expires_at?: Date;
  created_at: Date;
  qr_image_url?: string;
}

export class EventAccessRepository {
  async createAccess(data: {
    couple_id: string;
    token: string;
    access_type: 'all' | 'custom';
    expires_at?: Date;
    qr_image_url?: string;
  }): Promise<EventAccess> {
    const result = await pool.query(
      `INSERT INTO event_access (couple_id, token, access_type, expires_at, qr_image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.couple_id, data.token, data.access_type, data.expires_at || null, data.qr_image_url || null]
    );
    return result.rows[0];
  }

  async findByToken(token: string): Promise<EventAccess | null> {
    const result = await pool.query(
      "SELECT * FROM event_access WHERE token = $1",
      [token]
    );
    return result.rows[0] || null;
  }

  async findByCoupleAndType(coupleId: string, accessType: 'all' | 'custom'): Promise<EventAccess | null> {
    const result = await pool.query(
      "SELECT * FROM event_access WHERE couple_id = $1 AND access_type = $2",
      [coupleId, accessType]
    );
    return result.rows[0] || null;
  }

  async addEventsToAccess(accessId: string, eventIds: string[]): Promise<void> {
    const queries = eventIds.map(eventId => 
      pool.query(
        "INSERT INTO event_access_events (access_id, event_id) VALUES ($1, $2)",
        [accessId, eventId]
      )
    );
    await Promise.all(queries);
  }

  async getMappedEvents(accessId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT e.*
       FROM events e
       JOIN event_access_events aee ON e.id = aee.event_id
       WHERE aee.access_id = $1`,
      [accessId]
    );
    return result.rows;
  }
}

export default new EventAccessRepository();
