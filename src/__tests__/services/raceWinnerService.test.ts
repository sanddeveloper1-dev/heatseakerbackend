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
 * Tests for race winner service
 */

import { RaceWinnerService } from "../../services/raceWinnerService";
import { RaceEntry } from "../../models/RaceEntry";
import { RaceWinnerData } from "../../types/raceTypes";

// Mock the database models
jest.mock("../../models/RaceWinner", () => ({
	RaceWinnerModel: {
		findByRaceId: jest.fn(),
		upsert: jest.fn(),
		upsertWithClient: jest.fn(),
		deleteByRaceId: jest.fn(),
		deleteByRaceIdWithClient: jest.fn(),
		findByDateRange: jest.fn(),
		findByTrack: jest.fn()
	}
}));

// Mock logger
jest.mock("../../config/logger", () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}));

describe("RaceWinnerService", () => {
	const mockRaceEntries: RaceEntry[] = [
		{
			id: 1,
			race_id: "AQU_20250115_1",
			horse_number: 1,
			double: 5.5,
			constant: 10.0,
			p3: "FALSE",
			correct_p3: 8.5,
			ml: 3.0,
			live_odds: 2.8,
			sharp_percent: "105.2%",
			action: 0.1,
			double_delta: 0.2,
			p3_delta: 0.3,
			x_figure: 1.5,
			will_pay_2: "$15.40",
			will_pay: "$7.70",
			will_pay_1_p3: "$123.50",
			win_pool: "$2,500.00",
			veto_rating: "4.2",
			raw_data: "test data",
			source_file: "test.csv",
			created_at: new Date(),
			updated_at: new Date()
		},
		{
			id: 2,
			race_id: "AQU_20250115_1",
			horse_number: 7,
			double: 8.2,
			constant: 12.0,
			p3: "12.5",
			correct_p3: 15.3,
			ml: 4.5,
			live_odds: 3.2,
			sharp_percent: "98.5%",
			action: -0.2,
			double_delta: -0.1,
			p3_delta: 0.5,
			x_figure: 2.1,
			will_pay_2: "$29.32",
			will_pay: "$14.66",
			will_pay_1_p3: "$94.30",
			win_pool: "$3,200.00",
			veto_rating: "3.8",
			raw_data: "test data",
			source_file: "test.csv",
			created_at: new Date(),
			updated_at: new Date()
		}
	];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("extractWinner", () => {
		it("should extract winner from race_winners data with high confidence", () => {
			const raceWinnersData = {
				race_1: {
					winning_horse_number: 7,
					winning_payout_2_dollar: 29.32,
					winning_payout_1_p3: 94.30
				}
			};

			const result = RaceWinnerService.extractWinner(
				"AQU_20250115_1",
				mockRaceEntries,
				raceWinnersData,
				"1"
			);

			expect(result.success).toBe(true);
			expect(result.winner).toEqual({
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				winning_payout_1_p3: 94.30,
				extraction_method: "header",
				extraction_confidence: "high"
			});
			expect(result.extractionMethod).toBe("header");
			expect(result.confidence).toBe("high");
		});

		it("should fall back to summary method with medium confidence", () => {
			const result = RaceWinnerService.extractWinner(
				"AQU_20250115_1",
				mockRaceEntries,
				undefined,
				"1"
			);

			expect(result.success).toBe(true);
			expect(result.winner?.winning_horse_number).toBe(7); // Horse with highest will_pay_2
			expect(result.extractionMethod).toBe("summary");
			expect(result.confidence).toBe("medium");
		});

		it("should return error when no winner can be determined", () => {
			const emptyEntries: RaceEntry[] = [];
			const result = RaceWinnerService.extractWinner(
				"AQU_20250115_1",
				emptyEntries,
				undefined,
				"1"
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("No winner could be determined");
		});

		it("should validate winning horse number exists in race entries", () => {
			const raceWinnersData = {
				race_1: {
					winning_horse_number: 99, // Invalid horse number
					winning_payout_2_dollar: 29.32,
					winning_payout_1_p3: 94.30
				}
			};

			const result = RaceWinnerService.extractWinner(
				"AQU_20250115_1",
				mockRaceEntries,
				raceWinnersData,
				"1"
			);

			expect(result.success).toBe(true);
			expect(result.extractionMethod).toBe("summary"); // Should fall back
		});
	});

	describe("validateWinner", () => {
		it("should validate correct winner data", () => {
			const winner: RaceWinnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				winning_payout_1_p3: 94.30,
				extraction_method: "header",
				extraction_confidence: "high"
			};

			const result = RaceWinnerService.validateWinner(winner);
			expect(result.error).toBeUndefined();
			expect(result.value).toEqual(winner);
		});

		it("should reject invalid horse number", () => {
			const winner: RaceWinnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 20, // Invalid: > 16
				extraction_method: "header",
				extraction_confidence: "high"
			};

			const result = RaceWinnerService.validateWinner(winner);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("winning_horse_number");
		});

		it("should reject invalid extraction method", () => {
			const winner: RaceWinnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "invalid" as any,
				extraction_confidence: "high"
			};

			const result = RaceWinnerService.validateWinner(winner);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("extraction_method");
		});

		it("should reject invalid confidence level", () => {
			const winner: RaceWinnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "header",
				extraction_confidence: "invalid" as any
			};

			const result = RaceWinnerService.validateWinner(winner);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("extraction_confidence");
		});
	});

	describe("processWinner", () => {
		it("should process valid winner data", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
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
			RaceWinnerModel.upsert.mockResolvedValue(mockWinner);

			const winner: RaceWinnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				winning_payout_1_p3: 94.30,
				extraction_method: "header",
				extraction_confidence: "high"
			};

			const result = await RaceWinnerService.processWinner(winner);

			expect(result.success).toBe(true);
			expect(result.raceId).toBe("AQU_20250115_1");
			expect(result.winner).toEqual(mockWinner);
			expect(RaceWinnerModel.upsert).toHaveBeenCalledWith(winner);
		});

		it("should handle validation errors", async () => {
			const winner: RaceWinnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 20, // Invalid
				extraction_method: "header",
				extraction_confidence: "high"
			};

			const result = await RaceWinnerService.processWinner(winner);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Validation error");
		});

		it("should handle database errors", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			RaceWinnerModel.upsert.mockRejectedValue(new Error("Database error"));

			const winner: RaceWinnerData = {
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				extraction_method: "header",
				extraction_confidence: "high"
			};

			const result = await RaceWinnerService.processWinner(winner);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Database error");
		});
	});

	describe("processWinners", () => {
		it("should process multiple winners successfully", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			const mockWinner1 = { id: 1, race_id: "AQU_20250115_1", winning_horse_number: 7 };
			const mockWinner2 = { id: 2, race_id: "AQU_20250115_2", winning_horse_number: 3 };

			RaceWinnerModel.upsert
				.mockResolvedValueOnce(mockWinner1)
				.mockResolvedValueOnce(mockWinner2);

			const winners: RaceWinnerData[] = [
				{
					race_id: "AQU_20250115_1",
					winning_horse_number: 7,
					extraction_method: "header",
					extraction_confidence: "high"
				},
				{
					race_id: "AQU_20250115_2",
					winning_horse_number: 3,
					extraction_method: "summary",
					extraction_confidence: "medium"
				}
			];

			const result = await RaceWinnerService.processWinners(winners);

			expect(result.successful).toHaveLength(2);
			expect(result.failed).toHaveLength(0);
			expect(result.totalWinners).toBe(2);
			expect(result.errors).toHaveLength(0);
		});

		it("should handle mixed success and failure", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			const mockWinner = { id: 1, race_id: "AQU_20250115_1", winning_horse_number: 7 };

			RaceWinnerModel.upsert
				.mockResolvedValueOnce(mockWinner)
				.mockRejectedValueOnce(new Error("Database error"));

			const winners: RaceWinnerData[] = [
				{
					race_id: "AQU_20250115_1",
					winning_horse_number: 7,
					extraction_method: "header",
					extraction_confidence: "high"
				},
				{
					race_id: "AQU_20250115_2",
					winning_horse_number: 20, // Invalid
					extraction_method: "header",
					extraction_confidence: "high"
				}
			];

			const result = await RaceWinnerService.processWinners(winners);

			expect(result.successful).toHaveLength(1);
			expect(result.failed).toHaveLength(1);
			expect(result.totalWinners).toBe(2);
			expect(result.errors).toHaveLength(1);
		});
	});

	describe("getWinnerByRaceId", () => {
		it("should retrieve winner by race ID", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			const mockWinner = {
				id: 1,
				race_id: "AQU_20250115_1",
				winning_horse_number: 7,
				winning_payout_2_dollar: 29.32,
				winning_payout_1_p3: 94.30,
				extraction_method: "header",
				extraction_confidence: "high"
			};
			RaceWinnerModel.findByRaceId.mockResolvedValue(mockWinner);

			const result = await RaceWinnerService.getWinnerByRaceId("AQU_20250115_1");

			expect(result).toEqual(mockWinner);
			expect(RaceWinnerModel.findByRaceId).toHaveBeenCalledWith("AQU_20250115_1");
		});

		it("should return null when winner not found", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			RaceWinnerModel.findByRaceId.mockResolvedValue(null);

			const result = await RaceWinnerService.getWinnerByRaceId("AQU_20250115_1");

			expect(result).toBeNull();
		});
	});

	describe("getWinnersByDateRange", () => {
		it("should retrieve winners by date range", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			const mockWinners = [
				{ id: 1, race_id: "AQU_20250115_1", winning_horse_number: 7 },
				{ id: 2, race_id: "AQU_20250116_1", winning_horse_number: 3 }
			];
			RaceWinnerModel.findByDateRange.mockResolvedValue(mockWinners);

			const result = await RaceWinnerService.getWinnersByDateRange("2025-01-15", "2025-01-16");

			expect(result).toEqual(mockWinners);
			expect(RaceWinnerModel.findByDateRange).toHaveBeenCalledWith("2025-01-15", "2025-01-16");
		});
	});

	describe("getWinnersByTrack", () => {
		it("should retrieve winners by track", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			const mockWinners = [
				{ id: 1, race_id: "AQU_20250115_1", winning_horse_number: 7 },
				{ id: 2, race_id: "AQU_20250115_2", winning_horse_number: 3 }
			];
			RaceWinnerModel.findByTrack.mockResolvedValue(mockWinners);

			const result = await RaceWinnerService.getWinnersByTrack(1);

			expect(result).toEqual(mockWinners);
			expect(RaceWinnerModel.findByTrack).toHaveBeenCalledWith(1);
		});
	});

	describe("deleteWinnerByRaceId", () => {
		it("should delete winner by race ID", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			RaceWinnerModel.deleteByRaceId.mockResolvedValue(true);

			const result = await RaceWinnerService.deleteWinnerByRaceId("AQU_20250115_1");

			expect(result).toBe(true);
			expect(RaceWinnerModel.deleteByRaceId).toHaveBeenCalledWith("AQU_20250115_1");
		});

		it("should handle deletion with client", async () => {
			const { RaceWinnerModel } = require("../../models/RaceWinner");
			const mockClient = { query: jest.fn() };
			RaceWinnerModel.deleteByRaceIdWithClient.mockResolvedValue(true);

			const result = await RaceWinnerService.deleteWinnerByRaceId("AQU_20250115_1", mockClient);

			expect(result).toBe(true);
			expect(RaceWinnerModel.deleteByRaceIdWithClient).toHaveBeenCalledWith(mockClient, "AQU_20250115_1");
		});
	});
});
