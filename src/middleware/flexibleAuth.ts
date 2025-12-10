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
 * Flexible authentication middleware that accepts EITHER JWT OR API key
 * This allows both the Admin UI (JWT) and existing API clients (API key) to work
 */

import { Request, Response, NextFunction } from "express";
import { verifyJwt, JwtPayload } from "../auth/jwtAuth";
import config from "../config/config";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware that accepts EITHER JWT token OR API key
 * - First checks for JWT in Authorization header
 * - If no valid JWT, falls back to API key check
 * - Returns 401 if neither is valid
 */
const flexibleAuth = (req: Request, res: Response, next: NextFunction): void => {
  // First, try JWT authentication
  const authHeader = req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const decoded = verifyJwt(token);
      req.user = decoded;
      next();
      return;
    } catch (error) {
      // JWT is invalid, but don't fail yet - try API key fallback
      // Continue to API key check below
    }
  }

  // Fall back to API key authentication
  if (!config.apiKey) {
    res.status(500).json({
      error: "System configuration error - contact administrator",
    });
    return;
  }

  const providedApiKey: string | undefined = req.header("x-api-key");

  if (!providedApiKey) {
    res.status(401).json({
      error: "Unauthorized: No valid authentication provided (JWT token or API key required)",
    });
    return;
  }

  if (providedApiKey !== config.apiKey) {
    res.status(401).json({
      error: "Unauthorized: Invalid API key",
    });
    return;
  }

  // API key is valid, proceed
  next();
};

export default flexibleAuth;
