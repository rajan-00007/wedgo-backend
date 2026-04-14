import pool from "../../config/database";

export interface Event {
  id: string;
  couple_id: string;
  name: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  dress_code: string | null;
  description: string | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEventDTO {
  couple_id: string;
  name: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  dress_code?: string;
  description?: string;
  location?: string;
}

export interface UpdateEventDTO {
  name?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  dress_code?: string;
  description?: string;
  location?: string;
}

export class EventsRepository {
  async createEvent(data: CreateEventDTO): Promise<Event> {
    const result = await pool.query(
      `INSERT INTO events (
        couple_id, name, event_date, start_time, end_time, dress_code, description, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        data.couple_id,
        data.name,
        data.event_date,
        data.start_time || null,
        data.end_time || null,
        data.dress_code || null,
        data.description || null,
        data.location || null,
      ]
    );
    return result.rows[0];
  }

  async findByCoupleId(coupleId: string): Promise<Event[]> {
    const result = await pool.query(
      "SELECT * FROM events WHERE couple_id = $1 ORDER BY event_date ASC, start_time ASC",
      [coupleId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<Event | null> {
    const result = await pool.query("SELECT * FROM events WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  async updateEvent(id: string, data: UpdateEventDTO): Promise<Event | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let query = "UPDATE events SET ";

    Object.entries(data).forEach(([key, value], index) => {
      fields.push(`${key} = $${index + 1}`);
      values.push(value);
    });

    if (fields.length === 0) return null;

    query += fields.join(", ");
    query += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await pool.query("DELETE FROM events WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async areEventsOwnedByCouple(coupleId: string, eventIds: string[]): Promise<boolean> {
    const result = await pool.query(
      "SELECT COUNT(*) FROM events WHERE couple_id = $1 AND id = ANY($2)",
      [coupleId, eventIds]
    );
    return parseInt(result.rows[0].count) === eventIds.length;
  }
}

export default new EventsRepository();
