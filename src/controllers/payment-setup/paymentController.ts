import { Request, Response } from "express";
import paymentRepository from "../../repositories/payment-setup/paymentRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import logger from "../../utils/logger";
import { uploadImage } from "../../services/minio/minio.service";
import { AuthRequest } from "../../middlewares/auth/authMiddleware";
import { ZodError } from "zod";
import { upiSetupSchema, upiUpdateSchema, bankSetupSchema, bankUpdateSchema } from "../../validators/payment-setup/paymentValidator";
import { getFullMediaUrl } from "../../utils/urlUtils";


/**
 * @desc Setup or update UPI/QR details
 * @route POST /api/payment-setup/upi
 */
export const setupUpi = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const file = req.file;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const validatedData = upiSetupSchema.parse(req.body);
    const upi_id = validatedData.upi_id;
    const display_name = validatedData.display_name;
    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found" });
      return;
    }

    let qr_image_url = "";
    // If a new QR image is uploaded, process it
    if (file) {
      qr_image_url = await uploadImage(file, "qrcodes");
    } else {
      // If no new file given, ideally we should keep the existing url if we are updating.
      const existing = await paymentRepository.findByCoupleId(profile.id);
      if (existing && existing.qr_image_url) {
        qr_image_url = existing.qr_image_url;
      } else {
        res.status(400).json({ message: "QR image is required for new setup" });
        return;
      }
    }

    const paymentMethod = await paymentRepository.upsertUpi({
      couple_id: profile.id,
      upi_id,
      display_name,
      qr_image_url
    });

    res.status(200).json({
      message: "UPI details saved successfully",
      upi_details: {
        upi_id: paymentMethod.upi_id,
        display_name: paymentMethod.display_name,
        qr_image_url: getFullMediaUrl(paymentMethod.qr_image_url)
      }
    });

  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Validation failed.",
        errors: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
      return;
    }
    logger.error(`Error saving UPI details: ${error}`);
    res.status(500).json({ message: "Failed to save UPI details" });
  }
};

/**
 * @desc Update UPI/QR details
 * @route PUT /api/payment-setup/upi
 */
export const updateUpi = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const file = req.file;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const validatedData = upiUpdateSchema.parse(req.body);
    const { upi_id, display_name } = validatedData;
    
    // Validate that at least one field is provided
    if (!upi_id && !display_name && !file) {
      res.status(400).json({ message: "Nothing to update." });
      return;
    }

    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found" });
      return;
    }

    const existing = await paymentRepository.findByCoupleId(profile.id);
    if (!existing) {
      res.status(404).json({ message: "UPI details not found. Please setup first." });
      return;
    }

    let qr_image_url = existing.qr_image_url || "";
    if (file) {
      qr_image_url = await uploadImage(file, "qrcodes");
    }

    const updatedUpiId = upi_id || existing.upi_id || "";
    const updatedDisplayName = display_name || existing.display_name || "";

    const paymentMethod = await paymentRepository.upsertUpi({
      couple_id: profile.id,
      upi_id: updatedUpiId,
      display_name: updatedDisplayName,
      qr_image_url
    });

    res.status(200).json({
      message: "UPI details updated successfully",
      upi_details: {
        upi_id: paymentMethod.upi_id,
        display_name: paymentMethod.display_name,
        qr_image_url: getFullMediaUrl(paymentMethod.qr_image_url)
      }
    });

  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Validation failed.",
        errors: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
      return;
    }
    logger.error(`Error updating UPI details: ${error}`);
    res.status(500).json({ message: "Failed to update UPI details" });
  }
};

/**
 * @desc Get UPI details
 * @route GET /api/payment-setup/upi
 */
export const getUpiDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found" });
      return;
    }

    const paymentMethod = await paymentRepository.findByCoupleId(profile.id);
    if (!paymentMethod) {
      res.status(404).json({ message: "UPI details not found" });
      return;
    }

    res.status(200).json({
      upi_details: {
        upi_id: paymentMethod.upi_id,
        display_name: paymentMethod.display_name,
        qr_image_url: getFullMediaUrl(paymentMethod.qr_image_url)
      }
    });

  } catch (error) {
    logger.error(`Error fetching UPI details: ${error}`);
    res.status(500).json({ message: "Failed to fetch UPI details" });
  }
};

