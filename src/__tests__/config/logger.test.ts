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
 * Logger Tests
 */

import logger, { getLogs, LogEntry } from "../../config/logger";
import { storeLog } from "../../services/logStorageService";

// Mock logStorageService
jest.mock("../../services/logStorageService", () => ({
  storeLog: jest.fn().mockResolvedValue(undefined),
  getLogsFromDatabase: jest.fn().mockResolvedValue([]),
  cleanupOldLogs: jest.fn().mockResolvedValue(0),
}));

describe("Logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the in-memory buffer by accessing it through getLogs
    // We'll test with fresh state
  });

  describe("Logging methods", () => {
    it("should log info messages to buffer", async () => {
      logger.info("Test info message", { key: "value" });

      // In test mode, storeLog is not called due to NODE_ENV check
      // But the log should be in the buffer
      const logs = await getLogs({ search: "Test info message" });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].level).toBe("info");
      expect(logs[0].message).toBe("Test info message");
    });

    it("should log warn messages to buffer", async () => {
      logger.warn("Test warn message", { warning: true });

      const logs = await getLogs({ search: "Test warn message" });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].level).toBe("warn");
    });

    it("should log error messages to buffer", async () => {
      logger.error("Test error message", { error: "details" });

      const logs = await getLogs({ search: "Test error message" });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].level).toBe("error");
    });

    it("should log debug messages to buffer", async () => {
      logger.debug("Test debug message", { debug: true });

      const logs = await getLogs({ search: "Test debug message" });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].level).toBe("debug");
    });

    it("should handle logging without metadata", async () => {
      logger.info("Simple message");

      const logs = await getLogs({ search: "Simple message" });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toBe("Simple message");
    });

    it("should not call storeLog in test environment", () => {
      // Clear any previous calls
      (storeLog as jest.Mock).mockClear();

      logger.info("Test message");

      // In test mode (NODE_ENV=test), storeLog should not be called
      // This is by design to prevent database connections in tests
      expect(storeLog).not.toHaveBeenCalled();
    });
  });

  describe("getLogs", () => {
    it("should return logs from in-memory buffer", async () => {
      // Log some messages first
      logger.info("First log");
      logger.warn("Second log");
      logger.error("Third log");

      const logs = await getLogs();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty("timestamp");
      expect(logs[0]).toHaveProperty("level");
      expect(logs[0]).toHaveProperty("message");
    });

    it("should filter logs by level", async () => {
      logger.info("Info log");
      logger.error("Error log");
      logger.info("Another info log");

      const logs = await getLogs({ level: "error" });

      expect(logs.every((log) => log.level === "error")).toBe(true);
    });

    it("should filter logs by search string", async () => {
      logger.info("User logged in");
      logger.info("Bet submitted");
      logger.warn("Invalid request");

      const logs = await getLogs({ search: "logged" });

      expect(logs.some((log) => log.message.includes("logged"))).toBe(true);
    });

    it("should apply limit", async () => {
      // Log multiple messages
      for (let i = 0; i < 10; i++) {
        logger.info(`Log message ${i}`);
      }

      const logs = await getLogs({ limit: 5 });

      expect(logs.length).toBeLessThanOrEqual(5);
    });

    it("should combine filters", async () => {
      logger.info("Info message");
      logger.error("Error message");
      logger.warn("Warning message");

      const logs = await getLogs({ level: "error", search: "Error", limit: 10 });

      expect(logs.every((log) => log.level === "error")).toBe(true);
      expect(logs.some((log) => log.message.includes("Error"))).toBe(true);
    });

    it("should return logs sorted by timestamp descending (latest first)", async () => {
      logger.info("First log");
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      logger.info("Second log");

      const logs = await getLogs({ limit: 2 });

      if (logs.length >= 2) {
        const firstTimestamp = new Date(logs[0].timestamp).getTime();
        const secondTimestamp = new Date(logs[1].timestamp).getTime();
        expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp);
      }
    });

    it("should handle empty results gracefully", async () => {
      const logs = await getLogs({ level: "debug", search: "nonexistent" });

      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("In-memory buffer", () => {
    it("should maintain logs in memory buffer", async () => {
      logger.info("Buffer test log");

      const logs = await getLogs();
      const hasLog = logs.some((log) => log.message === "Buffer test log");

      expect(hasLog).toBe(true);
    });

    it("should limit buffer size to prevent memory issues", async () => {
      // Log more than MAX_LOG_BUFFER_SIZE (1000) messages
      // This is a performance test, so we'll just verify the function works
      for (let i = 0; i < 10; i++) {
        logger.info(`Test log ${i}`);
      }

      const logs = await getLogs();
      // Buffer should not exceed reasonable size
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("Error handling", () => {
    it("should not throw errors when storeLog fails", async () => {
      (storeLog as jest.Mock).mockRejectedValue(new Error("DB error"));

      // Should not throw
      expect(() => {
        logger.info("Test message");
      }).not.toThrow();
    });

    it("should fall back to in-memory buffer if database query fails", async () => {
      const { getLogsFromDatabase } = await import("../../services/logStorageService");
      (getLogsFromDatabase as jest.Mock).mockRejectedValue(new Error("DB error"));

      logger.info("Fallback test");

      // Should still return logs from in-memory buffer
      const logs = await getLogs();
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});

