import * as fs from "fs";
import * as XLSX from "xlsx";
import { createBetCsv, eventBetDate } from "../../utils/betCsvGenerator";

describe("betCsvGenerator", () => {
  const mockBets = [
    { trackCode: "ABC", raceNumber: 1, horseNumber: "5", betAmount: `100.00`, betType: "WIN" },
    { trackCode: "DEF", raceNumber: 2, horseNumber: "3", betAmount: `50.00`, betType: "PLACE" },
    { trackCode: "XYZ", raceNumber: 3, betCombination: "7-8", betAmount: `30.00`, betType: "EXACTA" },
  ];

  describe("eventBetDate", () => {
    it("should return the date in YYYY-MM-DD format", () => {
      const date = new Date();
      const expectedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      expect(eventBetDate()).toBe(expectedDate);
    });
  });

  describe("createBetCsv", () => {
    it("should generate a valid Excel file with the correct file name", () => {
      const filePath = createBetCsv(mockBets, "bBet");

      // Ensure the file exists
      expect(fs.existsSync(filePath)).toBe(true);

      // Clean up after the test
      fs.unlinkSync(filePath);
    });

    it("should include correct data rows in the CSV file", () => {
      const filePath = createBetCsv(mockBets, "cBet");

      // Read the generated CSV file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      // Validate the first row (no headers, just data)
      const firstRow = lines[0].split(',');
      expect(firstRow[0]).toBe('8668'); // Account
      expect(firstRow[1]).toBe('5556'); // SubAccount
      expect(firstRow[2]).toBe(eventBetDate()); // Date
      expect(firstRow[3]).toBe('ABC'); // Track Code
      expect(firstRow[4]).toBe('1'); // Race Number
      expect(firstRow[5]).toBe('WIN'); // Bet Type
      expect(firstRow[6]).toBe('5'); // Horse(s)
      expect(firstRow[7]).toBe('100.00'); // Bet Amount
      expect(firstRow[8]).toBe('WHEEL'); // Wheel

      // Clean up after the test
      fs.unlinkSync(filePath);
    });

    it("should generate a file with a unique name", () => {
      const filePath1 = createBetCsv(mockBets, "dBet");
      const filePath2 = createBetCsv(mockBets, "eBet");

      expect(filePath1).not.toEqual(filePath2);

      // Clean up after the test
      fs.unlinkSync(filePath1);
      fs.unlinkSync(filePath2);
    });

    it("should throw an error if the input is invalid", () => {
      expect(() => createBetCsv([], "fBet")).toThrowError("Bet details array is empty or invalid.");
      expect(() => createBetCsv(null as any, "gBet")).toThrowError("Bet details array is empty or invalid.");
    });
  });
});