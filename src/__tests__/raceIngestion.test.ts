import { RaceIngestionService } from "../services/raceIngestionService";
import { validateDailyRaceData } from "../validators/raceValidator";
import { generateRaceId, convertDateFormat } from "../utils/dataNormalizer";
import { extractTrackCode, getStandardizedTrackName } from "../utils/trackMapper";

// Mock the database models to prevent any real database calls
jest.mock("../models/Track", () => ({
	TrackModel: {
		findByCode: jest.fn(),
		create: jest.fn(),
		getOrCreate: jest.fn(),
		findAll: jest.fn()
	}
}));

jest.mock("../models/Race", () => ({
	RaceModel: {
		findById: jest.fn(),
		findByTrackDateRace: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		upsert: jest.fn(),
		findByDateRange: jest.fn()
	}
}));

jest.mock("../models/RaceEntry", () => ({
	RaceEntryModel: {
		findByRaceId: jest.fn(),
		findByRaceAndHorse: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		upsert: jest.fn(),
		batchUpsert: jest.fn(),
		deleteByRaceId: jest.fn()
	}
}));

// Mock the database connection
jest.mock("../config/database", () => ({
	default: {
		query: jest.fn(),
		connect: jest.fn(),
		end: jest.fn()
	}
}));

describe("Race Ingestion Tests", () => {
	describe("Data Validation", () => {
		test("should validate correct daily race data", () => {
			const validData = {
				source: "daily_race_data",
				races: [
					{
						race_id: "AQUEDUCT 04-27-25 Race 3",
						track: "AQUEDUCT",
						date: "04-27-25",
						race_number: "3",
						post_time: "2:16:00 PM",
						prev_race_1_winner_horse_number: 5,
						prev_race_1_winner_payout: 12.40,
						prev_race_2_winner_horse_number: 3,
						prev_race_2_winner_payout: 8.60,
						entries: [
							{
								horse_number: 1,
								double: "23.4",
								constant: "58",
								p3: "37.85",
								ml: 20.0,
								live_odds: 36.47,
								sharp_percent: "107.44%",
								action: "-0.17",
								double_delta: "-0.17",
								p3_delta: "-1.42",
								x_figure: "-1.59",
								will_pay_2: "$298.00",
								will_pay_1_p3: "$2,238.00",
								win_pool: "$3,743.00",
								veto_rating: null,
								raw_data: "1 | 23.4 | 58 | 37.85 | 20.0 | 36.47 | 107.44% | -0.17 | -0.17 | -1.42 | -1.59 | $298.00 | $2,238.00 | $3,743.00"
							},
							{
								horse_number: 2,
								double: "15.2",
								constant: "42",
								p3: "28.10",
								ml: 8.0,
								live_odds: 12.30,
								sharp_percent: "95.22%",
								action: "0.25",
								double_delta: "0.25",
								p3_delta: "1.80",
								x_figure: "2.05",
								will_pay_2: "$156.00",
								will_pay_1_p3: "$1,120.00",
								win_pool: "$2,890.00",
								veto_rating: null,
								raw_data: "2 | 15.2 | 42 | 28.10 | 8.0 | 12.30 | 95.22% | 0.25 | 0.25 | 1.80 | 2.05 | $156.00 | $1,120.00 | $2,890.00"
							},
							{
								horse_number: 3,
								double: "8.5",
								constant: "35",
								p3: "22.45",
								ml: 4.5,
								live_odds: 6.20,
								sharp_percent: "88.15%",
								action: "0.12",
								double_delta: "0.12",
								p3_delta: "0.95",
								x_figure: "1.07",
								will_pay_2: "$98.00",
								will_pay_1_p3: "$890.00",
								win_pool: "$1,567.00",
								veto_rating: null,
								raw_data: "3 | 8.5 | 35 | 22.45 | 4.5 | 6.20 | 88.15% | 0.12 | 0.12 | 0.95 | 1.07 | $98.00 | $890.00 | $1,567.00"
							}
						]
					}
				]
			};

			const result = validateDailyRaceData(validData);
			expect(result.error).toBeUndefined();
			expect(result.value).toBeDefined();
		});

		test("should reject invalid race number", () => {
			const invalidData = {
				source: "daily_race_data",
				races: [
					{
						race_id: "AQUEDUCT 04-27-25 Race 2",
						track: "AQUEDUCT",
						date: "04-27-25",
						race_number: "2", // Invalid: must be 3-15
						entries: [
							{
								horse_number: 1,
								double: "23.4",
								constant: "58",
								p3: "37.85",
								ml: 20.0,
								live_odds: 36.47,
								sharp_percent: "107.44%",
								action: "-0.17",
								double_delta: "-0.17",
								p3_delta: "-1.42",
								x_figure: "-1.59",
								will_pay_2: "$298.00",
								will_pay_1_p3: "$2,238.00",
								win_pool: "$3,743.00"
							}
						]
					}
				]
			};

			const result = validateDailyRaceData(invalidData);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("race_number");
		});
	});

	describe("Data Normalization", () => {
		test("should convert date format correctly", () => {
			expect(convertDateFormat("04-27-25")).toBe("2025-04-27");
			expect(convertDateFormat("12-31-24")).toBe("2024-12-31");
			expect(convertDateFormat("01-01-50")).toBe("1950-01-01");
		});

		test("should generate race ID correctly", () => {
			expect(generateRaceId("AQU", "04-27-25", "3")).toBe("AQU_20250427_03");
			expect(generateRaceId("BEL", "12-31-24", "15")).toBe("BEL_20241231_15");
		});

		test("should extract track code correctly", () => {
			expect(extractTrackCode("AQUEDUCT")).toBe("AQU");
			expect(extractTrackCode("BELMONT")).toBe("BEL");
			expect(extractTrackCode("AQUEDUCT 04-27-25 Race 3")).toBe("AQU");
		});

		test("should standardize track names", () => {
			expect(getStandardizedTrackName("AQUEDUCT")).toBe("AQUEDUCT");
			expect(getStandardizedTrackName("AQU")).toBe("AQUEDUCT");
			expect(getStandardizedTrackName("BEL")).toBe("BELMONT");
		});
	});

	describe("Race Ingestion Service", () => {
		test("should process valid race data with mocked database", async () => {
			const { TrackModel } = require("../models/Track");
			const { RaceModel } = require("../models/Race");
			const { RaceEntryModel } = require("../models/RaceEntry");

			// Mock the database responses
			TrackModel.getOrCreate.mockResolvedValue({ id: 1, code: "AQU", name: "AQUEDUCT" });
			RaceModel.upsert.mockResolvedValue({ id: "AQU_20250427_03", track_id: 1 });
			RaceEntryModel.batchUpsert.mockResolvedValue([
				{ id: 1, race_id: "AQU_20250427_03", horse_number: 1 },
				{ id: 2, race_id: "AQU_20250427_03", horse_number: 2 },
				{ id: 3, race_id: "AQU_20250427_03", horse_number: 3 }
			]);

			const validData = {
				source: "test_data",
				races: [
					{
						race_id: "AQUEDUCT 04-27-25 Race 3",
						track: "AQUEDUCT",
						date: "04-27-25",
						race_number: "3",
						entries: [
							{
								horse_number: 1,
								double: "23.4",
								constant: "58",
								p3: "37.85",
								ml: 20.0,
								live_odds: 36.47,
								sharp_percent: "107.44%",
								action: "-0.17",
								double_delta: "-0.17",
								p3_delta: "-1.42",
								x_figure: "-1.59",
								will_pay_2: "$298.00",
								will_pay_1_p3: "$2,238.00",
								win_pool: "$3,743.00"
							},
							{
								horse_number: 2,
								double: "15.2",
								constant: "42",
								p3: "28.10",
								ml: 8.0,
								live_odds: 12.30,
								sharp_percent: "95.22%",
								action: "0.25",
								double_delta: "0.25",
								p3_delta: "1.80",
								x_figure: "2.05",
								will_pay_2: "$156.00",
								will_pay_1_p3: "$1,120.00",
								win_pool: "$2,890.00"
							},
							{
								horse_number: 3,
								double: "8.5",
								constant: "35",
								p3: "22.45",
								ml: 4.5,
								live_odds: 6.20,
								sharp_percent: "88.15%",
								action: "0.12",
								double_delta: "0.12",
								p3_delta: "0.95",
								x_figure: "1.07",
								will_pay_2: "$98.00",
								will_pay_1_p3: "$890.00",
								win_pool: "$1,567.00"
							}
						]
					}
				]
			};

			// Test the service with mocked database
			const result = await RaceIngestionService.processDailyRaceData(validData);
			
			expect(result.success).toBe(true);
			expect(result.statistics.races_processed).toBe(1);
			expect(result.statistics.entries_processed).toBe(3);
			expect(result.processed_races).toContain("AQU_20250427_03");

			// Verify mocks were called
			expect(TrackModel.getOrCreate).toHaveBeenCalledWith({
				code: "AQU",
				name: "AQUEDUCT"
			});
			expect(RaceModel.upsert).toHaveBeenCalled();
			expect(RaceEntryModel.batchUpsert).toHaveBeenCalled();
		});
	});
}); 