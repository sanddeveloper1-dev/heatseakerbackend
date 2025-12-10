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
 * Application configuration and environment variable management
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * Validate and parse UI origin URL
 * Throws error if invalid URL format
 */
function validateUiOrigin(origin: string | undefined): string {
  const defaultOrigin = "http://localhost:3000";
  const uiOrigin = origin || defaultOrigin;

  try {
    const url = new URL(uiOrigin);
    // Ensure it's http or https
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`Invalid protocol: ${url.protocol}. Must be http: or https:`);
    }
    return uiOrigin;
  } catch (error: any) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid UI_ORIGIN format: "${uiOrigin}". Must be a valid URL (e.g., https://example.com)`);
    }
    throw error;
  }
}

export default {
  port: Number(process.env.PORT) || 8080,
  apiKey: process.env.API_KEY,
  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ?
      (process.env.DB_SSL_REJECT_UNAUTHORIZED === "false" ?
        { rejectUnauthorized: false } :
        { rejectUnauthorized: true }
      ) : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  },
  // CORS configuration
  uiOrigin: validateUiOrigin(process.env.UI_ORIGIN),
  logLevel: process.env.LOG_LEVEL || "info",
  // Log retention in days (default 90 days for maximum storage with negligible cost)
  logRetentionDays: Number(process.env.LOG_RETENTION_DAYS) || 90,
  // Email configuration for daily reports
  email: {
    enabled: process.env.EMAIL_ENABLED === "true",
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpSecure: process.env.SMTP_SECURE !== "false", // Default to true, set to "false" for non-SSL
    fromAddress: process.env.EMAIL_FROM || process.env.SMTP_USER,
    reportRecipient: process.env.REPORT_EMAIL_RECIPIENT || "alexmeyer@awmdevelopment.com",
  },
};