/**
 * @desc Setup Bank details
 * @route POST /api/payment-setup/bank
 */
export const setupBank = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const validatedData = bankSetupSchema.parse(req.body);
    const { account_holder_name, account_number, ifsc_code, bank_name } = validatedData;
    
    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found" });
      return;
    }

    const paymentMethod = await paymentRepository.upsertBank({
      couple_id: profile.id,
      account_holder_name,
      account_number,
      ifsc_code,
      bank_name
    });

    res.status(200).json({
      message: "Bank details saved successfully",
      bank_details: {
        account_holder_name: paymentMethod.account_holder_name,
        account_number: paymentMethod.account_number,
        ifsc_code: paymentMethod.ifsc_code,
        bank_name: paymentMethod.bank_name
      }
    });

  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Validation failed.",
        errors: error.issues.map((err: any) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
      return;
    }
    logger.error(`Error saving Bank details: ${error}`);
    res.status(500).json({ message: "Failed to save Bank details" });
  }
};

/**
 * @desc Update Bank details
 * @route PUT /api/payment-setup/bank
 */
export const updateBank = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const validatedData = bankUpdateSchema.parse(req.body);
    const { account_holder_name, account_number, ifsc_code, bank_name } = validatedData;

    if (!account_holder_name && !account_number && !ifsc_code && !bank_name) {
      res.status(400).json({ message: "Nothing to update." });
      return;
    }

    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found" });
      return;
    }

    const existing = await paymentRepository.findByCoupleId(profile.id);
    if (!existing) {
      res.status(404).json({ message: "Bank details not found. Please setup first." });
      return;
    }

    const paymentMethod = await paymentRepository.upsertBank({
      couple_id: profile.id,
      account_holder_name: account_holder_name || existing.account_holder_name || "",
      account_number: account_number || existing.account_number || "",
      ifsc_code: ifsc_code || existing.ifsc_code || "",
      bank_name: bank_name || existing.bank_name || ""
    });

    res.status(200).json({
      message: "Bank details updated successfully",
      bank_details: {
        account_holder_name: paymentMethod.account_holder_name,
        account_number: paymentMethod.account_number,
        ifsc_code: paymentMethod.ifsc_code,
        bank_name: paymentMethod.bank_name
      }
    });

  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Validation failed.",
        errors: error.issues.map((err: any) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
      return;
    }
    logger.error(`Error updating Bank details: ${error}`);
    res.status(500).json({ message: "Failed to update Bank details" });
  }
};

/**
 * @desc Get Bank details
 * @route GET /api/payment-setup/bank
 */
export const getBankDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const profile = await coupleProfileRepository.findByUserId(userId);
    if (!profile) {
      res.status(404).json({ message: "Couple profile not found" });
      return;
    }

    const paymentMethod = await paymentRepository.findByCoupleId(profile.id);
    if (!paymentMethod) {
      res.status(404).json({ message: "Bank details not found" });
      return;
    }

    res.status(200).json({
      bank_details: {
        account_holder_name: paymentMethod.account_holder_name,
        account_number: paymentMethod.account_number,
        ifsc_code: paymentMethod.ifsc_code,
        bank_name: paymentMethod.bank_name
      }
    });

  } catch (error) {
    logger.error(`Error fetching Bank details: ${error}`);
    res.status(500).json({ message: "Failed to fetch Bank details" });
  }
};

/**
 * @desc Get UPI details without authentication
 * @route GET /api/payment-setup/upi/public/:coupleId
 */
export const getPublicUpiDetails = async (req: Request, res: Response): Promise<void> => {
  const { coupleId } = req.params;

  if (!coupleId) {
    res.status(400).json({ message: "Couple ID is required" });
    return;
  }

  try {
    const paymentMethod = await paymentRepository.findByCoupleId(coupleId as string);
    if (!paymentMethod) {
      res.status(404).json({ message: "UPI details not found" });
      return;
    }

    res.status(200).json({
      upi_details: {
        upi_id: paymentMethod.upi_id,
        display_name: paymentMethod.display_name,
        qr_image_url: getFullMediaUrl(paymentMethod.qr_image_url)
      }
    });

  } catch (error) {
    logger.error(`Error fetching public UPI details: ${error}`);
    res.status(500).json({ message: "Failed to fetch UPI details" });
  }
};

