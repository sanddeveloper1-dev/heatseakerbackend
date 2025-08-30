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
 * Database connection pool and PostgreSQL configuration
 */

import { Pool, PoolClient } from "pg";
import config from "./config";
import logger from "./logger";

// Create a connection pool
const pool = new Pool(config.database);

// Test the connection
pool.on("connect", (client: PoolClient) => {
	logger.info("Connected to PostgreSQL database");
});

pool.on("error", (err: Error) => {
	logger.error("Unexpected error on idle client", err);
	// Don't crash the application on connection errors
	// Let the application handle reconnection logic
});

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("Shutting down database pool...");
	await pool.end();
	process.exit(0);
});

// Add connection health check method
export const checkConnectionHealth = async (): Promise<boolean> => {
	try {
		const client = await pool.connect();
		client.release();
		return true;
	} catch (error) {
		logger.error("Database connection health check failed", { error });
		return false;
	}
};

export default pool; 