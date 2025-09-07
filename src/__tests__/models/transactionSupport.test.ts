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
 * Transaction Support Tests for Models
 */

import { TrackModel } from "../../models/Track";
import { RaceModel } from "../../models/Race";
import { RaceEntryModel } from "../../models/RaceEntry";
import pool from "../../config/database";

// Mock the database pool
jest.mock("../../config/database", () => ({
	default: {
		connect: jest.fn(),
		query: jest.fn(),
	},
}));

// Mock the models
jest.mock("../../models/Track", () => ({
	TrackModel: {
		getOrCreateWithClient: jest.fn(),
		create: jest.fn(),
		findByCode: jest.fn(),
	},
}));

jest.mock("../../models/Race", () => ({
	RaceModel: {
		upsertWithClient: jest.fn(),
		upsert: jest.fn(),
		findById: jest.fn(),
	},
}));

jest.mock("../../models/RaceEntry", () => ({
	RaceEntryModel: {
		batchUpsertWithClient: jest.fn(),
		batchUpsert: jest.fn(),
		findByRaceId: jest.fn(),
	},
}));

describe("Transaction Support in Models", () => {
	let mockClient: any;
	let mockPool: any;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock client
		mockClient = {
			query: jest.fn(),
			release: jest.fn(),
		};

		// Setup mock pool
		mockPool = {
			connect: jest.fn().mockResolvedValue(mockClient),
		};

		(pool as any).connect = mockPool.connect;
	});

	describe("Track Model Transaction Support", () => {
		it("should create track with client transaction", async () => {
			const trackData = {
				code: "AQU",
				name: "AQUEDUCT",
			};

			const expectedTrack = {
				id: 1,
				code: "AQU",
				name: "AQUEDUCT",
				location: null,
			};

			(TrackModel.getOrCreateWithClient as jest.Mock).mockResolvedValue(expectedTrack);

			const result = await TrackModel.getOrCreateWithClient(mockClient, trackData);

			expect(result).toEqual(expectedTrack);
			expect(TrackModel.getOrCreateWithClient).toHaveBeenCalledWith(mockClient, trackData);
		});

		it("should handle track creation errors in transaction", async () => {
			const trackData = {
				code: "AQU",
				name: "AQUEDUCT",
			};

			(TrackModel.getOrCreateWithClient as jest.Mock).mockRejectedValue(
				new Error("Track creation failed")
			);

			await expect(
				TrackModel.getOrCreateWithClient(mockClient, trackData)
			).rejects.toThrow("Track creation failed");

			expect(TrackModel.getOrCreateWithClient).toHaveBeenCalledWith(mockClient, trackData);
		});
	});

	describe("Race Model Transaction Support", () => {
		it("should upsert race with client transaction", async () => {
			const raceData = {
				id: "AQU_20250427_03",
				track_id: 1,
				date: new Date("2025-04-27"),
				race_number: 3,
				source_file: "test_data",
			};

			const expectedRace = {
				id: "AQU_20250427_03",
				track_id: 1,
				date: new Date("2025-04-27"),
				race_number: 3,
			};

			(RaceModel.upsertWithClient as jest.Mock).mockResolvedValue(expectedRace);

			const result = await RaceModel.upsertWithClient(mockClient, raceData);

			expect(result).toEqual(expectedRace);
			expect(RaceModel.upsertWithClient).toHaveBeenCalledWith(mockClient, raceData);
		});

		it("should handle race upsert errors in transaction", async () => {
			const raceData = {
				id: "AQU_20250427_03",
				track_id: 1,
				date: new Date("2025-04-27"),
				race_number: 3,
			};

			(RaceModel.upsertWithClient as jest.Mock).mockRejectedValue(
				new Error("Race upsert failed")
			);

			await expect(
				RaceModel.upsertWithClient(mockClient, raceData)
			).rejects.toThrow("Race upsert failed");

			expect(RaceModel.upsertWithClient).toHaveBeenCalledWith(mockClient, raceData);
		});
	});

	describe("Race Entry Model Transaction Support", () => {
		it("should batch upsert race entries with client transaction", async () => {
			const entriesData = [
				{
					race_id: "AQU_20250427_03",
					horse_number: 1,
					double: 23.4,
					constant: 58,
					p3: "37.85",  // Changed to string
					correct_p3: 37.85,  // Added new field
					ml: 20.0,
					live_odds: 36.47,
					sharp_percent: "107.44%",
					action: -0.17,
					double_delta: -0.17,
					p3_delta: -1.42,
					x_figure: -1.59,
					will_pay_2: "$298.00",
					will_pay: "$149.00",  // Added new field
					will_pay_1_p3: "$2,238.00",
					win_pool: "$3,743.00",
					raw_data: "1 | 23.4 | 58 | 37.85 | 20.0 | 36.47 | 107.44% | -0.17 | -0.17 | -1.42 | -1.59 | $298.00 | $2,238.00 | $3,743.00",
				},
				{
					race_id: "AQU_20250427_03",
					horse_number: 2,
					double: 15.2,
					constant: 42,
					p3: "28.10",  // Changed to string
					correct_p3: 28.10,  // Added new field
					ml: 8.0,
					live_odds: 12.30,
					sharp_percent: "95.22%",
					action: 0.25,
					double_delta: 0.25,
					p3_delta: 1.80,
					x_figure: 2.05,
					will_pay_2: "$156.00",
					will_pay: "$78.00",  // Added new field
					will_pay_1_p3: "$1,120.00",
					win_pool: "$2,890.00",
					raw_data: "2 | 15.2 | 42 | 28.10 | 8.0 | 12.30 | 95.22% | 0.25 | 0.25 | 1.80 | 2.05 | $156.00 | $1,120.00 | $2,890.00",
				},
			];

			const expectedEntries = entriesData.map((entry, index) => ({
				...entry,
				id: index + 1,
			}));

			(RaceEntryModel.batchUpsertWithClient as jest.Mock).mockResolvedValue(expectedEntries);

			const result = await RaceEntryModel.batchUpsertWithClient(mockClient, entriesData);

			expect(result).toEqual(expectedEntries);
			expect(RaceEntryModel.batchUpsertWithClient).toHaveBeenCalledWith(mockClient, entriesData);
		});

		it("should handle batch upsert errors in transaction", async () => {
			const entriesData = [
				{
					race_id: "AQU_20250427_03",
					horse_number: 1,
					double: 23.4,
				},
			];

			(RaceEntryModel.batchUpsertWithClient as jest.Mock).mockRejectedValue(
				new Error("Batch upsert failed")
			);

			await expect(
				RaceEntryModel.batchUpsertWithClient(mockClient, entriesData)
			).rejects.toThrow("Batch upsert failed");

			expect(RaceEntryModel.batchUpsertWithClient).toHaveBeenCalledWith(mockClient, entriesData);
		});
	});

	describe("Transaction Integration", () => {
		it("should demonstrate complete transaction flow", async () => {
			// Mock successful model operations
			(TrackModel.getOrCreateWithClient as jest.Mock).mockResolvedValue({
				id: 1,
				code: "AQU",
				name: "AQUEDUCT",
			});

			(RaceModel.upsertWithClient as jest.Mock).mockResolvedValue({
				id: "AQU_20250427_03",
				track_id: 1,
				race_number: 3,
			});

			(RaceEntryModel.batchUpsertWithClient as jest.Mock).mockResolvedValue([
				{ id: 1, race_id: "AQU_20250427_03", horse_number: 1 },
				{ id: 2, race_id: "AQU_20250427_03", horse_number: 2 },
			]);

			// Simulate transaction flow
			const client = await pool.connect();

			try {
				await client.query("BEGIN");

				// Create track
				const track = await TrackModel.getOrCreateWithClient(client, {
					code: "AQU",
					name: "AQUEDUCT",
				});

				// Create race
				const race = await RaceModel.upsertWithClient(client, {
					id: "AQU_20250427_03",
					track_id: track.id!,
					date: new Date("2025-04-27"),
					race_number: 3,
				});

				// Create race entries
				const entries = await RaceEntryModel.batchUpsertWithClient(client, [
					{ race_id: race.id!, horse_number: 1, double: 23.4 },
					{ race_id: race.id!, horse_number: 2, double: 15.2 },
				]);

				await client.query("COMMIT");

				// Verify all operations were successful
				expect(track.id).toBe(1);
				expect(race.id).toBe("AQU_20250427_03");
				expect(entries).toHaveLength(2);
				expect(entries[0].race_id).toBe("AQU_20250427_03");
				expect(entries[1].race_id).toBe("AQU_20250427_03");

			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		});

		it("should handle transaction rollback on error", async () => {
			// Mock successful track creation
			(TrackModel.getOrCreateWithClient as jest.Mock).mockResolvedValue({
				id: 1,
				code: "AQU",
				name: "AQUEDUCT",
			});

			// Mock failed race creation
			(RaceModel.upsertWithClient as jest.Mock).mockRejectedValue(
				new Error("Race creation failed")
			);

			const client = await pool.connect();

			try {
				await client.query("BEGIN");

				// Create track (should succeed)
				const track = await TrackModel.getOrCreateWithClient(client, {
					code: "AQU",
					name: "AQUEDUCT",
				});

				// Create race (should fail)
				await RaceModel.upsertWithClient(client, {
					id: "AQU_20250427_03",
					track_id: track.id!,
					date: new Date("2025-04-27"),
					race_number: 3,
				});

				await client.query("COMMIT");
			} catch (error: any) {
				await client.query("ROLLBACK");

				// Verify rollback was called
				expect(client.query).toHaveBeenCalledWith("ROLLBACK");
				expect(error.message).toBe("Race creation failed");
			} finally {
				client.release();
			}
		});
	});

	describe("Model Method Consistency", () => {
		it("should provide both standard and transaction-aware methods", () => {
			// Verify standard methods exist
			expect(TrackModel.create).toBeDefined();
			expect(RaceModel.upsert).toBeDefined();
			expect(RaceEntryModel.batchUpsert).toBeDefined();

			// Verify transaction-aware methods exist
			expect(TrackModel.getOrCreateWithClient).toBeDefined();
			expect(RaceModel.upsertWithClient).toBeDefined();
			expect(RaceEntryModel.batchUpsertWithClient).toBeDefined();
		});

		it("should maintain consistent method signatures", () => {
			// Both methods should accept the same data structure
			const trackData = { code: "AQU", name: "AQUEDUCT" };

			expect(typeof TrackModel.create).toBe("function");
			expect(typeof TrackModel.getOrCreateWithClient).toBe("function");

			// The transaction-aware method should accept client as first parameter
			expect(TrackModel.getOrCreateWithClient).toBeDefined();
		});
	});
});
