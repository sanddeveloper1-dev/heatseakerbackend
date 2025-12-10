/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 Paul Stortini
 * Software Development & Maintenance by Alexander Meyer
 * 
 * ZERO LIABILITY NOTICE: Service provider assumes no liability for betting operations.
 * Client bears 100% responsibility for all business outcomes.
 * 
 * This software is provided "AS IS" without warranty.
 * For complete terms, see SERVICE_AGREEMENT.md
 * 
 * Strict JWT-only authentication middleware for admin-only endpoints
 * This middleware REQUIRES a valid JWT token (no API key fallback)
 */

import { Request, Response, NextFunction } from "express";
import { verifyJwt, JwtPayload } from "../auth/jwtAuth";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware that requires a valid JWT token (no API key fallback)
 * Used for admin-only endpoints like /api/logs and /api/auth/verify
 */
const strictJwtAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: No valid JWT token provided",
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const decoded = verifyJwt(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    // In production, don't expose detailed error messages to prevent information leakage
    const isProduction = process.env.NODE_ENV === "production";
    res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
      ...(isProduction ? {} : { error: error.message }), // Only include error details in non-production
    });
  }
};

export default strictJwtAuth;
