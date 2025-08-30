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
 * Database initialization and connection management utilities
 */

import { MigrationManager } from "./migrationManager";
import pool from "../config/database";
import logger from "../config/logger";

/**
 * Initialize the database with the required schema
 */
export async function initializeDatabase(): Promise<void> {
	try {
		logger.info("Starting database initialization...");

		// Run migrations using the new migration system
		await MigrationManager.runMigrations();

		logger.info("Database initialization completed successfully");
	} catch (error: any) {
		logger.error("Database initialization failed", { error: error.message });
		throw error;
	}
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
	try {
		const result = await pool.query("SELECT NOW() as current_time");
		logger.info("Database connection test successful", {
			currentTime: result.rows[0].current_time
		});
		return true;
	} catch (error: any) {
		logger.error("Database connection test failed", { error: error.message });
		return false;
	}
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
	try {
		await pool.end();
		logger.info("Database connection pool closed");
	} catch (error: any) {
		logger.error("Error closing database connection pool", { error: error.message });
	}
} 