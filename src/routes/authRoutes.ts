import { Router } from "express";
import authController from "../controllers/authController";

const router = Router();

console.log("Registering auth routes: /send-otp, /verify-otp");

// Route to send OTP
router.post("/send-otp", (req, res) => {
  console.log("POST /api/auth/send-otp hit");
  return authController.sendOTP(req, res);
});

// Route to verify OTP and login/signup
router.post("/verify-otp", (req, res) => authController.verifyOTP(req, res));

export default router;
