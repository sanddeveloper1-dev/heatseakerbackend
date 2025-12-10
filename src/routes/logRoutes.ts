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
 * Logs endpoint for admin UI to view application logs
 */

import { Router, Request, Response } from "express";
import apiKeyAuth from "../middleware/apiKeyAuth";
import { getLogs } from "../config/logger";

const router = Router();

/**
 * GET /api/logs
 * Get application logs with optional filtering
 * Protected by API key authentication
 * 
 * Query parameters:
 * - level: optional, "info" | "warn" | "error" | "debug"
 * - limit: optional, number (default 100, max 500)
 * - search: optional, string to filter by message substring
 */
router.get("/", apiKeyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const level = req.query.level as "info" | "warn" | "error" | "debug" | undefined;
    const limitParam = req.query.limit as string | undefined;
    const search = req.query.search as string | undefined;

    // Validate and parse limit
    let limit: number | undefined;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
      }
    }

    // Validate level if provided
    if (level && !["info", "warn", "error", "debug"].includes(level)) {
      res.status(400).json({
        success: false,
        message: "Invalid level parameter. Must be one of: info, warn, error, debug",
      });
      return;
    }

    // Get filtered logs (now async - queries both DB and in-memory buffer)
    const logs = await getLogs({
      level,
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

export default router;
