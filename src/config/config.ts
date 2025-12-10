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
  // Admin UI and JWT configuration
  uiOrigin: process.env.UI_ORIGIN || "http://localhost:3000",
  adminUsername: process.env.ADMIN_USERNAME,
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET,
  logLevel: process.env.LOG_LEVEL || "info",
  // Log retention in days (default 90 days for maximum storage with negligible cost)
  logRetentionDays: Number(process.env.LOG_RETENTION_DAYS) || 90,
};