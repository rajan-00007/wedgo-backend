import { Router } from "express";
import authController from "../controllers/authController";

const router = Router();

// Route to send OTP
router.post("/send-otp", (req, res) => {
  return authController.sendOTP(req, res);
});

// Route to verify OTP and login/signup
router.post("/verify-otp", (req, res) => authController.verifyOTP(req, res));

// Route to refresh tokens
router.post("/refresh-token", (req, res) => authController.refreshToken(req, res));

// Route to logout
router.post("/logout", (req, res) => authController.logout(req, res));

export default router;
