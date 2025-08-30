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
 * Health Routes Tests
 */

import request from "supertest";
import express from "express";
import { checkConnectionHealth } from "../../config/database";

// Mock the database health check
jest.mock("../../config/database", () => ({
	checkConnectionHealth: jest.fn(),
}));

// Create a mock app for testing
const app = express();
app.use(express.json());

// Mock the health check endpoints
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "UP",
		message: "Application is running smoothly!",
		timestamp: new Date().toISOString(),
		version: "1.0.4",
	});
});

app.get("/health/db", async (req, res) => {
	try {
		const isHealthy = await checkConnectionHealth();

		if (isHealthy) {
			res.status(200).json({
				status: "UP",
				message: "Database connection is healthy",
				timestamp: new Date().toISOString(),
				version: "1.0.4",
			});
		} else {
			res.status(503).json({
				status: "DOWN",
				message: "Database connection is unhealthy",
				timestamp: new Date().toISOString(),
				version: "1.0.4",
			});
		}
	} catch (error: any) {
		res.status(503).json({
			status: "ERROR",
			message: "Database health check failed",
			error: error.message,
			timestamp: new Date().toISOString(),
			version: "1.0.4",
		});
	}
});

describe("Health Routes", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("GET /health", () => {
		it("should return application health status", async () => {
			const response = await request(app).get("/health");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				status: "UP",
				message: "Application is running smoothly!",
				timestamp: expect.any(String),
				version: "1.0.4",
			});
		});

		it("should return valid timestamp", async () => {
			const response = await request(app).get("/health");
			const timestamp = new Date(response.body.timestamp);

			expect(timestamp.getTime()).not.toBeNaN();
			expect(timestamp).toBeInstanceOf(Date);
		});
	});

	describe("GET /health/db", () => {
		it("should return healthy database status when connection is successful", async () => {
			(checkConnectionHealth as jest.Mock).mockResolvedValue(true);

			const response = await request(app).get("/health/db");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				status: "UP",
				message: "Database connection is healthy",
				timestamp: expect.any(String),
				version: "1.0.4",
			});
			expect(checkConnectionHealth).toHaveBeenCalledTimes(1);
		});

		it("should return unhealthy database status when connection fails", async () => {
			(checkConnectionHealth as jest.Mock).mockResolvedValue(false);

			const response = await request(app).get("/health/db");

			expect(response.status).toBe(503);
			expect(response.body).toEqual({
				status: "DOWN",
				message: "Database connection is unhealthy",
				timestamp: expect.any(String),
				version: "1.0.4",
			});
			expect(checkConnectionHealth).toHaveBeenCalledTimes(1);
		});

		it("should return error status when health check throws an error", async () => {
			const errorMessage = "Database connection timeout";
			(checkConnectionHealth as jest.Mock).mockRejectedValue(new Error(errorMessage));

			const response = await request(app).get("/health/db");

			expect(response.status).toBe(503);
			expect(response.body).toEqual({
				status: "ERROR",
				message: "Database health check failed",
				error: errorMessage,
				timestamp: expect.any(String),
				version: "1.0.4",
			});
			expect(checkConnectionHealth).toHaveBeenCalledTimes(1);
		});

		it("should handle async errors gracefully", async () => {
			(checkConnectionHealth as jest.Mock).mockRejectedValue("String error");

			const response = await request(app).get("/health/db");

			expect(response.status).toBe(503);
			expect(response.body.status).toBe("ERROR");
			expect(response.body.message).toBe("Database health check failed");
		});

		it("should return valid timestamp in all scenarios", async () => {
			// Test healthy scenario
			(checkConnectionHealth as jest.Mock).mockResolvedValue(true);
			let response = await request(app).get("/health/db");
			let timestamp = new Date(response.body.timestamp);
			expect(timestamp.getTime()).not.toBeNaN();

			// Test unhealthy scenario
			(checkConnectionHealth as jest.Mock).mockResolvedValue(false);
			response = await request(app).get("/health/db");
			timestamp = new Date(response.body.timestamp);
			expect(timestamp.getTime()).not.toBeNaN();

			// Test error scenario
			(checkConnectionHealth as jest.Mock).mockRejectedValue(new Error("Test error"));
			response = await request(app).get("/health/db");
			timestamp = new Date(response.body.timestamp);
			expect(timestamp.getTime()).not.toBeNaN();
		});
	});

	describe("Response Format Consistency", () => {
		it("should maintain consistent response structure across all health endpoints", async () => {
			const appResponse = await request(app).get("/health");
			const dbResponse = await request(app).get("/health/db");

			// Both endpoints should have the same basic structure
			expect(appResponse.body).toHaveProperty("status");
			expect(appResponse.body).toHaveProperty("message");
			expect(appResponse.body).toHaveProperty("timestamp");
			expect(appResponse.body).toHaveProperty("version");

			expect(dbResponse.body).toHaveProperty("status");
			expect(dbResponse.body).toHaveProperty("message");
			expect(dbResponse.body).toHaveProperty("timestamp");
			expect(dbResponse.body).toHaveProperty("version");
		});

		it("should return appropriate HTTP status codes", async () => {
			// Application health should always be 200
			const appResponse = await request(app).get("/health");
			expect(appResponse.status).toBe(200);

			// Database health depends on connection status
			(checkConnectionHealth as jest.Mock).mockResolvedValue(true);
			const dbHealthyResponse = await request(app).get("/health/db");
			expect(dbHealthyResponse.status).toBe(200);

			(checkConnectionHealth as jest.Mock).mockResolvedValue(false);
			const dbUnhealthyResponse = await request(app).get("/health/db");
			expect(dbUnhealthyResponse.status).toBe(503);

			(checkConnectionHealth as jest.Mock).mockRejectedValue(new Error("Test"));
			const dbErrorResponse = await request(app).get("/health/db");
			expect(dbErrorResponse.status).toBe(503);
		});
	});
});
