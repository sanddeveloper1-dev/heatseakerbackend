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
 * Add a log entry to the in-memory ring buffer
 */
function addToBuffer(level: LogEntry["level"], message: string, meta?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: meta ? (typeof meta === "object" ? meta : { data: meta }) : undefined,
  };

  logBuffer.push(entry);

  // Remove oldest entries if buffer exceeds max size
  if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
    logBuffer.shift();
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
 * Get logs from the in-memory buffer with optional filtering
 */
export function getLogs(options?: {
  level?: "info" | "warn" | "error" | "debug";
  limit?: number;
  search?: string;
}): LogEntry[] {
  let filtered = [...logBuffer];

  // Filter by level
  if (options?.level) {
    filtered = filtered.filter((entry) => entry.level === options.level);
  }

  // Filter by search string (case-insensitive)
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(
      (entry) =>
        entry.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(entry.meta || {}).toLowerCase().includes(searchLower)
    );
  }

  // Sort by timestamp descending (latest first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply limit (default 100, max 500)
  const limit = Math.min(options?.limit || 100, 500);
  return filtered.slice(0, limit);
}

export default logger;