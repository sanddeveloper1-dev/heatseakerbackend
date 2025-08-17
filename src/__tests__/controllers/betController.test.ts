import { handleBetRequest } from "../../controllers/betController";
import { createBetCsv } from "../../utils/betCsvGenerator";
import { placeBet } from "../../services/xpressbetService";
import { Request, Response } from "express";

jest.mock("../../utils/betCsvGenerator");
jest.mock("../../services/xpressbetService");

describe("Bet Controller", () => {
  const mockRequest = (body: any): Request =>
    ({ body } as Request);
  const mockResponse = (): Response => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it("should return 400 if the request body is invalid", async () => {
    const req = mockRequest({ bets: [], betType: "" });
    const res = mockResponse();

    await handleBetRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: '"betType" is not allowed to be empty',
    });
  });

  it("should return 400 if the betType is invalid", async () => {
    const req = mockRequest({
      bets: [{ trackCode: "ABC", raceNumber: 1, horseNumber: 5, betAmount: `100.00`, betType: "INVALID_TYPE" }],
      betType: "bBet",
    });
    const res = mockResponse();

    await handleBetRequest(req, res);

    // The validation should fail on the individual bet's betType, not the top-level betType
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: '"bets[0].betType" must be one of [WIN, PLACE, SHOW, EXACTA]',
    });
  });

  it("should handle errors during Excel file generation", async () => {
    const bets = [
      { trackCode: "ABC", raceNumber: 1, horseNumber: 5, betAmount: `100.00`, betType: "WIN" },
    ];
    const req = mockRequest({ bets, betType: "bBet" });
    const res = mockResponse();

    (createBetCsv as jest.Mock).mockImplementation(() => {
      throw new Error("File generation error");
    });

    await handleBetRequest(req, res);

    expect(createBetCsv).toHaveBeenCalledWith(bets, "bBet");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Error generating bet file: File generation error",
    });
  });

  it("should generate an Excel file and place the bet", async () => {
    const bets = [
      { trackCode: "ABC", raceNumber: 1, horseNumber: 5, betAmount: `100.00`, betType: "WIN" },
    ];
    const req = mockRequest({ bets, betType: "bBet" });
    const res = mockResponse();

    (createBetCsv as jest.Mock).mockReturnValue("./bets-bBet-12345.xlsx");
    (placeBet as jest.Mock).mockResolvedValue({ success: true });

    await handleBetRequest(req, res);

    expect(createBetCsv).toHaveBeenCalledWith(bets, "bBet");
    expect(placeBet).toHaveBeenCalledWith(
      "ABC", // trackCode
      "bBet", // betType
      1, // raceNumber
      "./bets-bBet-12345.xlsx", // filePath
      bets // bets array
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      result: { success: true },
    });
  });

  it("should handle errors during bet submission", async () => {
    const bets = [
      { trackCode: "ABC", raceNumber: 1, horseNumber: 5, betAmount: `100.00`, betType: "WIN" },
    ];
    const req = mockRequest({ bets, betType: "bBet" });
    const res = mockResponse();

    (createBetCsv as jest.Mock).mockReturnValue("./bets-bBet-12345.xlsx");
    (placeBet as jest.Mock).mockRejectedValue(new Error("Xpressbet API error"));

    await handleBetRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Error submitting bet file to Xpressbet: Xpressbet API error",
    });
  });
});