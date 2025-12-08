import { Request, Response } from "express";
import {
	getDailyRaceEntries,
	getDailyRaceWinners
} from "../../controllers/raceController";
import {
	fetchDailyRaceEntries,
	fetchDailyRaceWinners
} from "../../services/raceDataFetchService";

jest.mock("../../services/raceDataFetchService", () => ({
	fetchDailyRaceEntries: jest.fn(),
	fetchDailyRaceWinners: jest.fn(),
}));

const createMockResponse = () => {
	const res = {} as Response & {
		status: jest.Mock;
		json: jest.Mock;
	};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
};

describe("raceController - getDailyRaceEntries", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it("returns 400 when date query parameter is missing", async () => {
		const req = { query: {} } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceEntries(req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(fetchDailyRaceEntries).not.toHaveBeenCalled();
	});

	it("returns daily entries when service resolves successfully", async () => {
		const mockEntries = [{ race_id: "SAR_20240101_01" }];
		(fetchDailyRaceEntries as jest.Mock).mockResolvedValue(mockEntries);

		const req = { query: { date: "2024-01-01" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceEntries(req, res);

		expect(fetchDailyRaceEntries).toHaveBeenCalledWith("2024-01-01", undefined);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: true,
			date: "2024-01-01",
			trackCode: null,
			count: mockEntries.length,
			entries: mockEntries,
		}));
	});

	it("returns 500 when service throws an error", async () => {
		(fetchDailyRaceEntries as jest.Mock).mockRejectedValue(new Error("boom"));

		const req = { query: { date: "2024-01-01" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceEntries(req, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: false,
			message: "Error fetching daily race entries",
		}));
	});

	it("filters entries by trackCode when provided", async () => {
		const mockEntries = [
			{ race_id: "SAR_20240101_01", track_code: "SAR" },
			{ race_id: "SAR_20240101_02", track_code: "SAR" }
		];
		(fetchDailyRaceEntries as jest.Mock).mockResolvedValue(mockEntries);

		const req = { query: { date: "2024-01-01", trackCode: "SAR" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceEntries(req, res);

		expect(fetchDailyRaceEntries).toHaveBeenCalledWith("2024-01-01", "SAR");
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: true,
			date: "2024-01-01",
			trackCode: "SAR",
			count: mockEntries.length,
			entries: mockEntries,
		}));
	});

	it("returns all entries when trackCode is not provided", async () => {
		const mockEntries = [
			{ race_id: "SAR_20240101_01", track_code: "SAR" },
			{ race_id: "AQU_20240101_01", track_code: "AQU" }
		];
		(fetchDailyRaceEntries as jest.Mock).mockResolvedValue(mockEntries);

		const req = { query: { date: "2024-01-01" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceEntries(req, res);

		expect(fetchDailyRaceEntries).toHaveBeenCalledWith("2024-01-01", undefined);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: true,
			date: "2024-01-01",
			trackCode: null,
			count: mockEntries.length,
			entries: mockEntries,
		}));
	});

	it("handles empty string trackCode gracefully", async () => {
		const mockEntries = [{ race_id: "SAR_20240101_01" }];
		(fetchDailyRaceEntries as jest.Mock).mockResolvedValue(mockEntries);

		const req = { query: { date: "2024-01-01", trackCode: "" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceEntries(req, res);

		// Current implementation passes empty string as-is
		expect(fetchDailyRaceEntries).toHaveBeenCalledWith("2024-01-01", "");
		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("handles non-string trackCode gracefully", async () => {
		const mockEntries = [{ race_id: "SAR_20240101_01" }];
		(fetchDailyRaceEntries as jest.Mock).mockResolvedValue(mockEntries);

		const req = { query: { date: "2024-01-01", trackCode: 123 } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceEntries(req, res);

		// Non-string values are treated as undefined
		expect(fetchDailyRaceEntries).toHaveBeenCalledWith("2024-01-01", undefined);
		expect(res.status).toHaveBeenCalledWith(200);
	});
});

describe("raceController - getDailyRaceWinners", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it("returns 400 when date query parameter is missing", async () => {
		const req = { query: {} } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceWinners(req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(fetchDailyRaceWinners).not.toHaveBeenCalled();
	});

	it("returns daily winners when service resolves successfully", async () => {
		const mockWinners = [{ race_id: "SAR_20240101_01", winning_horse_number: 3 }];
		(fetchDailyRaceWinners as jest.Mock).mockResolvedValue(mockWinners);

		const req = { query: { date: "2024-01-01" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceWinners(req, res);

		expect(fetchDailyRaceWinners).toHaveBeenCalledWith("2024-01-01", undefined);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: true,
			date: "2024-01-01",
			trackCode: null,
			count: mockWinners.length,
			winners: mockWinners,
		}));
	});

	it("returns 500 when service throws an error", async () => {
		(fetchDailyRaceWinners as jest.Mock).mockRejectedValue(new Error("boom"));

		const req = { query: { date: "2024-01-01" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceWinners(req, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: false,
			message: "Error fetching daily race winners",
		}));
	});

	it("filters winners by trackCode when provided", async () => {
		const mockWinners = [
			{ race_id: "SAR_20240101_01", track_code: "SAR", winning_horse_number: 3 },
			{ race_id: "SAR_20240101_02", track_code: "SAR", winning_horse_number: 5 }
		];
		(fetchDailyRaceWinners as jest.Mock).mockResolvedValue(mockWinners);

		const req = { query: { date: "2024-01-01", trackCode: "SAR" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceWinners(req, res);

		expect(fetchDailyRaceWinners).toHaveBeenCalledWith("2024-01-01", "SAR");
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: true,
			date: "2024-01-01",
			trackCode: "SAR",
			count: mockWinners.length,
			winners: mockWinners,
		}));
	});

	it("returns all winners when trackCode is not provided", async () => {
		const mockWinners = [
			{ race_id: "SAR_20240101_01", track_code: "SAR", winning_horse_number: 3 },
			{ race_id: "AQU_20240101_01", track_code: "AQU", winning_horse_number: 2 }
		];
		(fetchDailyRaceWinners as jest.Mock).mockResolvedValue(mockWinners);

		const req = { query: { date: "2024-01-01" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceWinners(req, res);

		expect(fetchDailyRaceWinners).toHaveBeenCalledWith("2024-01-01", undefined);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			success: true,
			date: "2024-01-01",
			trackCode: null,
			count: mockWinners.length,
			winners: mockWinners,
		}));
	});

	it("handles empty string trackCode gracefully", async () => {
		const mockWinners = [{ race_id: "SAR_20240101_01", winning_horse_number: 3 }];
		(fetchDailyRaceWinners as jest.Mock).mockResolvedValue(mockWinners);

		const req = { query: { date: "2024-01-01", trackCode: "" } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceWinners(req, res);

		// Current implementation passes empty string as-is
		expect(fetchDailyRaceWinners).toHaveBeenCalledWith("2024-01-01", "");
		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("handles non-string trackCode gracefully", async () => {
		const mockWinners = [{ race_id: "SAR_20240101_01", winning_horse_number: 3 }];
		(fetchDailyRaceWinners as jest.Mock).mockResolvedValue(mockWinners);

		const req = { query: { date: "2024-01-01", trackCode: 123 } } as unknown as Request;
		const res = createMockResponse();

		await getDailyRaceWinners(req, res);

		// Non-string values are treated as undefined
		expect(fetchDailyRaceWinners).toHaveBeenCalledWith("2024-01-01", undefined);
		expect(res.status).toHaveBeenCalledWith(200);
	});
});
