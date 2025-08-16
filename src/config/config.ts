/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 [CLIENT_ORG_NAME]
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
  apiKey: process.env.API_KEY || "default-api-key",
  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  },
};