import pool from "../config/database";

export interface CoupleProfile {
  id: string;
  user_id: string;
  partner1_name: string;
  partner2_name: string;
  event_date: Date;
  wallpaper_type?: string;
  wallpaper_id?: string;
  custom_wallpaper_urls?: string[];
  created_at: Date;
  updated_at: Date;
}

export class CoupleProfileRepository {
  async findByUserId(userId: string): Promise<CoupleProfile | null> {
    const result = await pool.query(
      "SELECT * FROM couple_profiles WHERE user_id = $1",
      [userId]
    );
    return result.rows[0] || null;
  }

  async createProfile(userId: string, partner1: string, partner2: string, eventDate: Date, wallpaperType?: string, wallpaperId?: string): Promise<CoupleProfile> {
    const result = await pool.query(
      "INSERT INTO couple_profiles (user_id, partner1_name, partner2_name, event_date, wallpaper_type, wallpaper_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [userId, partner1, partner2, eventDate, wallpaperType || null, wallpaperId || null]
    );
    return result.rows[0];
  }

  async updateProfile(userId: string, partner1: string, partner2: string, eventDate: Date, wallpaperType?: string, wallpaperId?: string): Promise<CoupleProfile> {
    const result = await pool.query(
      "UPDATE couple_profiles SET partner1_name = $1, partner2_name = $2, event_date = $3, wallpaper_type = COALESCE($4, wallpaper_type), wallpaper_id = COALESCE($5, wallpaper_id), updated_at = CURRENT_TIMESTAMP WHERE user_id = $6 RETURNING *",
      [partner1, partner2, eventDate, wallpaperType || null, wallpaperId || null, userId]
    );
    return result.rows[0];
  }

  async updatePresetWallpaper(userId: string, wallpaperId: string): Promise<void> {
    await pool.query(
      `UPDATE couple_profiles
       SET 
         wallpaper_type = 'preset',
         wallpaper_id = $1,
         custom_wallpaper_urls = NULL
       WHERE user_id = $2`,
      [wallpaperId, userId]
    );
  }

  async setCustomWallpaperUrls(userId: string, urls: string[]): Promise<void> {
    await pool.query(
      `UPDATE couple_profiles
       SET 
         custom_wallpaper_urls = $1,
         wallpaper_type = 'custom',
         wallpaper_id = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [urls, userId]
    );
  }
}

export default new CoupleProfileRepository();