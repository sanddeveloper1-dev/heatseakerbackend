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
 * Log storage service for persisting logs to PostgreSQL database
 */

import pool from "../config/database";
import logger from "../config/logger";
import { LogEntry } from "../config/logger";

/**
 * Store a log entry in the database (async, non-blocking)
 * Returns early if in test environment to avoid open handles in Jest
 */
export async function storeLog(entry: LogEntry): Promise<void> {
  // Skip database writes in test environment
  if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
    return;
  }

  try {
    await pool.query(
      `INSERT INTO logs (timestamp, level, message, meta)
       VALUES ($1, $2, $3, $4)`,
      [
        entry.timestamp,
        entry.level,
        entry.message,
        entry.meta ? JSON.stringify(entry.meta) : null,
      ]
    );
  } catch (error: any) {
    // Don't log errors about logging to avoid infinite loops
    // Use a simple console.error as fallback since logger might cause recursion
    // Skip in test environment
    if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
      // Use console.error as last resort to avoid logger recursion
      // This is acceptable here since it's a critical failure path
      console.error("Failed to store log in database:", error.message);
    }
  }
}

/**
 * Get logs from database with optional filtering
 * Returns empty array in test environment to avoid database connections
 */
export async function getLogsFromDatabase(options?: {
  level?: "info" | "warn" | "error" | "debug";
  limit?: number;
  search?: string;
  before?: Date;
  after?: Date;
}): Promise<LogEntry[]> {
  // Skip database queries in test environment
  if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
    return [];
  }

  try {
    let query = `SELECT timestamp, level, message, meta FROM logs WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by level
    if (options?.level) {
      query += ` AND level = $${paramIndex}`;
      params.push(options.level);
      paramIndex++;
    }

    // Filter by search string (full-text search on message)
    if (options?.search) {
      query += ` AND to_tsvector('english', message) @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(options.search);
      paramIndex++;
    }

    // Filter by date range
    if (options?.before) {
      query += ` AND timestamp < $${paramIndex}`;
      params.push(options.before.toISOString());
      paramIndex++;
    }

    if (options?.after) {
      query += ` AND timestamp > $${paramIndex}`;
      params.push(options.after.toISOString());
      paramIndex++;
    }

    // Order by timestamp descending (latest first)
    query += ` ORDER BY timestamp DESC`;

    // Apply limit (default 100, max 500)
    const limit = Math.min(options?.limit || 100, 500);
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return result.rows.map((row) => {
      let meta: any = undefined;
      if (row.meta) {
        try {
          meta = typeof row.meta === "string" ? JSON.parse(row.meta) : row.meta;
        } catch (parseError) {
          // If JSON parsing fails, store raw value with error indicator
          meta = { _parseError: true, raw: row.meta };
        }
      }
      return {
        timestamp: row.timestamp,
        level: row.level,
        message: row.message,
        meta,
      };
    });
  } catch (error: any) {
    logger.error("Failed to retrieve logs from database", { error: error.message });
    return [];
  }
}

/**
 * Clean up old logs beyond retention period
 * Returns early in test environment to avoid database connections
 */
export async function cleanupOldLogs(retentionDays: number): Promise<number> {
  // Skip cleanup in test environment
  if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
    return 0;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await pool.query(
      `DELETE FROM logs WHERE timestamp < $1`,
      [cutoffDate.toISOString()]
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old log entries older than ${retentionDays} days`);
    }

    return deletedCount;
  } catch (error: any) {
    logger.error("Failed to cleanup old logs", { error: error.message });
    return 0;
  }
}
