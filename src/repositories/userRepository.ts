import pool from "../config/database";

export interface User {
  id: string;
  phone_number: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT * FROM users WHERE phone_number = $1",
      [phoneNumber]
    );
    return result.rows[0] || null;
  }

  async createUser(phoneNumber: string): Promise<User> {
    const result = await pool.query(
      "INSERT INTO users (phone_number, is_verified) VALUES ($1, $2) RETURNING *",
      [phoneNumber, false]
    );
    return result.rows[0];
  }

  async verifyUser(id: string): Promise<void> {
    await pool.query(
      "UPDATE users SET is_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }
}

export default new UserRepository();
