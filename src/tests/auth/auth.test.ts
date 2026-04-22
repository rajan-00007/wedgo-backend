import request from "supertest";
import app from "../../app";
import userRepository from "../../repositories/auths/userRepository";
import otpRepository from "../../repositories/auths/otpRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import refreshTokenRepository from "../../repositories/auths/refreshTokenRepository";
import { msg91Provider } from "../../providers/msg91Provider";
import jwt from "jsonwebtoken";

jest.mock("../../repositories/auths/userRepository");
jest.mock("../../repositories/auths/otpRepository");
jest.mock("../../repositories/coupleProfileRepository");
jest.mock("../../repositories/auths/refreshTokenRepository");
jest.mock("../../providers/msg91Provider");
jest.mock("../../utils/logger");

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

describe("Auth Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/send-otp", () => {
    it("should send OTP successfully", async () => {
      (otpRepository.createOTP as jest.Mock).mockResolvedValue(undefined);
      (msg91Provider.send as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({ phoneNumber: "1234567890" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("OTP sent successfully.");
      expect(response.body.sessionId).toBeDefined();
    });

    it("should return 400 if phoneNumber is missing", async () => {
      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Phone number is required.");
    });

    it("should return 500 if database fails", async () => {
      (otpRepository.createOTP as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({ phoneNumber: "1234567890" });

      expect(response.status).toBe(500);
    });

    it("should handle MSG91 provider error gracefully", async () => {
      (otpRepository.createOTP as jest.Mock).mockResolvedValue(undefined);
      (msg91Provider.send as jest.Mock).mockRejectedValue(new Error("MSG91 Error"));

      const response = await request(app)
        .post("/api/auth/send-otp")
        .send({ phoneNumber: "1234567890" });

      expect(response.status).toBe(200); // Controller swallows provider error
    });
  });

  describe("POST /api/auth/verify-otp", () => {
    it("should verify OTP and return tokens", async () => {
      const mockOTP = { id: "1", phone_number: "1234567890", otp_code: "1234" };
      const mockUser = { id: "user-1", phone_number: "1234567890", is_verified: true };
      
      (otpRepository.findValidOTPBySession as jest.Mock).mockResolvedValue(mockOTP);
      (userRepository.findByPhoneNumber as jest.Mock).mockResolvedValue(mockUser);
      (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/verify-otp")
        .send({ sessionId: "sess-1", otpCode: "1234" });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.needsProfile).toBe(true);
    });

    it("should return 400 if sessionId or otpCode is missing", async () => {
      const response = await request(app)
        .post("/api/auth/verify-otp")
        .send({ sessionId: "sess-1" });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid OTP", async () => {
      (otpRepository.findValidOTPBySession as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/verify-otp")
        .send({ sessionId: "sess-1", otpCode: "1234" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid or expired OTP.");
    });

    it("should create user if not exists", async () => {
        const mockOTP = { id: "1", phone_number: "1234567890", otp_code: "1234" };
        const mockUser = { id: "user-1", phone_number: "1234567890", is_verified: true };
        
        (otpRepository.findValidOTPBySession as jest.Mock).mockResolvedValue(mockOTP);
        (userRepository.findByPhoneNumber as jest.Mock).mockResolvedValue(null);
        (userRepository.createUser as jest.Mock).mockResolvedValue(mockUser);
  
        const response = await request(app)
          .post("/api/auth/verify-otp")
          .send({ sessionId: "sess-1", otpCode: "1234" });
  
        expect(userRepository.createUser).toHaveBeenCalledWith("1234567890");
        expect(response.status).toBe(200);
    });

    it("should return 500 if error occurs", async () => {
        (otpRepository.findValidOTPBySession as jest.Mock).mockRejectedValue(new Error("Error"));
  
        const response = await request(app)
          .post("/api/auth/verify-otp")
          .send({ sessionId: "sess-1", otpCode: "1234" });
  
        expect(response.status).toBe(500);
      });
  });

  describe("POST /api/auth/refresh-token", () => {
    it("should refresh access token", async () => {
      const mockUser = { id: "user-1", phone_number: "1234567890" };
      const refreshToken = jwt.sign({ id: "user-1" }, REFRESH_TOKEN_SECRET);
      
      (refreshTokenRepository.findValidToken as jest.Mock).mockResolvedValue({ user_id: "user-1" });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });

    it("should return 401 if refreshToken is missing", async () => {
      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({});

      expect(response.status).toBe(401);
    });

    it("should return 403 for invalid stored token", async () => {
        (refreshTokenRepository.findValidToken as jest.Mock).mockResolvedValue(null);
  
        const response = await request(app)
          .post("/api/auth/refresh-token")
          .send({ refreshToken: "invalid" });
  
        expect(response.status).toBe(403);
    });

    it("should return 403 if jwt.verify fails", async () => {
        (refreshTokenRepository.findValidToken as jest.Mock).mockResolvedValue({ user_id: "user-1" });
        jest.spyOn(jwt, "verify").mockImplementation((token, secret, callback: any) => {
            callback(new Error("Invalid"), null);
        });

        const response = await request(app)
          .post("/api/auth/refresh-token")
          .send({ refreshToken: "valid" });

        expect(response.status).toBe(403);
        (jwt.verify as jest.Mock).mockRestore();
    });

    it("should return 403 if user not found during refresh", async () => {
        (refreshTokenRepository.findValidToken as jest.Mock).mockResolvedValue({ user_id: "user-1" });
        jest.spyOn(jwt, "verify").mockImplementation((token, secret, callback: any) => {
            callback(null, { id: "user-1" });
        });
        (userRepository.findById as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .post("/api/auth/refresh-token")
          .send({ refreshToken: "valid" });

        expect(response.status).toBe(403);
        (jwt.verify as jest.Mock).mockRestore();
    });

    it("should return 500 if unexpected error occurs in refreshToken", async () => {
        (refreshTokenRepository.findValidToken as jest.Mock).mockRejectedValue(new Error("Unexpected"));

        const response = await request(app)
          .post("/api/auth/refresh-token")
          .send({ refreshToken: "valid" });

        expect(response.status).toBe(500);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken: "token-123" });

      expect(response.status).toBe(200);
      expect(refreshTokenRepository.revokeToken).toHaveBeenCalledWith("token-123");
    });

    it("should handle revokeToken error gracefully", async () => {
        (refreshTokenRepository.revokeToken as jest.Mock).mockRejectedValue(new Error("Revoke Error"));
  
        const response = await request(app)
          .post("/api/auth/logout")
          .send({ refreshToken: "token-123" });
  
        expect(response.status).toBe(200); // Errors are logged but response is 200
      });

    it("should logout successfully even if token missing", async () => {
        const response = await request(app)
          .post("/api/auth/logout")
          .send({});
  
        expect(response.status).toBe(200);
      });
  });
});
