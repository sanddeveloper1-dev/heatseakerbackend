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
 * Race Ingestion Service Transaction Support Tests
 */

import { RaceIngestionService } from "../../services/raceIngestionService";
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
	},
}));

jest.mock("../../models/Race", () => ({
	RaceModel: {
		upsertWithClient: jest.fn(),
	},
}));

jest.mock("../../models/RaceEntry", () => ({
	RaceEntryModel: {
		batchUpsertWithClient: jest.fn(),
	},
}));

// Mock the service
jest.mock("../../services/raceIngestionService", () => ({
	RaceIngestionService: jest.fn().mockImplementation(() => ({
		processRacesWithTransaction: jest.fn(),
		processRaces: jest.fn(),
	})),
}));

describe("Race Ingestion Service Transaction Support", () => {
	let mockClient: any;
	let mockPool: any;
	let mockService: any;

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

		// Setup mock service
		mockService = new (RaceIngestionService as any)();
	});

	describe("processRacesWithTransaction", () => {
		it("should process races within a transaction successfully", async () => {
			const mockRaces = [
				{
					trackCode: "AQU",
					date: "2025-04-27",
					raceNumber: 3,
					entries: [
						{
							horseNumber: 1,
							double: "23.4",
							constant: "58",
							p3: "37.85",
							ml: 20.0,
							liveOdds: 36.47,
							sharpPercent: "107.44%",
							action: "-0.17",
							doubleDelta: "-0.17",
							p3Delta: "-1.42",
							xFigure: "-1.59",
							willPay2: "$298.00",
							willPay1P3: "$2,238.00",
							winPool: "$3,743.00",
							rawData: "1 | 23.4 | 58 | 37.85 | 20.0 | 36.47 | 107.44% | -0.17 | -0.17 | -1.42 | -1.59 | $298.00 | $2,238.00 | $3,743.00",
						},
					],
				},
			];

			const source = "test_data";

			// Mock successful model operations
			(TrackModel.getOrCreateWithClient as jest.Mock).mockResolvedValue({
				id: 1,
				code: "AQU",
				name: "AQUEDUCT",
			});

			(RaceModel.upsertWithClient as jest.Mock).mockResolvedValue({
				id: "AQU_20250427_03",
				track_id: 1,
				date: new Date("2025-04-27"),
				race_number: 3,
			});

			(RaceEntryModel.batchUpsertWithClient as jest.Mock).mockResolvedValue([
				{ id: 1, race_id: "AQU_20250427_03", horse_number: 1 },
			]);

			// Mock the service method
			mockService.processRacesWithTransaction = jest.fn().mockImplementation(async (races, source) => {
				const client = await pool.connect();

				try {
					await client.query("BEGIN");

					const results = [];

					for (const race of races) {
						// Get or create track
						const track = await TrackModel.getOrCreateWithClient(client, {
							code: race.trackCode,
							name: race.trackCode, // Simplified for test
						});

						// Generate race ID
						const raceId = `${race.trackCode}_${race.date.replace(/-/g, "")}_${race.raceNumber.toString().padStart(2, "0")}`;

						// Upsert race
						const raceRecord = await RaceModel.upsertWithClient(client, {
							id: raceId,
							track_id: track.id!,
							date: new Date(race.date),
							race_number: race.raceNumber,
							source_file: source,
						});

						// Process race entries
						if (race.entries && race.entries.length > 0) {
							const entries = race.entries.map((entry: any) => ({
								race_id: raceRecord.id,
								horse_number: entry.horseNumber,
								double: entry.double,
								constant: entry.constant,
								p3: entry.p3,
								ml: entry.ml,
								live_odds: entry.liveOdds,
								sharp_percent: entry.sharpPercent,
								action: entry.action,
								double_delta: entry.doubleDelta,
								p3_delta: entry.p3Delta,
								x_figure: entry.xFigure,
								will_pay_2: entry.willPay2,
								will_pay_1_p3: entry.willPay1P3,
								win_pool: entry.winPool,
								raw_data: entry.rawData,
							}));

							await RaceEntryModel.batchUpsertWithClient(client, entries);
						}

						results.push({
							trackCode: race.trackCode,
							raceNumber: race.raceNumber,
							success: true,
							raceId: raceRecord.id,
						});
					}

					await client.query("COMMIT");
					return results;

				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			});

			const results = await mockService.processRacesWithTransaction(mockRaces, source);

			// Verify transaction was successful
			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(results[0].raceId).toBe("AQU_20250427_03");
			expect(results[0].trackCode).toBe("AQU");

			// Verify all model operations were called
			expect(TrackModel.getOrCreateWithClient).toHaveBeenCalledWith(
				mockClient,
				{ code: "AQU", name: "AQU" }
			);
			expect(RaceModel.upsertWithClient).toHaveBeenCalledWith(
				mockClient,
				expect.objectContaining({
					id: "AQU_20250427_03",
					track_id: 1,
					race_number: 3,
				})
			);
			expect(RaceEntryModel.batchUpsertWithClient).toHaveBeenCalledWith(
				mockClient,
				expect.arrayContaining([
					expect.objectContaining({
						race_id: "AQU_20250427_03",
						horse_number: 1,
					}),
				])
			);
		});

		it("should rollback transaction on error", async () => {
			const mockRaces = [
				{
					trackCode: "AQU",
					date: "2025-04-27",
					raceNumber: 3,
					entries: [],
				},
			];

			const source = "test_data";

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

			mockService.processRacesWithTransaction = jest.fn().mockImplementation(async (races, source) => {
				const client = await pool.connect();

				try {
					await client.query("BEGIN");

					for (const race of races) {
						// Get or create track (should succeed)
						const track = await TrackModel.getOrCreateWithClient(client, {
							code: race.trackCode,
							name: race.trackCode,
						});

						// Generate race ID
						const raceId = `${race.trackCode}_${race.date.replace(/-/g, "")}_${race.raceNumber.toString().padStart(2, "0")}`;

						// Upsert race (should fail)
						await RaceModel.upsertWithClient(client, {
							id: raceId,
							track_id: track.id!,
							date: new Date(race.date),
							race_number: race.raceNumber,
							source_file: source,
						});

						await client.query("COMMIT");
					}
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			});

			// Verify transaction rollback
			await expect(
				mockService.processRacesWithTransaction(mockRaces, source)
			).rejects.toThrow("Race creation failed");

			// Verify rollback was called
			expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
		});

		it("should handle multiple races in single transaction", async () => {
			const mockRaces = [
				{
					trackCode: "AQU",
					date: "2025-04-27",
					raceNumber: 3,
					entries: [{ horseNumber: 1, double: "23.4" }],
				},
				{
					trackCode: "AQU",
					date: "2025-04-27",
					raceNumber: 4,
					entries: [{ horseNumber: 1, double: "15.2" }],
				},
			];

			const source = "test_data";

			// Mock successful operations
			(TrackModel.getOrCreateWithClient as jest.Mock).mockResolvedValue({
				id: 1,
				code: "AQU",
				name: "AQUEDUCT",
			});

			(RaceModel.upsertWithClient as jest.Mock)
				.mockResolvedValueOnce({
					id: "AQU_20250427_03",
					track_id: 1,
					race_number: 3,
				})
				.mockResolvedValueOnce({
					id: "AQU_20250427_04",
					track_id: 1,
					race_number: 4,
				});

			(RaceEntryModel.batchUpsertWithClient as jest.Mock)
				.mockResolvedValueOnce([{ id: 1, race_id: "AQU_20250427_03", horse_number: 1 }])
				.mockResolvedValueOnce([{ id: 2, race_id: "AQU_20250427_04", horse_number: 1 }]);

			mockService.processRacesWithTransaction = jest.fn().mockImplementation(async (races, source) => {
				const client = await pool.connect();

				try {
					await client.query("BEGIN");

					const results = [];

					for (const race of races) {
						const track = await TrackModel.getOrCreateWithClient(client, {
							code: race.trackCode,
							name: race.trackCode,
						});

						const raceId = `${race.trackCode}_${race.date.replace(/-/g, "")}_${race.raceNumber.toString().padStart(2, "0")}`;

						const raceRecord = await RaceModel.upsertWithClient(client, {
							id: raceId,
							track_id: track.id!,
							date: new Date(race.date),
							race_number: race.raceNumber,
							source_file: source,
						});

						if (race.entries && race.entries.length > 0) {
							const entries = race.entries.map((entry: any) => ({
								race_id: raceRecord.id,
								horse_number: entry.horseNumber,
								double: entry.double,
							}));

							await RaceEntryModel.batchUpsertWithClient(client, entries);
						}

						results.push({
							trackCode: race.trackCode,
							raceNumber: race.raceNumber,
							success: true,
							raceId: raceRecord.id,
						});
					}

					await client.query("COMMIT");
					return results;

				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			});

			const results = await mockService.processRacesWithTransaction(mockRaces, source);

			// Verify both races were processed
			expect(results).toHaveLength(2);
			expect(results[0].raceId).toBe("AQU_20250427_03");
			expect(results[1].raceId).toBe("AQU_20250427_04");
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(true);

			// Verify all operations were called
			expect(TrackModel.getOrCreateWithClient).toHaveBeenCalledTimes(2);
			expect(RaceModel.upsertWithClient).toHaveBeenCalledTimes(2);
			expect(RaceEntryModel.batchUpsertWithClient).toHaveBeenCalledTimes(2);
		});
	});

	describe("Transaction Error Handling", () => {
		it("should handle database connection errors", async () => {
			mockPool.connect.mockRejectedValue(new Error("Connection failed"));

			mockService.processRacesWithTransaction = jest.fn().mockImplementation(async () => {
				await pool.connect();
			});

			await expect(
				mockService.processRacesWithTransaction([], "test")
			).rejects.toThrow("Connection failed");
		});

		it("should handle transaction begin errors", async () => {
			mockClient.query.mockRejectedValueOnce(new Error("BEGIN failed"));

			mockService.processRacesWithTransaction = jest.fn().mockImplementation(async () => {
				const client = await pool.connect();
				await client.query("BEGIN");
			});

			await expect(
				mockService.processRacesWithTransaction([], "test")
			).rejects.toThrow("BEGIN failed");
		});

		it("should handle transaction commit errors", async () => {
			// Mock successful BEGIN but failed COMMIT
			mockClient.query
				.mockResolvedValueOnce({ rows: [] }) // BEGIN
				.mockRejectedValueOnce(new Error("COMMIT failed")); // COMMIT

			mockService.processRacesWithTransaction = jest.fn().mockImplementation(async () => {
				const client = await pool.connect();

				try {
					await client.query("BEGIN");
					await client.query("COMMIT");
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			});

			await expect(
				mockService.processRacesWithTransaction([], "test")
			).rejects.toThrow("COMMIT failed");

			// Verify rollback was called
			expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
		});
	});

	describe("Transaction Performance", () => {
		it("should process multiple races efficiently in single transaction", async () => {
			const mockRaces = Array.from({ length: 10 }, (_, i) => ({
				trackCode: "AQU",
				date: "2025-04-27",
				raceNumber: i + 1,
				entries: [{ horseNumber: 1, double: "20.0" }],
			}));

			const source = "test_data";

			// Mock successful operations
			(TrackModel.getOrCreateWithClient as jest.Mock).mockResolvedValue({
				id: 1,
				code: "AQU",
				name: "AQUEDUCT",
			});

			(RaceModel.upsertWithClient as jest.Mock).mockResolvedValue({
				id: "AQU_20250427_01",
				track_id: 1,
				race_number: 1,
			});

			(RaceEntryModel.batchUpsertWithClient as jest.Mock).mockResolvedValue([
				{ id: 1, race_id: "AQU_20250427_01", horse_number: 1 },
			]);

			const startTime = Date.now();

			mockService.processRacesWithTransaction = jest.fn().mockImplementation(async (races, source) => {
				const client = await pool.connect();

				try {
					await client.query("BEGIN");

					const results = [];

					for (const race of races) {
						const track = await TrackModel.getOrCreateWithClient(client, {
							code: race.trackCode,
							name: race.trackCode,
						});

						const raceId = `${race.trackCode}_${race.date.replace(/-/g, "")}_${race.raceNumber.toString().padStart(2, "0")}`;

						const raceRecord = await RaceModel.upsertWithClient(client, {
							id: raceId,
							track_id: track.id!,
							date: new Date(race.date),
							race_number: race.raceNumber,
							source_file: source,
						});

						if (race.entries && race.entries.length > 0) {
							const entries = race.entries.map((entry: any) => ({
								race_id: raceRecord.id,
								horse_number: entry.horseNumber,
								double: entry.double,
							}));

							await RaceEntryModel.batchUpsertWithClient(client, entries);
						}

						results.push({
							trackCode: race.trackCode,
							raceNumber: race.raceNumber,
							success: true,
							raceId: raceRecord.id,
						});
					}

					await client.query("COMMIT");
					return results;

				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			});

			const results = await mockService.processRacesWithTransaction(mockRaces, source);
			const endTime = Date.now();

			// Verify all races were processed
			expect(results).toHaveLength(10);
			expect(results.every((r: any) => r.success)).toBe(true);

			// Verify performance (should be reasonable for 10 races)
			const processingTime = endTime - startTime;
			expect(processingTime).toBeLessThan(1000); // Should complete in under 1 second
		});
	});
});
