import request from "supertest";
import express, { Request, Response } from "express";
import { createBetCsv } from "../../utils/betCsvGenerator";
import { placeBet } from "../../services/xpressbetService";

jest.mock("../../utils/betCsvGenerator");
jest.mock("../../services/xpressbetService");

// Create a mock app for testing
const app = express();
app.use(express.json());

// Mock the bet submission endpoint
app.post("/api/submit-bets", async (req: Request, res: Response): Promise<void> => {
  try {
    const { bets, betType } = req.body;

    if (!Array.isArray(bets) || bets.length === 0 || !betType) {
      res.status(400).json({ success: false, message: "Invalid bet data or bet type." });
      return;
    }

    // Mock successful bet processing
    const filePath = createBetCsv(bets, betType);
    const result = await placeBet(bets[0].trackCode, betType, bets[0].raceNumber, filePath, bets);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

describe("Bet Routes", () => {
  const mockBets = {
    bets: [
      { trackCode: "ABC", raceNumber: 1, horseNumber: 5, betAmount: `100.00`, betType: "WIN" },
    ],
    betType: "bBet",
  };

  it("should return 200 for valid bet submission", async () => {
    (createBetCsv as jest.Mock).mockReturnValue("./bets-bBet-12345.xlsx");
    (placeBet as jest.Mock).mockResolvedValue({ success: true });

    const response = await request(app)
      .post("/api/submit-bets")
      .send(mockBets);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should return 400 for invalid data", async () => {
    const response = await request(app)
      .post("/api/submit-bets")
      .send({ bets: [], betType: "" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});