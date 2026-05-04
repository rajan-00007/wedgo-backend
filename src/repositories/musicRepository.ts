import pool from "../config/database";

export interface MusicTrack {
  id: string;
  title: string;
  category: string;
  file_url: string;
  is_active: boolean;
  created_at: Date;
}

export class MusicRepository {
  async getAllActiveTracks(): Promise<MusicTrack[]> {
    const result = await pool.query(
      "SELECT * FROM music_library WHERE is_active = true ORDER BY created_at ASC"
    );
    return result.rows;
  }
}

export default new MusicRepository();
