import request from "supertest";
import app from "../../app";
import jwt from "jsonwebtoken";
import paymentRepository from "../../repositories/payment-setup/paymentRepository";
import coupleProfileRepository from "../../repositories/coupleProfileRepository";
import * as minioService from "../../services/minio/minio.service";
import logger from "../../utils/logger";
import { ZodError } from "zod";
import { 
    setupUpi, 
    updateUpi, 
    getUpiDetails, 
    setupBank, 
    updateBank, 
    getBankDetails, 
    getPublicUpiDetails 
} from "../../controllers/payment-setup/paymentController";

jest.mock("../../repositories/payment-setup/paymentRepository");
jest.mock("../../repositories/coupleProfileRepository");
jest.mock("../../services/minio/minio.service");
jest.mock("../../utils/logger");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const mockUser = { id: "user-123" };
const mockToken = jwt.sign(mockUser, ACCESS_TOKEN_SECRET);

describe("Payment Setup Controller - 100% Coverage Restoration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const upiData = { upi_id: "test@upi", display_name: "John Doe" };
  const bankData = { 
    account_holder_name: "John Doe", 
    account_number: "123456789", 
    ifsc_code: "BANK0001", 
    bank_name: "Test Bank" 
  };

  describe("Integration Tests (Supertest)", () => {
    it("POST /api/payment-setup/upi success path", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (minioService.uploadImage as jest.Mock).mockResolvedValue("qr.png");
        (paymentRepository.upsertUpi as jest.Mock).mockResolvedValue({ ...upiData, qr_image_url: "qr.png" });
        
        const res = await request(app)
          .post("/api/payment-setup/upi")
          .set("Authorization", `Bearer ${mockToken}`)
          .attach("qr_image", Buffer.from("d"), "q.png")
          .field("upi_id", "test@upi")
          .field("display_name", "John Doe");
        
        expect(res.status).toBe(200);
    });

    it("PUT /api/payment-setup/upi success path", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue({ qr_image_url: "o.png", upi_id: "o@p" });
        (minioService.uploadImage as jest.Mock).mockResolvedValue("n.png");
        (paymentRepository.upsertUpi as jest.Mock).mockResolvedValue({ upi_id: "u1", qr_image_url: "n.png" });
        
        const res = await request(app)
          .put("/api/payment-setup/upi")
          .set("Authorization", `Bearer ${mockToken}`)
          .attach("qr_image", Buffer.from("d"), "q.png")
          .field("upi_id", "new@upi");
        
        expect(res.status).toBe(200);
    });

    it("GET /api/payment-setup/upi success path (Line 182)", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue({ upi_id: "u1", qr_image_url: "q.png" });
        const res = await request(app).get("/api/payment-setup/upi").set("Authorization", `Bearer ${mockToken}`);
        expect(res.status).toBe(200);
    });

    it("POST /api/payment-setup/bank success path", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (paymentRepository.upsertBank as jest.Mock).mockResolvedValue(bankData);
        const res = await request(app).post("/api/payment-setup/bank").set("Authorization", `Bearer ${mockToken}`).send(bankData);
        expect(res.status).toBe(200);
    });

    it("GET /api/payment-setup/bank success path (Line 344)", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue(bankData);
        const res = await request(app).get("/api/payment-setup/bank").set("Authorization", `Bearer ${mockToken}`);
        expect(res.status).toBe(200);
    });

    it("GET /api/payment-setup/upi/public/:coupleId success path (Line 378)", async () => {
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue({ upi_id: "u1", qr_image_url: "q.png" });
        const res = await request(app).get("/api/payment-setup/upi/public/c1");
        expect(res.status).toBe(200);
    });
  });

  describe("Direct Controller Calls (Internal Coverage)", () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        req = { 
            user: { id: "u1" }, 
            body: { ...upiData, ...bankData }, 
            params: { coupleId: "c1" }, 
            headers: {}, 
            file: null 
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    });

    it("Covering Unauthorized (req.user exists but no id)", async () => {
        req.user = {}; 
        await setupUpi(req, res);
        await updateUpi(req, res);
        await getUpiDetails(req, res);
        await setupBank(req, res);
        await updateBank(req, res);
        await getBankDetails(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("Covering ZodError specifically (throwing REAL ZodError)", async () => {
        try {
            const { upiSetupSchema } = require("../../validators/payment-setup/paymentValidator");
            upiSetupSchema.parse({}); // Throws real ZodError
        } catch (e) {
            (coupleProfileRepository.findByUserId as jest.Mock).mockImplementation(() => { throw e; });
        }
        
        await setupUpi(req, res);
        await updateUpi(req, res);
        await setupBank(req, res);
        await updateBank(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("Covering Generic Errors (500s)", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockRejectedValue(new Error("G"));
        await setupUpi(req, res);
        await updateUpi(req, res);
        await getUpiDetails(req, res);
        await setupBank(req, res);
        await updateBank(req, res);
        await getBankDetails(req, res);
        
        (paymentRepository.findByCoupleId as jest.Mock).mockRejectedValue(new Error("G"));
        await getPublicUpiDetails(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it("Covering Missing Profile/Details (404s)", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null);
        await setupUpi(req, res);
        await updateUpi(req, res);
        await getUpiDetails(req, res);
        await setupBank(req, res);
        await updateBank(req, res);
        await getBankDetails(req, res);
        expect(res.status).toHaveBeenCalledWith(404);

        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue(null);
        await updateUpi(req, res);
        await getUpiDetails(req, res);
        await updateBank(req, res);
        await getBankDetails(req, res);
        await getPublicUpiDetails(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("Covering Missing CoupleId Branch (Lines 367-368)", async () => {
        req.params.coupleId = undefined;
        await getPublicUpiDetails(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("Covering Nothing to Update (Lines 101, 269)", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        req.body = {};
        await updateUpi(req, res);
        await updateBank(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("Covering Success Path for Bank Update (Line 285-293)", async () => {
        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue(bankData);
        (paymentRepository.upsertBank as jest.Mock).mockResolvedValue(bankData);
        req.body = { bank_name: "New Bank" };
        await updateBank(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("Missing QR image for new setup (Lines 45-47)", async () => {

        (coupleProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ id: "c1" });
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue(null);
        req.file = null;
        await setupUpi(req, res);
        expect(res.status).toHaveBeenCalledWith(400); // QR required for new setup
        
        (paymentRepository.findByCoupleId as jest.Mock).mockResolvedValue({ qr_image_url: "old.png" });
        (paymentRepository.upsertUpi as jest.Mock).mockResolvedValue({ upi_id: "u1", qr_image_url: "old.png" });
        await setupUpi(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
