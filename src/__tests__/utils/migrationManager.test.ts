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
 * Migration Manager Tests
 */

import { MigrationManager } from "../../utils/migrationManager";
import pool from "../../config/database";
import logger from "../../config/logger";

// Mock the database pool
jest.mock("../../config/database", () => ({
	default: {
		connect: jest.fn(),
		query: jest.fn(),
	},
}));

// Mock the logger
jest.mock("../../config/logger", () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
}));

// Mock fs and path modules
jest.mock("fs", () => ({
	readFileSync: jest.fn(),
	readdirSync: jest.fn(),
}));

jest.mock("path", () => ({
	join: jest.fn(),
}));

jest.mock("crypto", () => ({
	createHash: jest.fn(() => ({
		update: jest.fn().mockReturnThis(),
		digest: jest.fn(() => "mock-checksum"),
	})),
}));

describe("MigrationManager", () => {
	let mockClient: any;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock client
		mockClient = {
			query: jest.fn(),
			release: jest.fn(),
		};

		// Setup mock pool
		(pool as any).connect.mockResolvedValue(mockClient);
	});

	describe("initialize", () => {
		it("should create migrations table if it doesn't exist", async () => {
			mockClient.query.mockResolvedValue({ rows: [] });

			const result = await MigrationManager.initialize();

			expect(result).toBe(true);
			expect(mockClient.query).toHaveBeenCalledWith(
				expect.stringContaining("CREATE TABLE IF NOT EXISTS migrations")
			);
			expect(logger.info).toHaveBeenCalledWith("Migration table created/verified successfully");
		});

		it("should handle database connection errors", async () => {
			(pool as any).connect.mockRejectedValue(new Error("Connection failed"));

			await expect(MigrationManager.initialize()).rejects.toThrow(
				"Migration initialization failed: Connection failed"
			);
			expect(logger.error).toHaveBeenCalledWith(
				"Failed to initialize migration system",
				expect.objectContaining({ error: "Connection failed" })
			);
		});

		it("should handle table creation errors", async () => {
			mockClient.query.mockRejectedValue(new Error("Table creation failed"));

			await expect(MigrationManager.initialize()).rejects.toThrow(
				"Migration initialization failed: Table creation failed"
			);
			expect(mockClient.release).toHaveBeenCalled();
		});
	});

	describe("getMigrationStatus", () => {
		it("should return correct migration status", async () => {
			// Mock successful queries
			mockClient.query
				.mockResolvedValueOnce({ rows: [{ count: "5", last_version: "003", last_date: "2025-08-17" }] })
				.mockResolvedValueOnce({ rows: [{ count: "1" }] });

			// Mock file system
			const { readdirSync } = require("fs");
			readdirSync.mockReturnValue(["001_create_tables.sql", "002_add_indexes.sql", "003_add_constraints.sql"]);

			const status = await MigrationManager.getMigrationStatus();

			expect(status).toEqual({
				totalMigrations: 3,
				appliedMigrations: 5,
				pendingMigrations: -2, // This would be 0 in real scenario
				failedMigrations: 1,
				lastMigration: "003",
				lastMigrationDate: "2025-08-17",
			});
		});

		it("should handle database query errors", async () => {
			mockClient.query.mockRejectedValue(new Error("Query failed"));

			await expect(MigrationManager.getMigrationStatus()).rejects.toThrow(
				"Failed to get migration status: Query failed"
			);
			expect(mockClient.release).toHaveBeenCalled();
		});
	});

	describe("runMigrations", () => {
		it("should run pending migrations successfully", async () => {
			// Mock initialization
			jest.spyOn(MigrationManager, "initialize").mockResolvedValue(true);

			// Mock status with pending migrations
			jest.spyOn(MigrationManager, "getMigrationStatus").mockResolvedValue({
				totalMigrations: 2,
				appliedMigrations: 0,
				pendingMigrations: 2,
				failedMigrations: 0,
			});

			// Mock file system
			const { readdirSync, readFileSync } = require("fs");
			readdirSync.mockReturnValue(["001_create_tables.sql", "002_add_indexes.sql"]);
			readFileSync.mockReturnValue("CREATE TABLE test (id SERIAL);");

			// Mock successful migration execution
			mockClient.query
				.mockResolvedValueOnce({ rows: [] }) // BEGIN
				.mockResolvedValueOnce({ rows: [] }) // CREATE TABLE
				.mockResolvedValueOnce({ rows: [] }) // INSERT migration record
				.mockResolvedValueOnce({ rows: [] }); // COMMIT

			const results = await MigrationManager.runMigrations();

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(true);
			expect(logger.info).toHaveBeenCalledWith("Migration execution completed. 2 migrations processed.");
		});

		it("should handle no pending migrations", async () => {
			jest.spyOn(MigrationManager, "initialize").mockResolvedValue(true);
			jest.spyOn(MigrationManager, "getMigrationStatus").mockResolvedValue({
				totalMigrations: 2,
				appliedMigrations: 2,
				pendingMigrations: 0,
				failedMigrations: 0,
			});

			const results = await MigrationManager.runMigrations();

			expect(results).toHaveLength(0);
			expect(logger.info).toHaveBeenCalledWith("No pending migrations to run");
		});

		it("should handle migration execution errors", async () => {
			jest.spyOn(MigrationManager, "initialize").mockResolvedValue(true);
			jest.spyOn(MigrationManager, "getMigrationStatus").mockResolvedValue({
				totalMigrations: 1,
				appliedMigrations: 0,
				pendingMigrations: 1,
				failedMigrations: 0,
			});

			const { readdirSync, readFileSync } = require("fs");
			readdirSync.mockReturnValue(["001_create_tables.sql"]);
			readFileSync.mockReturnValue("CREATE TABLE test (id SERIAL);");

			// Mock failed migration execution
			mockClient.query
				.mockResolvedValueOnce({ rows: [] }) // BEGIN
				.mockRejectedValueOnce(new Error("Table already exists")) // CREATE TABLE fails
				.mockResolvedValueOnce({ rows: [] }) // ROLLBACK
				.mockResolvedValueOnce({ rows: [] }); // INSERT failed migration record

			const results = await MigrationManager.runMigrations();

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].message).toContain("Table already exists");
			expect(logger.error).toHaveBeenCalledWith(
				"Migration 001 failed",
				expect.objectContaining({ error: "Table already exists" })
			);
		});
	});

	describe("rollbackMigration", () => {
		it("should check if migration exists before rollback", async () => {
			mockClient.query.mockResolvedValue({ rows: [] }); // No migration found

			const result = await MigrationManager.rollbackMigration("001");

			expect(result).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith("Rollback for migration 001 not yet implemented");
		});

		it("should handle rollback errors", async () => {
			mockClient.query.mockRejectedValue(new Error("Rollback failed"));

			await expect(MigrationManager.rollbackMigration("001")).rejects.toThrow(
				"Rollback failed: Rollback failed"
			);
			expect(mockClient.release).toHaveBeenCalled();
		});
	});

	describe("private methods", () => {
		it("should parse migration files correctly", () => {
			const { readdirSync, readFileSync } = require("fs");
			const { join } = require("path");

			readdirSync.mockReturnValue(["001_create_tables.sql", "002_add_indexes.sql"]);
			readFileSync.mockReturnValue("CREATE TABLE test;");
			join.mockImplementation((...args: string[]) => args.join("/"));

			// Access private method through reflection
			const getMigrationFiles = (MigrationManager as any).getMigrationFiles;
			const files = getMigrationFiles.call(MigrationManager);

			expect(files).toHaveLength(2);
			expect(files[0]).toEqual({
				version: "001",
				description: "create tables",
				filePath: "/001_create_tables.sql",
				content: "CREATE TABLE test;",
				checksum: "mock-checksum",
			});
		});

		it("should handle invalid migration filename format", () => {
			const { readdirSync } = require("fs");
			readdirSync.mockReturnValue(["invalid_filename.sql"]);

			const getMigrationFiles = (MigrationManager as any).getMigrationFiles;

			expect(() => getMigrationFiles.call(MigrationManager)).toThrow(
				"Invalid migration filename format: invalid_filename.sql"
			);
		});

		it("should check if migration is already applied", async () => {
			mockClient.query.mockResolvedValue({ rows: [{ count: "1" }] });

			const isMigrationApplied = (MigrationManager as any).isMigrationApplied;
			const result = await isMigrationApplied.call(MigrationManager, "001");

			expect(result).toBe(true);
			expect(mockClient.query).toHaveBeenCalledWith(
				expect.stringContaining("SELECT COUNT(*) as count"),
				["001"]
			);
		});
	});
});
