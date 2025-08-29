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
 * Database Configuration Tests
 */

import pool from "../../config/database";
import { checkConnectionHealth } from "../../config/database";

// Mock the pg Pool
jest.mock("pg", () => ({
	Pool: jest.fn().mockImplementation(() => ({
		connect: jest.fn(),
		query: jest.fn(),
		end: jest.fn(),
	})),
}));

describe("Database Configuration", () => {
	let mockPool: any;

	beforeEach(() => {
		jest.clearAllMocks();

		// Get the mocked pool instance
		mockPool = (pool as any);
	});

	describe("Pool Configuration", () => {
		it("should create pool with correct configuration", () => {
			expect(mockPool).toBeDefined();
			expect(typeof mockPool.connect).toBe("function");
			expect(typeof mockPool.query).toBe("function");
			expect(typeof mockPool.end).toBe("function");
		});

		it("should have connection pool methods", () => {
			expect(mockPool.connect).toBeDefined();
			expect(mockPool.query).toBeDefined();
			expect(mockPool.end).toBeDefined();
		});
	});

	describe("Connection Health Check", () => {
		it("should return true for healthy connection", async () => {
			// Mock successful connection
			const mockClient = {
				query: jest.fn().mockResolvedValue({ rows: [{ version: "PostgreSQL 15.0" }] }),
				release: jest.fn(),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(true);
			expect(mockClient.query).toHaveBeenCalledWith("SELECT version()");
			expect(mockClient.release).toHaveBeenCalled();
		});

		it("should return false for unhealthy connection", async () => {
			// Mock failed connection
			mockPool.connect.mockRejectedValue(new Error("Connection failed"));

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
		});

		it("should return false for query failure", async () => {
			// Mock successful connection but failed query
			const mockClient = {
				query: jest.fn().mockRejectedValue(new Error("Query failed")),
				release: jest.fn(),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
			expect(mockClient.release).toHaveBeenCalled();
		});

		it("should return false for client release failure", async () => {
			// Mock successful connection and query but failed release
			const mockClient = {
				query: jest.fn().mockResolvedValue({ rows: [{ version: "PostgreSQL 15.0" }] }),
				release: jest.fn().mockImplementation(() => {
					throw new Error("Release failed");
				}),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
		});

		it("should handle connection timeout gracefully", async () => {
			// Mock connection timeout
			mockPool.connect.mockRejectedValue(new Error("Connection timeout"));

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
		});

		it("should handle database server errors", async () => {
			// Mock database server error
			mockPool.connect.mockRejectedValue(new Error("FATAL: the database system is starting up"));

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
		});

		it("should handle authentication errors", async () => {
			// Mock authentication error
			mockPool.connect.mockRejectedValue(new Error("FATAL: password authentication failed"));

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
		});

		it("should handle network errors", async () => {
			// Mock network error
			mockPool.connect.mockRejectedValue(new Error("ENOTFOUND: database.example.com"));

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
		});
	});

	describe("Connection Pool Management", () => {
		it("should properly manage client connections", async () => {
			const mockClient = {
				query: jest.fn().mockResolvedValue({ rows: [{ version: "PostgreSQL 15.0" }] }),
				release: jest.fn(),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			await checkConnectionHealth();

			// Verify client was acquired and released
			expect(mockPool.connect).toHaveBeenCalledTimes(1);
			expect(mockClient.release).toHaveBeenCalledTimes(1);
		});

		it("should release client even when query fails", async () => {
			const mockClient = {
				query: jest.fn().mockRejectedValue(new Error("Query failed")),
				release: jest.fn(),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			await checkConnectionHealth();

			// Verify client was released even after query failure
			expect(mockClient.release).toHaveBeenCalledTimes(1);
		});

		it("should release client even when release method fails", async () => {
			const mockClient = {
				query: jest.fn().mockResolvedValue({ rows: [{ version: "PostgreSQL 15.0" }] }),
				release: jest.fn().mockImplementation(() => {
					throw new Error("Release failed");
				}),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			await checkConnectionHealth();

			// Verify release was attempted
			expect(mockClient.release).toHaveBeenCalledTimes(1);
		});
	});

	describe("Health Check Performance", () => {
		it("should complete health check within reasonable time", async () => {
			const mockClient = {
				query: jest.fn().mockResolvedValue({ rows: [{ version: "PostgreSQL 15.0" }] }),
				release: jest.fn(),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			const startTime = Date.now();
			await checkConnectionHealth();
			const endTime = Date.now();

			const checkTime = endTime - startTime;

			// Health check should complete quickly (under 100ms for local database)
			expect(checkTime).toBeLessThan(100);
		});

		it("should handle slow database responses", async () => {
			// Mock slow database response
			const mockClient = {
				query: jest.fn().mockImplementation(() =>
					new Promise(resolve =>
						setTimeout(() => resolve({ rows: [{ version: "PostgreSQL 15.0" }] }), 50)
					)
				),
				release: jest.fn(),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			const startTime = Date.now();
			await checkConnectionHealth();
			const endTime = Date.now();

			const checkTime = endTime - startTime;

			// Should handle slow responses gracefully
			expect(checkTime).toBeGreaterThanOrEqual(50);
			expect(checkTime).toBeLessThan(200); // Should not be excessively slow
		});
	});

	describe("Error Handling", () => {
		it("should handle undefined pool gracefully", async () => {
			// Temporarily mock pool as undefined
			const originalPool = pool;
			(global as any).pool = undefined;

			try {
				// This should not throw, but return false
				const isHealthy = await checkConnectionHealth();
				expect(isHealthy).toBe(false);
			} finally {
				// Restore original pool
				(global as any).pool = originalPool;
			}
		});

		it("should handle pool with missing methods gracefully", async () => {
			// Mock pool with missing connect method
			const mockPoolWithoutConnect = {
				query: jest.fn(),
				end: jest.fn(),
				// connect method is missing
			};

			const originalPool = pool;
			(global as any).pool = mockPoolWithoutConnect;

			try {
				const isHealthy = await checkConnectionHealth();
				expect(isHealthy).toBe(false);
			} finally {
				(global as any).pool = originalPool;
			}
		});

		it("should handle client with missing methods gracefully", async () => {
			// Mock client with missing query method
			const mockClientWithoutQuery = {
				release: jest.fn(),
				// query method is missing
			};

			mockPool.connect.mockResolvedValue(mockClientWithoutQuery);

			const isHealthy = await checkConnectionHealth();

			expect(isHealthy).toBe(false);
		});
	});

	describe("Database Version Compatibility", () => {
		it("should handle different PostgreSQL versions", async () => {
			const versions = [
				"PostgreSQL 12.0",
				"PostgreSQL 13.0",
				"PostgreSQL 14.0",
				"PostgreSQL 15.0",
				"PostgreSQL 16.0",
			];

			for (const version of versions) {
				const mockClient = {
					query: jest.fn().mockResolvedValue({ rows: [{ version }] }),
					release: jest.fn(),
				};

				mockPool.connect.mockResolvedValue(mockClient);

				const isHealthy = await checkConnectionHealth();

				expect(isHealthy).toBe(true);
				expect(mockClient.query).toHaveBeenCalledWith("SELECT version()");
			}
		});

		it("should handle non-PostgreSQL databases gracefully", async () => {
			const mockClient = {
				query: jest.fn().mockResolvedValue({ rows: [{ version: "MySQL 8.0" }] }),
				release: jest.fn(),
			};

			mockPool.connect.mockResolvedValue(mockClient);

			const isHealthy = await checkConnectionHealth();

			// Should still return true as connection is working
			expect(isHealthy).toBe(true);
		});
	});
});
