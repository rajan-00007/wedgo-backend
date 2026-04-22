import { authenticateToken } from "../../middlewares/auth/authMiddleware";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";

describe("Auth Middleware", () => {
  let mockReq: any;
  let mockRes: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it("should return 401 if no token provided", () => {
    authenticateToken(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Access denied. No token provided." });
  });

  it("should call next() if token is valid", () => {
    const user = { id: "123", phoneNumber: "9876543210" };
    const token = jwt.sign(user, ACCESS_TOKEN_SECRET);
    mockReq.headers["authorization"] = `Bearer ${token}`;

    authenticateToken(mockReq, mockRes, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockReq.user).toMatchObject(user);
  });

  it("should return 403 for invalid or expired token (Line 27)", () => {
    mockReq.headers["authorization"] = "Bearer invalid-token";

    authenticateToken(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Invalid or expired token." });
  });
});
