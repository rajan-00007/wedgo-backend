import paymentRepository from "../../repositories/payment-setup/paymentRepository";
import pool from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn()
}));

describe("Payment Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should upsert UPI details (Lines 18-72 logic coverage)", async () => {
    // Mock check for existing (null for create)
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // findByCoupleId
      .mockResolvedValueOnce({ rows: [{ id: "p1" }] }); // INSERT
    
    await paymentRepository.upsertUpi({ couple_id: "c1", upi_id: "u1", display_name: "D", qr_image_url: "q" });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO payment_methods"), expect.any(Array));

    // Mock update path
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: "p1" }] }) // findByCoupleId
      .mockResolvedValueOnce({ rows: [{ id: "p1" }] }); // UPDATE
    
    await paymentRepository.upsertUpi({ couple_id: "c1", upi_id: "u2", display_name: "D2", qr_image_url: "q2" });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE payment_methods"), expect.any(Array));
  });

  it("should upsert bank details", async () => {
    // Mock check for existing (null for create)
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // findByCoupleId
      .mockResolvedValueOnce({ rows: [{ id: "p1" }] }); // INSERT
    
    await paymentRepository.upsertBank({ couple_id: "c1", account_holder_name: "N", account_number: "A", ifsc_code: "I", bank_name: "B" });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO payment_methods"), expect.any(Array));

    // Mock update path
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: "p1" }] }) // findByCoupleId
      .mockResolvedValueOnce({ rows: [{ id: "p1" }] }); // UPDATE
    
    await paymentRepository.upsertBank({ couple_id: "c1", account_holder_name: "N2", account_number: "A2", ifsc_code: "I2", bank_name: "B2" });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE payment_methods"), expect.any(Array));
  });
});
