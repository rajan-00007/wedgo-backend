import userRepository from "../../repositories/auths/userRepository";
import otpRepository from "../../repositories/auths/otpRepository";
import refreshTokenRepository from "../../repositories/auths/refreshTokenRepository";
import pool from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn()
}));

describe("Auth Repositories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("UserRepository", () => {
    it("should find user by phone", async () => {
      const mockUser = { id: "1", phone_number: "9876543210" };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      
      const user = await userRepository.findByPhoneNumber("9876543210");
      expect(user).toEqual(mockUser);
    });

    it("should create user (Lines 13-40)", async () => {
      const mockUser = { id: "1", phone_number: "9876543210" };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      
      const user = await userRepository.createUser("9876543210");
      expect(user).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"), ["9876543210", false]);
    });

    it("should verify user (Lines 29-33)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await userRepository.verifyUser("u1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE users"), ["u1"]);
    });

    it("should find user by id (Lines 35-41)", async () => {
        (pool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: "u1" }] })
            .mockResolvedValueOnce({ rows: [] });
        
        const u1 = await userRepository.findById("u1");
        expect(u1?.id).toBe("u1");

        const u2 = await userRepository.findById("u2");
        expect(u2).toBeNull();
    });

    it("should return null if user not found by phone (Line 17 branch)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        const user = await userRepository.findByPhoneNumber("000");
        expect(user).toBeNull();
    });
  });

  describe("OtpRepository", () => {
    it("should create OTP (Lines 15-31)", async () => {
      const mockOtp = { session_id: "s1", otp_code: "1234" };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockOtp] });
      
      const otp = await otpRepository.createOTP("s1", "9876543210", "1234", new Date());
      expect(otp).toEqual(mockOtp);
    });

    it("should find OTP by session (Line 27 branch)", async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ otp_code: "1234" }] })
        .mockResolvedValueOnce({ rows: [] });

      const otp = await otpRepository.findValidOTPBySession("s1");
      expect(otp?.otp_code).toBe("1234");

      const otp2 = await otpRepository.findValidOTPBySession("s2");
      expect(otp2).toBeNull();
    });

    it("should mark OTP as used (Lines 30-35)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await otpRepository.markOTPUsed("o1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE otp_verifications"), ["o1"]);
    });
  });

  describe("RefreshTokenRepository", () => {
    it("should create token (Lines 15-40)", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      await refreshTokenRepository.createRefreshToken("u1", "t1", new Date());
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO refresh_tokens"), expect.any(Array));
    });

    it("should find and revoke tokens (Line 28 branch)", async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ token: "t1" }] })
        .mockResolvedValueOnce({ rows: [] });

      const t1 = await refreshTokenRepository.findValidToken("t1");
      expect(t1?.token).toBe("t1");

      const t2 = await refreshTokenRepository.findValidToken("t2");
      expect(t2).toBeNull();

      await refreshTokenRepository.revokeToken("t1");
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it("should revoke all user tokens (Lines 39-44)", async () => {
        (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
        await refreshTokenRepository.revokeAllUserTokens("u1");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE refresh_tokens"), ["u1"]);
    });
  });
});
