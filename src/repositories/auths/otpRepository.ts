import pool from "../../config/database";

export interface OTPVerification {
  id: string;
  session_id: string;
  phone_number: string;
  otp_code: string;
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

export class OTPRepository {
  async createOTP(sessionId: string, phoneNumber: string, otpCode: string, expiresAt: Date): Promise<OTPVerification> {
    const result = await pool.query(
      "INSERT INTO otp_verifications (session_id, phone_number, otp_code, expires_at) VALUES ($1, $2, $3, $4) RETURNING *",
      [sessionId, phoneNumber, otpCode, expiresAt]
    );
    return result.rows[0];
  }

  async findValidOTPBySession(sessionId: string): Promise<OTPVerification | null> {
    const result = await pool.query(
      "SELECT * FROM otp_verifications WHERE session_id = $1 AND is_used = false AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1",
      [sessionId]
    );
    return result.rows[0] || null;
  }

  async markOTPUsed(id: string): Promise<void> {
    await pool.query(
      "UPDATE otp_verifications SET is_used = true WHERE id = $1",
      [id]
    );
  }
}

export default new OTPRepository();
