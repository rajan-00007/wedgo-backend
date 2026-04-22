import pool from "../../config/database";

export interface EventEntry {
  id: string;
  couple_id: string;
  access_id: string;
  user_device_id: string;
  created_at: Date;
}

export class EventEntriesRepository {
  async recordEntry(coupleId: string, accessId: string, userDeviceId: string): Promise<EventEntry | null> {
    const result = await pool.query(
      `INSERT INTO event_entries (couple_id, access_id, user_device_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (couple_id, access_id, user_device_id) DO NOTHING
       RETURNING *`,
      [coupleId, accessId, userDeviceId]
    );
    return result.rows[0] || null;
  }

  async getCountByCouple(coupleId: string): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(*) FROM event_entries WHERE couple_id = $1",
      [coupleId]
    );
    return parseInt(result.rows[0].count, 10) || 0;
  }

  async getUniqueUsersCountAcrossAllCouples(): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(DISTINCT user_device_id) FROM event_entries"
    );
    return parseInt(result.rows[0].count, 10) || 0;
  }

  async getCountsGroupedByCouple(): Promise<{ couple_id: string; count: number }[]> {
    const result = await pool.query(
      "SELECT couple_id, COUNT(*) as count FROM event_entries GROUP BY couple_id"
    );
    return result.rows.map(row => ({
      couple_id: row.couple_id,
      count: parseInt(row.count, 10) || 0
    }));
  }
}

export default new EventEntriesRepository();
