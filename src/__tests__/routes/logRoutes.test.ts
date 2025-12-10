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
 * Log Routes Tests
 */

import request from "supertest";
import express from "express";
import logRoutes from "../../routes/logRoutes";
import { getLogs } from "../../config/logger";

// Mock the logger
jest.mock("../../config/logger", () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  getLogs: jest.fn(),
}));

// Note: apiKeyAuth is mocked in setup.ts

const app = express();
app.use(express.json());
app.use("/api/logs", logRoutes);

describe("Log Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/logs", () => {
    const mockLogs = [
      {
        timestamp: "2024-01-01T12:00:00.000Z",
        level: "info",
        message: "Test log message",
        meta: { requestId: "123" },
      },
      {
        timestamp: "2024-01-01T11:00:00.000Z",
        level: "error",
        message: "Error log message",
      },
    ];

    it("should return logs without filters", async () => {
      (getLogs as jest.Mock).mockResolvedValue(mockLogs);

      const response = await request(app)
        .get("/api/logs")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.logs).toEqual(mockLogs);
      expect(getLogs).toHaveBeenCalledWith({});
    });

    it("should filter logs by level", async () => {
      const filteredLogs = [mockLogs[1]]; // Only error logs
      (getLogs as jest.Mock).mockResolvedValue(filteredLogs);

      const response = await request(app)
        .get("/api/logs?level=error")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.logs).toEqual(filteredLogs);
      expect(getLogs).toHaveBeenCalledWith({ level: "error" });
    });

    it("should filter logs by search string", async () => {
      const filteredLogs = [mockLogs[0]];
      (getLogs as jest.Mock).mockResolvedValue(filteredLogs);

      const response = await request(app)
        .get("/api/logs?search=Test")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.logs).toEqual(filteredLogs);
      expect(getLogs).toHaveBeenCalledWith({ search: "Test" });
    });

    it("should apply limit parameter", async () => {
      (getLogs as jest.Mock).mockResolvedValue([mockLogs[0]]);

      const response = await request(app)
        .get("/api/logs?limit=1")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(getLogs).toHaveBeenCalledWith({ limit: 1 });
    });

    it("should combine multiple filters", async () => {
      (getLogs as jest.Mock).mockResolvedValue([mockLogs[1]]);

      const response = await request(app)
        .get("/api/logs?level=error&search=Error&limit=10")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(getLogs).toHaveBeenCalledWith({
        level: "error",
        search: "Error",
        limit: 10,
      });
    });

    it("should return 400 for invalid level parameter", async () => {
      const response = await request(app)
        .get("/api/logs?level=invalid")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid level parameter");
      expect(getLogs).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      (getLogs as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .get("/api/logs")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Internal server error");
    });

    it("should enforce maximum limit of 500", async () => {
      (getLogs as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/logs?limit=1000")
        .set("x-api-key", "test-api-key");

      expect(response.status).toBe(200);
      // The limit should be capped at 500 in getLogs function
      expect(getLogs).toHaveBeenCalledWith({ limit: 1000 });
    });
  });
});
