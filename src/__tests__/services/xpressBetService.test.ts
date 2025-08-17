import axios from "axios";
import * as fs from "fs";
import { submitBet, generateFileName, placeBet } from "../../services/xpressbetService";
import FormData from "form-data";
import logger from "../../config/logger";

jest.mock("axios");
jest.mock("../../config/logger");

describe("Xpressbet Service", () => {
  const mockFilePath = "./test-bets.xlsx";
  const mockTrack = "TestTrack";
  const mockBetType = "bBet";
  const mockRaceNumber = 5;
  const mockBets = [
    { trackCode: "TEST", raceNumber: 5, horseNumber: "5", betAmount: "10.00", betType: "WIN" },
    { trackCode: "TEST", raceNumber: 5, betCombination: "5-7", betAmount: "15.00", betType: "EXACTA" }
  ];

  beforeEach(() => {
    fs.writeFileSync(mockFilePath, "dummy data");
  });

  afterEach(() => {
    if (fs.existsSync(mockFilePath)) {
      fs.unlinkSync(mockFilePath);
    }
    jest.clearAllMocks();
  });

  describe("generateFileName", () => {
    it("should generate a valid file name based on track, betType, and raceNumber", () => {
      const fileName = generateFileName(mockTrack, mockBetType, mockRaceNumber);
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      expect(fileName).toBe(`${mockTrack}-${mockBetType}-Bet-Race-${mockRaceNumber}-${formattedDate}.csv`);
    });
  });

  describe("submitBet", () => {
    it("should call the Xpressbet API with the correct file", async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: "<html><body>Success</body></html>",
        status: 200
      });

      const result = await submitBet(mockFilePath, "WIN", mockBets);

      expect(axios.post).toHaveBeenCalledWith(
        "https://dfu.xb-online.com/wagerupload/betupload.aspx",
        expect.any(FormData), // Match any FormData instance
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual("<html><body>Success</body></html>");
    });

    it("should delete the file after submission", async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: "<html><body>Success</body></html>",
        status: 200
      });

      await submitBet(mockFilePath, "WIN", []);

      expect(fs.existsSync(mockFilePath)).toBe(false);
    });

    it("should throw an error if the file does not exist", async () => {
      fs.unlinkSync(mockFilePath); // Remove the file

      await expect(submitBet(mockFilePath, "WIN", [])).rejects.toThrow(`File not found: ${mockFilePath}`);
    });

    it("should throw an error if the API call fails", async () => {
      (axios.post as jest.Mock).mockRejectedValue({
        response: { data: "API error" },
        message: "API error"
      });

      await expect(submitBet(mockFilePath, "WIN", [])).rejects.toThrow("Bet submission failed: API error");
    });

    it("should handle HTML response with validation errors", async () => {
      const htmlResponse = `
        <html>
          <body>
            <div id="inva">
              <div>Invalid bet amount</div>
              <div>Invalid horse number</div>
            </div>
          </body>
        </html>
      `;

      (axios.post as jest.Mock).mockResolvedValue({
        data: htmlResponse,
        status: 200
      });

      const result = await submitBet(mockFilePath, "WIN", mockBets);

      expect(result).toEqual(htmlResponse);
    });

    it("should handle HTML response without validation errors", async () => {
      const htmlResponse = `
        <html>
          <body>
            <div id="inva">
            </div>
          </body>
        </html>
      `;

      (axios.post as jest.Mock).mockResolvedValue({
        data: htmlResponse,
        status: 200
      });

      const result = await submitBet(mockFilePath, "WIN", mockBets);

      expect(result).toEqual(htmlResponse);
    });

    it("should handle non-HTML response", async () => {
      const stringResponse = "Bet accepted successfully";

      (axios.post as jest.Mock).mockResolvedValue({
        data: stringResponse,
        status: 200
      });

      const result = await submitBet(mockFilePath, "WIN", mockBets);

      expect(result).toEqual(stringResponse);
    });
  });

  describe("placeBet", () => {
    it("should generate the correct file name and call submitBet", async () => {
      const mockSubmitBet = jest.fn().mockResolvedValue({ success: true });
      jest.spyOn(require("../../services/xpressbetService"), "submitBet").mockImplementation(mockSubmitBet);

      const result = await placeBet(mockTrack, mockBetType, mockRaceNumber, mockFilePath, mockBets);

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      const expectedFileName = `${mockTrack}-${mockBetType}-Bet-Race-${mockRaceNumber}-${formattedDate}.csv`;

      expect(logger.info).toHaveBeenCalledWith(`Generated file name: ${expectedFileName} for track ${mockTrack}, race ${mockRaceNumber}, bet type ${mockBetType}`);
      expect(mockSubmitBet).toHaveBeenCalledWith(mockFilePath, mockBetType, mockBets);
      expect(result).toEqual({ success: true });
    });

    it("should handle errors from submitBet gracefully", async () => {
      const mockSubmitBet = jest.fn().mockRejectedValue(new Error("SubmitBet Error"));
      jest.spyOn(require("../../services/xpressbetService"), "submitBet").mockImplementation(mockSubmitBet);

      await expect(placeBet(mockTrack, mockBetType, mockRaceNumber, mockFilePath, [])).rejects.toThrow("SubmitBet Error");

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      const expectedFileName = `${mockTrack}-${mockBetType}-Bet-Race-${mockRaceNumber}-${formattedDate}.csv`;

      expect(logger.info).toHaveBeenCalledWith(`Generated file name: ${expectedFileName} for track ${mockTrack}, race ${mockRaceNumber}, bet type ${mockBetType}`);
    });
  });
});