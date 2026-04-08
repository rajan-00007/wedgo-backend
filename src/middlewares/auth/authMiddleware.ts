import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const headerToken = authHeader && authHeader.split(" ")[1];
  const cookieToken = req.cookies?.accessToken;

  const token = headerToken || cookieToken;

  if (!token) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  try {
    const verified = jwt.verify(token, ACCESS_TOKEN_SECRET) as { id: string; phoneNumber: string };
    (req as any).user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};

