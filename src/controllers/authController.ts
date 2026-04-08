import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/userRepository";
import otpRepository from "../repositories/otpRepository";
import coupleProfileRepository from "../repositories/coupleProfileRepository";
import crypto from "crypto";
import { msg91Provider } from "../providers/msg91Provider";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export class AuthController {
  // 1. Send OTP (Generate & Store)
  async sendOTP(req: Request, res: Response): Promise<void> {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ message: "Phone number is required." });
      return;
    }

    // For now, simple random 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const sessionId = crypto.randomUUID();

    try {
      await otpRepository.createOTP(sessionId, phoneNumber, otpCode, expiresAt);
      
      // Since it's mockup for now
      console.log(`[OTP Mock] Phone: ${phoneNumber}, Code: ${otpCode}`);

      // Send OTP via MSG91
      try {
        await msg91Provider.send(phoneNumber, `Your OTP is ${otpCode}`, { otp: otpCode });
      } catch (providerError: any) {
        console.error("Failed to send OTP via MSG91:", providerError.message);
        
      }
      
      res.status(200).json({ 
        message: "OTP sent successfully.", 
        sessionId: sessionId,
        otpCode: otpCode
      });
    } catch (error) {
      console.error("Error creating OTP:", error);
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

      // Mark OTP as used
      await otpRepository.markOTPUsed(latestOTP.id);

      const phoneNumber = latestOTP.phone_number;

      // Check if user exists
      let user = await userRepository.findByPhoneNumber(phoneNumber);
      let isNewUser = false;

      if (!user) {
        user = await userRepository.createUser(phoneNumber);
        isNewUser = true;
      }

      // If user exists, check if profile exists
      const profile = await coupleProfileRepository.findByUserId(user.id);
      const needsProfile = !profile;

      // Generate JWT
      const token = jwt.sign({ id: user.id, phoneNumber: user.phone_number }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({
        message: "OTP verified correctly.",
        token,
        user: {
          id: user.id,
          phoneNumber: user.phone_number,
          isVerified: user.is_verified,
        },
        needsProfile,
        profile: profile || null,
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP." });
    }
  }
}

export default new AuthController();
