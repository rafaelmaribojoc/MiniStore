import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
  prisma: PrismaClient;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as {
      id: string;
      username: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid token.",
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

// Alias for authorize - takes array of roles
export const requireRole = (roles: string[]) => {
  return authorize(...roles);
};
