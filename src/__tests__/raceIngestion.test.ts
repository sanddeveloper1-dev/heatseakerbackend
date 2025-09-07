// Mock the database connection first - this must be before any imports
jest.mock("../config/database", () => ({
	default: {
		query: jest.fn(),
		connect: jest.fn(),
		end: jest.fn()
	},
	checkConnectionHealth: jest.fn().mockResolvedValue(true)
}));

// Mock the models
jest.mock("../models/Track", () => ({
	TrackModel: {
		findByCode: jest.fn(),
		create: jest.fn(),
		getOrCreate: jest.fn(),
		getOrCreateWithClient: jest.fn(),
		findAll: jest.fn()
	}
}));

jest.mock("../models/Race", () => ({
	RaceModel: {
		findById: jest.fn(),
		findByTrackDateRace: jest.fn(),
		findByTrackDateRaceWithClient: jest.fn(),
		create: jest.fn(),
		createWithClient: jest.fn(),
		update: jest.fn(),
		updateWithClient: jest.fn(),
		upsert: jest.fn(),
		upsertWithClient: jest.fn(),
		findByDateRange: jest.fn()
	}
}));

jest.mock("../models/RaceEntry", () => ({
	RaceEntryModel: {
		findByRaceId: jest.fn(),
		findByRaceAndHorse: jest.fn(),
		findByRaceAndHorseWithClient: jest.fn(),
		create: jest.fn(),
		createWithClient: jest.fn(),
		update: jest.fn(),
		updateWithClient: jest.fn(),
		upsert: jest.fn(),
		upsertWithClient: jest.fn(),
		batchUpsert: jest.fn(),
		batchUpsertWithClient: jest.fn(),
		deleteByRaceId: jest.fn()
	}
}));

// Now import the service after mocks are set up
import { validateDailyRaceData } from "../validators/raceValidator";
import { generateRaceId, convertDateFormat } from "../utils/dataNormalizer";
import { extractTrackCode, getStandardizedTrackName } from "../utils/trackMapper";

describe("Race Ingestion Tests", () => {
	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
	});

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
						entries: [
							{
								horse_number: 1,
								double: "23.4",
								constant: "58",
								p3: "37.85",
								correct_p3: "37.85",  // Added new field
								ml: 20.0,
								live_odds: 36.47,
								sharp_percent: "107.44%",
								action: "-0.17",
								double_delta: "-0.17",
								p3_delta: "-1.42",
								x_figure: "-1.59",
								will_pay_2: "$298.00",
								will_pay: "$149.00",  // Added new field
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
								correct_p3: "28.10",  // Added new field
								ml: 8.0,
								live_odds: 12.30,
								sharp_percent: "95.22%",
								action: "0.25",
								double_delta: "0.25",
								p3_delta: "1.80",
								x_figure: "2.05",
								will_pay_2: "$156.00",
								will_pay: "$78.00",  // Added new field
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
								correct_p3: "22.45",  // Added new field
								ml: 4.5,
								live_odds: 6.20,
								sharp_percent: "88.15%",
								action: "0.12",
								double_delta: "0.12",
								p3_delta: "0.95",
								x_figure: "1.07",
								will_pay_2: "$98.00",
								will_pay: "$49.00",  // Added new field
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
						race_number: "16", // Invalid: must be 1-15
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
			// With current year context, 50 is interpreted as 2050, not 1950
			expect(convertDateFormat("01-01-50")).toBe("2050-01-01");
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

		test("should handle edge cases in date conversion", () => {
			// Test single digit months and days
			expect(convertDateFormat("1-1-25")).toBe("2025-01-01");
			expect(convertDateFormat("12-1-24")).toBe("2024-12-01");
			expect(convertDateFormat("1-31-25")).toBe("2025-01-31");
		});

		test("should handle edge cases in race ID generation", () => {
			// Test single digit race numbers
			expect(generateRaceId("AQU", "04-27-25", "3")).toBe("AQU_20250427_03");
			expect(generateRaceId("BEL", "12-31-24", "15")).toBe("BEL_20241231_15");
			// Test double digit race numbers
			expect(generateRaceId("AQU", "04-27-25", "10")).toBe("AQU_20250427_10");
		});

		test("should handle edge cases in track code extraction", () => {
			// Test various track name formats
			expect(extractTrackCode("AQUEDUCT RACETRACK")).toBe("AQU");
			expect(extractTrackCode("BELMONT PARK")).toBe("BEL");
			expect(extractTrackCode("SARATOGA SPRINGS")).toBe("SAR");
		});
	});
}); 