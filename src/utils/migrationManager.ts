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
 * Database migration management with versioning and rollback capabilities
 */

import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import pool from "../config/database";
import logger from "../config/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

interface Migration {
	id: number;
	name: string;
	filename: string;
	applied_at: Date;
}

/**
 * Initialize the migration system
 */
async function initializeMigrationTable(): Promise<void> {
	try {
		await pool.query(`
			CREATE TABLE IF NOT EXISTS migrations (
				id SERIAL PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				filename VARCHAR(255) NOT NULL,
				applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		logger.info("Migration table initialized");
	} catch (error: any) {
		logger.error("Failed to initialize migration table", { error: error.message });
		throw error;
	}
}

/**
 * Get all applied migrations
 */
async function getAppliedMigrations(): Promise<Migration[]> {
	try {
		const result = await pool.query("SELECT * FROM migrations ORDER BY id");
		return result.rows;
	} catch (error: any) {
		logger.error("Failed to get applied migrations", { error: error.message });
		return [];
	}
}

/**
 * Apply a migration
 */
async function applyMigration(migrationName: string, filename: string, sql: string): Promise<void> {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		// Execute the migration SQL
		await client.query(sql);

		// Record the migration
		await client.query(
			"INSERT INTO migrations (name, filename) VALUES ($1, $2)",
			[migrationName, filename]
		);

		await client.query("COMMIT");
		logger.info(`Migration applied successfully: ${migrationName}`);
	} catch (error: any) {
		await client.query("ROLLBACK");
		logger.error(`Failed to apply migration: ${migrationName}`, { error: error.message });
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Check if migration should be applied
 */
function shouldApplyMigration(filename: string, appliedMigrations: Migration[]): boolean {
	return !appliedMigrations.some(m => m.filename === filename);
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
	try {
		logger.info("Starting migration process...");

		// Initialize migration table
		await initializeMigrationTable();

		// Get applied migrations
		const appliedMigrations = await getAppliedMigrations();

		// Define migrations in order
		const migrations = [
			{
				name: "Create race tables",
				filename: "001_create_race_tables.sql"
			}
		];

		let appliedCount = 0;

		for (const migration of migrations) {
			if (shouldApplyMigration(migration.filename, appliedMigrations)) {
				logger.info(`Applying migration: ${migration.name}`);

				// Read migration file
				const migrationPath = join(__dirname, "../../migrations", migration.filename);
				const migrationSQL = readFileSync(migrationPath, "utf-8");

				// Apply migration
				await applyMigration(migration.name, migration.filename, migrationSQL);
				appliedCount++;
			} else {
				logger.info(`Migration already applied: ${migration.name}`);
			}
		}

		if (appliedCount === 0) {
			logger.info("No new migrations to apply");
		} else {
			logger.info(`Migration process completed. Applied ${appliedCount} migrations`);
		}

	} catch (error: any) {
		logger.error("Migration process failed", { error: error.message });
		throw error;
	}
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{ applied: Migration[], pending: string[] }> {
	try {
		await initializeMigrationTable();
		const appliedMigrations = await getAppliedMigrations();

		const allMigrations = [
			"001_create_race_tables.sql"
		];

		const pending = allMigrations.filter(filename =>
			!appliedMigrations.some(m => m.filename === filename)
		);

		return {
			applied: appliedMigrations,
			pending
		};
	} catch (error: any) {
		logger.error("Failed to get migration status", { error: error.message });
		return { applied: [], pending: [] };
	}
}
