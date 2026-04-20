import { Router } from "express";
import { setupUpi, getUpiDetails, updateUpi, setupBank, updateBank, getBankDetails, getPublicUpiDetails } from "../../controllers/payment-setup/paymentController";
import { authenticateToken } from "../../middlewares/auth/authMiddleware";
import { upload } from "../../middlewares/multer/upload";

const router = Router();

/**
 * @route POST /api/payment-setup/upi
 * @desc Setup or update UPI/QR details
 * @access Private
 */
router.post("/upi", authenticateToken, upload.single("qr_image"), setupUpi);

/**
 * @route GET /api/payment-setup/upi
 * @desc Get UPI details
 * @access Private
 */
router.get("/upi", authenticateToken, getUpiDetails);

/**
 * @route GET /api/payment-setup/upi/public/:coupleId
 * @desc Get UPI details without authentication
 * @access Public
 */
router.get("/upi/public/:coupleId", getPublicUpiDetails);



/**
 * @route PUT /api/payment-setup/upi
 * @desc Update UPI/QR details
 * @access Private
 */
router.put("/upi", authenticateToken, upload.single("qr_image"), updateUpi);

/**
 * @route POST /api/payment-setup/bank
 * @desc Setup Bank details
 * @access Private
 */
router.post("/bank", authenticateToken, setupBank);

/**
 * @route PUT /api/payment-setup/bank
 * @desc Update Bank details
 * @access Private
 */
router.put("/bank", authenticateToken, updateBank);

/**
 * @route GET /api/payment-setup/bank
 * @desc Get Bank details
 * @access Private
 */
router.get("/bank", authenticateToken, getBankDetails);

export default router;
