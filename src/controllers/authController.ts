import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/auths/userRepository";
import otpRepository from "../repositories/auths/otpRepository";
import coupleProfileRepository from "../repositories/coupleProfileRepository";
import refreshTokenRepository from "../repositories/auths/refreshTokenRepository";
import crypto from "crypto";
import { msg91Provider } from "../providers/msg91Provider";
import logger from "../utils/logger";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

export class AuthController {
  // 1. Send OTP (Generate & Store)
  async sendOTP(req: Request, res: Response): Promise<void> {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ message: "Phone number is required." });
      return;
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const sessionId = crypto.randomUUID();

    try {
      await otpRepository.createOTP(sessionId, phoneNumber, otpCode, expiresAt);
      
/*       logger.info(`[OTP] Phone: ${phoneNumber}, Code: ${otpCode}, Session: ${sessionId}`); */

      try {
        await msg91Provider.send(phoneNumber, `Your OTP is ${otpCode}`, { otp: otpCode });
      } catch (providerError: any) {
        logger.error("Failed to send OTP via MSG91:", providerError.message);
      }
      
      res.status(200).json({ 
        message: "OTP sent successfully.", 
        sessionId: sessionId
      });
    } catch (error) {
      logger.error("Error creating OTP:", error);
      res.status(500).json({ message: "Failed to send OTP." });
    }
  }

  // 2. Verify OTP & Handle Login/Signup flow
  async verifyOTP(req: Request, res: Response): Promise<void> {
    const { sessionId, otpCode } = req.body;
    if (!sessionId || !otpCode) {
      res.status(400).json({ message: "Session ID and OTP code are required." });
      return;
    }

    try {
      const latestOTP = await otpRepository.findValidOTPBySession(sessionId);
      if (!latestOTP || latestOTP.otp_code !== otpCode) {
        res.status(400).json({ message: "Invalid or expired OTP." });
        return;
      }

      await otpRepository.markOTPUsed(latestOTP.id);

      const phoneNumber = latestOTP.phone_number;

      let user = await userRepository.findByPhoneNumber(phoneNumber);
      if (!user) {
        user = await userRepository.createUser(phoneNumber);
      }

      const profile = await coupleProfileRepository.findByUserId(user.id);
      const needsProfile = !profile;

      const accessToken = jwt.sign(
        { id: user.id, phoneNumber: user.phone_number },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      // Save refresh token in DB with expiration (7 days)
      const rtExpiresAt = new Date(Date.now() + 7 * 24 * 3600000);
      await refreshTokenRepository.createRefreshToken(user.id, refreshToken, rtExpiresAt);

      // Refresh token: httpOnly cookie, strict, scoped to /api/auth so both
      // /refresh-token and /logout endpoints can access it.
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 3600000,
      });

      // Access token: returned in response body — stored in-memory on the client
      // Refresh token: also in body so frontend can persist it for cross-origin setups
      res.status(200).json({
        message: "OTP verified correctly.",
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phoneNumber: user.phone_number,
          isVerified: user.is_verified,
        },
        needsProfile,
        profile: profile || null,
      });
    } catch (error) {
      logger.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP." });
    }
  }

  // 3. Refresh Access Token
  async refreshToken(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    logger.info(`[Auth] Refresh Token request. Cookie found: ${!!req.cookies.refreshToken}, Body found: ${!!req.body.refreshToken}`);

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token is required." });
      return;
    }

    try {
      const storedToken = await refreshTokenRepository.findValidToken(refreshToken);
      if (!storedToken) {
        res.status(403).json({ message: "Invalid or expired refresh token." });
        return;
      }

      jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (err: any, decoded: any) => {
        if (err || storedToken.user_id !== decoded.id) {
          res.status(403).json({ message: "Invalid refresh token." });
          return;
        }

        // Rotate access token
        const user = await userRepository.findById(storedToken.user_id);
        if (!user) {
          res.status(403).json({ message: "User not found." });
          return;
        }

        const profile = await coupleProfileRepository.findByUserId(user.id);
        const needsProfile = !profile;

        const accessToken = jwt.sign(
          { id: user.id, phoneNumber: user.phone_number },
          ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );

        // Return new access token and user info
        res.status(200).json({
          accessToken,
          user: {
            id: user.id,
            phoneNumber: user.phone_number,
            isVerified: user.is_verified,
          },
          needsProfile,
          profile: profile || null,
        });
      });
    } catch (error) {
      logger.error("Refresh token error:", error);
      res.status(500).json({ message: "Failed to refresh token." });
    }
  }

  // 4. Logout
  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      try {
        await refreshTokenRepository.revokeToken(refreshToken);
      } catch (error) {
        logger.error("Logout error (revoking token):", error);
      }
    }

    res.clearCookie("refreshToken", { path: "/" });

    res.status(200).json({ message: "Logged out successfully." });
  }
}

export default new AuthController();
