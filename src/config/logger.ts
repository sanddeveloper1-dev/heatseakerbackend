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
 * Winston logging configuration and logger setup with in-memory ring buffer
 */

import winston from "winston";
import config from "./config";
import { storeLog } from "../services/logStorageService";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  meta?: any;
}

// In-memory ring buffer for logs (max 1000 entries)
const MAX_LOG_BUFFER_SIZE = 1000;
const logBuffer: LogEntry[] = [];
// Promise-based lock to prevent race conditions (Node.js is single-threaded but async operations can interleave)
let bufferLockPromise: Promise<void> = Promise.resolve();

/**
 * Add a log entry to the in-memory ring buffer and database (async, non-blocking)
 * Thread-safe: ensures atomic operations on the buffer
 */
function addToBuffer(level: LogEntry["level"], message: string, meta?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: meta ? (typeof meta === "object" ? meta : { data: meta }) : undefined,
  };

  // Atomic operation: check length and add/remove in one go
  // Use promise-based lock to prevent concurrent modifications
  bufferLockPromise = bufferLockPromise.then(() => {
    // Add to in-memory buffer (fast access)
    logBuffer.push(entry);

    // Remove oldest entries if buffer exceeds max size (atomic check and shift)
    if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
      logBuffer.shift();
    }
  });

  // Store in database asynchronously (non-blocking, fire-and-forget)
  // Skip database writes in test environment to avoid open handles in Jest
  if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
    // Don't await to avoid blocking the logging operation
    storeLog(entry).catch((error) => {
      // Log to console.error as fallback since logger might cause recursion
      // This ensures database write failures are visible for debugging
      console.error("Failed to store log entry in database:", error instanceof Error ? error.message : String(error));
      // Optionally track failure metrics here in the future
    });
  }
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
      return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // ✅ Send logs to stdout (for Docker)
    new winston.transports.File({ filename: "logs/error.log", level: "error" }) // ✅ Save errors to a file
  ],
});

// Wrap logger methods to also add to buffer
const originalInfo = logger.info.bind(logger);
const originalWarn = logger.warn.bind(logger);
const originalError = logger.error.bind(logger);
const originalDebug = logger.debug.bind(logger);

logger.info = ((messageOrInfoObject: any, ...args: any[]) => {
  const message = typeof messageOrInfoObject === "string" ? messageOrInfoObject : messageOrInfoObject.message || JSON.stringify(messageOrInfoObject);
  const meta = typeof messageOrInfoObject === "string" ? (args[0] || {}) : messageOrInfoObject;
  addToBuffer("info", message, meta);
  return originalInfo(messageOrInfoObject, ...args);
}) as typeof logger.info;

logger.warn = ((messageOrInfoObject: any, ...args: any[]) => {
  const message = typeof messageOrInfoObject === "string" ? messageOrInfoObject : messageOrInfoObject.message || JSON.stringify(messageOrInfoObject);
  const meta = typeof messageOrInfoObject === "string" ? (args[0] || {}) : messageOrInfoObject;
  addToBuffer("warn", message, meta);
  return originalWarn(messageOrInfoObject, ...args);
}) as typeof logger.warn;

logger.error = ((messageOrInfoObject: any, ...args: any[]) => {
  const message = typeof messageOrInfoObject === "string" ? messageOrInfoObject : messageOrInfoObject.message || JSON.stringify(messageOrInfoObject);
  const meta = typeof messageOrInfoObject === "string" ? (args[0] || {}) : messageOrInfoObject;
  addToBuffer("error", message, meta);
  return originalError(messageOrInfoObject, ...args);
}) as typeof logger.error;

logger.debug = ((messageOrInfoObject: any, ...args: any[]) => {
  const message = typeof messageOrInfoObject === "string" ? messageOrInfoObject : messageOrInfoObject.message || JSON.stringify(messageOrInfoObject);
  const meta = typeof messageOrInfoObject === "string" ? (args[0] || {}) : messageOrInfoObject;
  addToBuffer("debug", message, meta);
  return originalDebug(messageOrInfoObject, ...args);
}) as typeof logger.debug;

/**
 * Get logs from both in-memory buffer and database with optional filtering
 * Merges results from both sources, prioritizing recent logs
 */
export async function getLogs(options?: {
  level?: "info" | "warn" | "error" | "debug";
  limit?: number;
  search?: string;
}): Promise<LogEntry[]> {
  const limit = Math.min(options?.limit || 100, 500);

  try {
    // Get logs from database (historical logs)
    // Limit database query to reasonable size to prevent memory issues
    // We'll get slightly more than needed to account for duplicates, but cap it
    const { getLogsFromDatabase } = await import("../services/logStorageService");
    const dbQueryLimit = Math.min(limit * 2, 1000); // Cap at 1000 to prevent memory issues
    const dbLogs = await getLogsFromDatabase({
      level: options?.level,
      limit: dbQueryLimit,
      search: options?.search,
    });

    // Get logs from in-memory buffer (recent logs)
    // Create a snapshot copy to avoid race conditions during iteration
    await bufferLockPromise; // Wait for any pending writes
    let bufferLogs = [...logBuffer]; // Create snapshot

    // Filter in-memory buffer by level
    if (options?.level) {
      bufferLogs = bufferLogs.filter((entry) => entry.level === options.level);
    }

    // Filter in-memory buffer by search string (case-insensitive)
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      bufferLogs = bufferLogs.filter(
        (entry) =>
          entry.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.meta || {}).toLowerCase().includes(searchLower)
      );
    }

    // Merge logs from both sources, removing duplicates by timestamp + message
    const logMap = new Map<string, LogEntry>();

    // Add database logs first (older)
    for (const log of dbLogs) {
      const key = `${log.timestamp}_${log.message}`;
      if (!logMap.has(key)) {
        logMap.set(key, log);
      }
    }

    // Add in-memory buffer logs (newer, will overwrite duplicates)
    for (const log of bufferLogs) {
      const key = `${log.timestamp}_${log.message}`;
      logMap.set(key, log);
    }

    // Convert map to array and sort by timestamp descending (latest first)
    // Use efficient sorting and limit early to reduce memory usage
    const mergedLogs = Array.from(logMap.values());

    // Sort efficiently (only if we have logs)
    if (mergedLogs.length > 0) {
      mergedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Apply limit to final result
    return mergedLogs.slice(0, limit);
  } catch (error: any) {
    // If database query fails, fall back to in-memory buffer only
    // Create a snapshot copy to avoid race conditions
    await bufferLockPromise; // Wait for any pending writes
    let filtered = [...logBuffer]; // Create snapshot

    if (options?.level) {
      filtered = filtered.filter((entry) => entry.level === options.level);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.meta || {}).toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered.slice(0, limit);
  }
}

export default logger;