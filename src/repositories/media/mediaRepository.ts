import pool from "../../config/database";

export interface Media {
  id: string;
  couple_id: string;
  file_url: string;
  is_pinned: boolean;
  created_at: Date;
}

class MediaRepository {
  async createMedia(data: { couple_id: string; file_url: string }): Promise<Media> {
    const query = `
      INSERT INTO media (couple_id, file_url)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [data.couple_id, data.file_url];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findByCoupleId(coupleId: string): Promise<Media[]> {
    const query = `
      SELECT * FROM media
      WHERE couple_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query, [coupleId]);
    return rows;
  }

  async findPinnedByCoupleId(coupleId: string): Promise<Media[]> {
    const query = `
      SELECT * FROM media
      WHERE couple_id = $1 AND is_pinned = TRUE
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query, [coupleId]);
    return rows;
  }

  async findById(id: string): Promise<Media | null> {
    const query = `SELECT * FROM media WHERE id = $1;`;
    const { rows } = await pool.query(query, [id]);
    return rows.length ? rows[0] : null;
  }

  async updatePinStatus(id: string, isPinned: boolean): Promise<Media> {
    const query = `
      UPDATE media
      SET is_pinned = $1
      WHERE id = $2
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [isPinned, id]);
    return rows[0];
  }
}

export default new MediaRepository();
