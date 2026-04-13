import pool from "../../config/database";

export interface Blessing {
  id: string;
  couple_id: string;
  name: string;
  message: string;
  image_url: string | null;
  is_pinned: boolean;
  created_at: Date;
}

export interface CreateBlessingDTO {
  couple_id: string;
  name: string;
  message: string;
  image_url?: string;
}

export class BlessingsRepository {
  async createBlessing(data: CreateBlessingDTO): Promise<Blessing> {
    const result = await pool.query(
      `INSERT INTO blessings (
        couple_id, name, message, image_url
      ) VALUES ($1, $2, $3, $4) 
      RETURNING *`,
      [
        data.couple_id,
        data.name,
        data.message,
        data.image_url || null,
      ]
    );
    return result.rows[0];
  }

  async findByCoupleId(coupleId: string): Promise<Blessing[]> {
    const result = await pool.query(
      "SELECT * FROM blessings WHERE couple_id = $1 ORDER BY is_pinned DESC, created_at DESC",
      [coupleId]
    );
    return result.rows;
  }
 
  async findById(id: string): Promise<Blessing | null> {
    const result = await pool.query("SELECT * FROM blessings WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  async deleteBlessing(id: string): Promise<boolean> {
    const result = await pool.query("DELETE FROM blessings WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async updatePinStatus(id: string, isPinned: boolean): Promise<Blessing | null> {
    const result = await pool.query(
      "UPDATE blessings SET is_pinned = $1 WHERE id = $2 RETURNING *",
      [isPinned, id]
    );
    return result.rows[0] || null;
  }

  async findPinnedByCoupleId(coupleId: string): Promise<Blessing[]> {
    const result = await pool.query(
      "SELECT * FROM blessings WHERE couple_id = $1 AND is_pinned = TRUE ORDER BY created_at DESC",
      [coupleId]
    );
    return result.rows;
  }
}

export default new BlessingsRepository();
 