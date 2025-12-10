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

/**
 * Add a log entry to the in-memory ring buffer and database (async, non-blocking)
 */
function addToBuffer(level: LogEntry["level"], message: string, meta?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: meta ? (typeof meta === "object" ? meta : { data: meta }) : undefined,
  };

  // Add to in-memory buffer (fast access)
  logBuffer.push(entry);

  // Remove oldest entries if buffer exceeds max size
  if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }

  // Store in database asynchronously (non-blocking, fire-and-forget)
  // Don't await to avoid blocking the logging operation
  storeLog(entry).catch(() => {
    // Silently fail - database write errors are already handled in storeLog
    // We don't want logging failures to break the application
  });
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
    const { getLogsFromDatabase } = await import("../services/logStorageService");
    const dbLogs = await getLogsFromDatabase({
      level: options?.level,
      limit: limit * 2, // Get more from DB to account for potential duplicates
      search: options?.search,
    });

    // Get logs from in-memory buffer (recent logs)
    let bufferLogs = [...logBuffer];

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
    const mergedLogs = Array.from(logMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit
    return mergedLogs.slice(0, limit);
  } catch (error: any) {
    // If database query fails, fall back to in-memory buffer only
    let filtered = [...logBuffer];

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