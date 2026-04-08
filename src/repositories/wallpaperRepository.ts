import pool from "../config/database";

export interface Wallpaper {
  id: string;
  image_url: string;
  created_at: Date;
}

export class WallpaperRepository {
  async getAllWallpapers(): Promise<Wallpaper[]> {
    const result = await pool.query(
      "SELECT * FROM wallpapers ORDER BY created_at ASC"
    );
    return result.rows;
  }
}

export default new WallpaperRepository();
