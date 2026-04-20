import { z } from "zod";

export const upiSetupSchema = z.object({
  upi_id: z.string().min(3, "upi_id must be at least 3 characters").max(100, "upi_id is too long"),
  display_name: z.string().min(2, "display_name must be at least 2 characters").max(100, "display_name is too long"),
});

export const upiUpdateSchema = z.object({
  upi_id: z.string().min(3, "upi_id must be at least 3 characters").max(100, "upi_id is too long").optional(),
  display_name: z.string().min(2, "display_name must be at least 2 characters").max(100, "display_name is too long").optional(),
});

export const bankSetupSchema = z.object({
  account_holder_name: z.string().min(2, "Account holder name is required").max(100, "Account holder name is too long"),
  account_number: z.string().min(5, "Account number is required").max(50, "Account number is too long"),
  ifsc_code: z.string().min(4, "IFSC code is required").max(20, "IFSC code is too long"),
  bank_name: z.string().min(2, "Bank name is required").max(100, "Bank name is too long"),
});

export const bankUpdateSchema = z.object({
  account_holder_name: z.string().min(2, "Account holder name is required").max(100, "Account holder name is too long").optional(),
  account_number: z.string().min(5, "Account number is required").max(50, "Account number is too long").optional(),
  ifsc_code: z.string().min(4, "IFSC code is required").max(20, "IFSC code is too long").optional(),
  bank_name: z.string().min(2, "Bank name is required").max(100, "Bank name is too long").optional(),
});
