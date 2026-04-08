import pool from "../config/database";
import { hashToken } from "../utils/hash";

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  is_revoked: boolean;
  expires_at: Date;
  created_at: Date;
}

export class RefreshTokenRepository {
  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const hashedToken = hashToken(token);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userId, hashedToken, expiresAt]
    );
  }

  async findValidToken(token: string): Promise<RefreshToken | null> {
    const hashedToken = hashToken(token);
    const result = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP",
      [hashedToken]
    );
    return result.rows[0] || null;
  }

  async revokeToken(token: string): Promise<void> {
    const hashedToken = hashToken(token);
    await pool.query(
      "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1",
      [hashedToken]
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await pool.query(
      "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1",
      [userId]
    );
  }
}

export default new RefreshTokenRepository();

