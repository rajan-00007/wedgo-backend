import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; phoneNumber: string };
    (req as any).user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};
