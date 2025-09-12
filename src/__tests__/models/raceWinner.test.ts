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
 * Tests for race winner model
 */

import { RaceWinnerModel, RaceWinner } from "../../models/RaceWinner";

// Mock the database pool
jest.mock("../../config/database", () => ({
	query: jest.fn()
}));

// Mock logger
jest.mock("../../config/logger", () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}));

describe("RaceWinnerModel", () => {
	const mockPool = require("../../config/database");

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("findByRaceId", () => {
		it("should find winner by race ID", async () => {
			const mockWinner = {
				id: 1,
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				winning_payout_1_p3: 94.30,
				extraction_method: "header",
				extraction_confidence: "high",
				created_at: new Date(),
				updated_at: new Date()
			};
			mockPool.query.mockResolvedValue({ rows: [mockWinner] });

			const result = await RaceWinnerModel.findByRaceId("AQU_20250115_1");

			expect(result).toEqual(mockWinner);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("SELECT * FROM race_winners"),
				["AQU_20250115_1"]
			);
		});

		it("should return null when winner not found", async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await RaceWinnerModel.findByRaceId("AQU_20250115_1");

			expect(result).toBeNull();
		});

		it("should handle database errors", async () => {
			mockPool.query.mockRejectedValue(new Error("Database error"));

			await expect(RaceWinnerModel.findByRaceId("AQU_20250115_1")).rejects.toThrow("Database error");
		});
	});

	describe("create", () => {
		it("should create a new race winner", async () => {
			const mockWinner = {
				id: 1,
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				winning_payout_1_p3: 94.30,
				extraction_method: "header",
				extraction_confidence: "high",
				created_at: new Date(),
				updated_at: new Date()
			};
			mockPool.query.mockResolvedValue({ rows: [mockWinner] });

			const winnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				winning_payout_1_p3: 94.30,
				extraction_method: "header" as const,
				extraction_confidence: "high" as const
			};

			const result = await RaceWinnerModel.create(winnerData);

			expect(result).toEqual(mockWinner);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO race_winners"),
				["AQU_20250115_1", 7, 29.32, 94.30, "header", "high"]
			);
		});

		it("should handle database errors", async () => {
			mockPool.query.mockRejectedValue(new Error("Database error"));

			const winnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "header" as const,
				extraction_confidence: "high" as const
			};

			await expect(RaceWinnerModel.create(winnerData)).rejects.toThrow("Database error");
		});
	});

	describe("createWithClient", () => {
		it("should create winner with database client", async () => {
			const mockClient = { query: jest.fn() };
			const mockWinner = {
				id: 1,
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "header",
				extraction_confidence: "high"
			};
			mockClient.query.mockResolvedValue({ rows: [mockWinner] });

			const winnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "header" as const,
				extraction_confidence: "high" as const
			};

			const result = await RaceWinnerModel.createWithClient(mockClient, winnerData);

			expect(result).toEqual(mockWinner);
			expect(mockClient.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO race_winners"),
				["AQU_20250115_1", 7, undefined, undefined, "header", "high"]
			);
		});
	});

	describe("update", () => {
		it("should update existing race winner", async () => {
			const mockWinner = {
				id: 1,
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 35.50,
				extraction_method: "summary",
				extraction_confidence: "medium",
				updated_at: new Date()
			};
			mockPool.query.mockResolvedValue({ rows: [mockWinner] });

			const updateData = {
				winning_payout_2_dollar: 35.50,
				extraction_method: "summary" as const,
				extraction_confidence: "medium" as const
			};

			const result = await RaceWinnerModel.update(1, updateData);

			expect(result).toEqual(mockWinner);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("UPDATE race_winners"),
				[35.50, "summary", "medium", 1]
			);
		});

		it("should throw error when no fields to update", async () => {
			await expect(RaceWinnerModel.update(1, {})).rejects.toThrow("No fields to update");
		});

		it("should throw error when winner not found", async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const updateData = { winning_payout_2_dollar: 35.50 };

			await expect(RaceWinnerModel.update(1, updateData)).rejects.toThrow("Race winner with id 1 not found");
		});
	});

	describe("upsert", () => {
		it("should upsert race winner", async () => {
			const mockWinner = {
				id: 1,
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				extraction_method: "header",
				extraction_confidence: "high"
			};
			mockPool.query.mockResolvedValue({ rows: [mockWinner] });

			const winnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				extraction_method: "header" as const,
				extraction_confidence: "high" as const
			};

			const result = await RaceWinnerModel.upsert(winnerData);

			expect(result).toEqual(mockWinner);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO race_winners"),
				["AQU_20250115_1", 7, 29.32, undefined, "header", "high"]
			);
		});
	});

	describe("upsertWithClient", () => {
		it("should upsert winner with database client", async () => {
			const mockClient = { query: jest.fn() };
			const mockWinner = {
				id: 1,
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "header",
				extraction_confidence: "high"
			};
			mockClient.query.mockResolvedValue({ rows: [mockWinner] });

			const winnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "header" as const,
				extraction_confidence: "high" as const
			};

			const result = await RaceWinnerModel.upsertWithClient(mockClient, winnerData);

			expect(result).toEqual(mockWinner);
			expect(mockClient.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO race_winners"),
				["AQU_20250115_1", 7, undefined, undefined, "header", "high"]
			);
		});
	});

	describe("deleteByRaceId", () => {
		it("should delete winner by race ID", async () => {
			mockPool.query.mockResolvedValue({ rowCount: 1 });

			const result = await RaceWinnerModel.deleteByRaceId("AQU_20250115_1");

			expect(result).toBe(true);
			expect(mockPool.query).toHaveBeenCalledWith(
				"DELETE FROM race_winners WHERE race_id = $1",
				["AQU_20250115_1"]
			);
		});

		it("should return false when no winner deleted", async () => {
			mockPool.query.mockResolvedValue({ rowCount: 0 });

			const result = await RaceWinnerModel.deleteByRaceId("AQU_20250115_1");

			expect(result).toBe(false);
		});
	});

	describe("findByDateRange", () => {
		it("should find winners by date range", async () => {
			const mockWinners = [
				{ id: 1, race_id: "AQU_20250115_1", winning_horse_number: 7 },
				{ id: 2, race_id: "AQU_20250116_1", winning_horse_number: 3 }
			];
			mockPool.query.mockResolvedValue({ rows: mockWinners });

			const result = await RaceWinnerModel.findByDateRange("2025-01-15", "2025-01-16");

			expect(result).toEqual(mockWinners);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("SELECT rw.* FROM race_winners rw"),
				["2025-01-15", "2025-01-16"]
			);
		});
	});

	describe("findByTrack", () => {
		it("should find winners by track", async () => {
			const mockWinners = [
				{ id: 1, race_id: "AQU_20250115_1", winning_horse_number: 7 },
				{ id: 2, race_id: "AQU_20250115_2", winning_horse_number: 3 }
			];
			mockPool.query.mockResolvedValue({ rows: mockWinners });

			const result = await RaceWinnerModel.findByTrack(1);

			expect(result).toEqual(mockWinners);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("SELECT rw.* FROM race_winners rw"),
				[1]
			);
		});
	});
});
