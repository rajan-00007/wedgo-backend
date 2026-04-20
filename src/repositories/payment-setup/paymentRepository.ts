import pool from "../../config/database";

export interface PaymentMethod {
  id: string;
  couple_id: string;
  upi_id?: string;
  display_name?: string;
  qr_image_url?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  created_at: Date;
}

class PaymentRepository {
  async findByCoupleId(coupleId: string): Promise<PaymentMethod | null> {
    const query = `
      SELECT * FROM payment_methods
      WHERE couple_id = $1;
    `;
    const { rows } = await pool.query(query, [coupleId]);
    return rows.length ? rows[0] : null;
  }

  async upsertUpi(data: { couple_id: string; upi_id: string; display_name: string; qr_image_url: string }): Promise<PaymentMethod> {
    const existing = await this.findByCoupleId(data.couple_id);

    if (existing) {
      const query = `
        UPDATE payment_methods
        SET upi_id = $1, display_name = $2, qr_image_url = $3
        WHERE id = $4
        RETURNING *;
      `;
      const values = [data.upi_id, data.display_name, data.qr_image_url, existing.id];
      const { rows } = await pool.query(query, values);
      return rows[0];
    } else {
      const query = `
        INSERT INTO payment_methods (couple_id, upi_id, display_name, qr_image_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const values = [data.couple_id, data.upi_id, data.display_name, data.qr_image_url];
      const { rows } = await pool.query(query, values);
      return rows[0];
    }
  }

  async upsertBank(data: { couple_id: string; account_holder_name: string; account_number: string; ifsc_code: string; bank_name: string; }): Promise<PaymentMethod> {
    const existing = await this.findByCoupleId(data.couple_id);

    if (existing) {
      const query = `
        UPDATE payment_methods
        SET account_holder_name = $1, account_number = $2, ifsc_code = $3, bank_name = $4
        WHERE id = $5
        RETURNING *;
      `;
      const values = [data.account_holder_name, data.account_number, data.ifsc_code, data.bank_name, existing.id];
      const { rows } = await pool.query(query, values);
      return rows[0];
    } else {
      const query = `
        INSERT INTO payment_methods (couple_id, account_holder_name, account_number, ifsc_code, bank_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const values = [data.couple_id, data.account_holder_name, data.account_number, data.ifsc_code, data.bank_name];
      const { rows } = await pool.query(query, values);
      return rows[0];
    }
  }
}

export default new PaymentRepository();
