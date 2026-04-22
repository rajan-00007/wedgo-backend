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
  });

  describe("OtpRepository", () => {
    it("should create OTP (Lines 15-31)", async () => {
      const mockOtp = { session_id: "s1", otp_code: "1234" };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockOtp] });
      
      const otp = await otpRepository.createOTP("s1", "9876543210", "1234", new Date());
      expect(otp).toEqual(mockOtp);
    });

    it("should find OTP by session", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ otp_code: "1234" }] });
      const otp = await otpRepository.findValidOTPBySession("s1");
      expect(otp?.otp_code).toBe("1234");
    });
  });

  describe("RefreshTokenRepository", () => {
    it("should create token (Lines 15-40)", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      await refreshTokenRepository.createRefreshToken("u1", "t1", new Date());
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO refresh_tokens"), expect.any(Array));
    });

    it("should find and revoke tokens", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      await refreshTokenRepository.findValidToken("t1");
      await refreshTokenRepository.revokeToken("t1");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });
});
