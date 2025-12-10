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
 * Authentication routes for admin login
 */

import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import config from "../config/config";
import { generateJwt } from "../auth/jwtAuth";
import strictJwtAuth from "../middleware/strictJwtAuth";
import logger from "../config/logger";

const router = Router();

/**
 * Rate limiter for login endpoint
 * Limits to 5 attempts per 15 minutes per IP to prevent brute force attacks
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * POST /api/auth/login
 * Admin login endpoint
 * Body: { username: string, password: string }
 * Rate limited to 5 attempts per 15 minutes per IP
 */
router.post("/login", loginRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      logger.warn("Login attempt with missing credentials", { username: username || "missing" });
      res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
      return;
    }

    // Check if admin credentials are configured
    if (!config.adminUsername || !config.adminPasswordHash) {
      logger.error("Admin credentials not configured");
      res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
      return;
    }

    // Validate username
    if (username !== config.adminUsername) {
      logger.warn("Login attempt with invalid username", { username });
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Validate password using bcrypt
    const passwordMatch = await bcrypt.compare(password, config.adminPasswordHash);

    if (!passwordMatch) {
      logger.warn("Login attempt with invalid password", { username });
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Generate JWT token
    const token = generateJwt({
      sub: username,
      role: "admin",
    });

    logger.info("Admin login successful", { username });

    // Return success response
    res.status(200).json({
      success: true,
      token,
      user: { username },
    });
  } catch (error: any) {
    logger.error("Login error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side only, since JWT is stateless)
 */
router.post("/logout", (req: Request, res: Response) => {
  // Since JWT is stateless, logout is handled client-side
  // This endpoint exists for consistency and potential future token blacklisting
  res.status(200).json({
    success: true,
  });
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return user info
 * Protected by strict JWT auth (no API key fallback)
 */
router.get("/verify", strictJwtAuth, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Extract expiration from token if available
    const exp = req.user.exp ? new Date(req.user.exp * 1000).toISOString() : undefined;

    res.status(200).json({
      success: true,
      user: {
        username: req.user.sub,
        role: req.user.role,
      },
      exp,
    });
  } catch (error: any) {
    logger.error("Token verification error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
