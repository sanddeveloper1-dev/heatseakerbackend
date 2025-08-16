/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 [CLIENT_ORG_NAME]
 * Software Development & Maintenance by Alexander Meyer
 * 
 * ZERO LIABILITY NOTICE: Service provider assumes no liability for betting operations.
 * Client bears 100% responsibility for all business outcomes.
 * 
 * This software is provided "AS IS" without warranty.
 * For complete terms, see SERVICE_AGREEMENT.md
 * 
 * Bet CSV generator utility for XpressBet integration
 */

import * as XLSX from "xlsx";
import * as fs from "fs";

interface BetDetail {
  trackCode: string;
  raceNumber: number;
  horseNumber: number | string;
  exactaHorseNumbers?: string; // Supports multiple horses in Exacta
  betAmount: string;
  comboType?: string; // For Box, Key, or Wheel bets
  betType: string; // WIN, PLACE, EXACTA
}

export const eventBetDate = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const createBetCsv = (betDetailsArray: BetDetail[], betType: string): string => {
  if (!Array.isArray(betDetailsArray) || betDetailsArray.length === 0) {
    throw new Error("Bet details array is empty or invalid.");
  }

  const rows: any[][] = [];
  const eventDate = eventBetDate();

  betDetailsArray.forEach((betDetail) => {
    const row: any[] = [
      8668, // Account
      5556, // Pin
      eventDate,
      betDetail.trackCode,
      betDetail.raceNumber,
      betDetail.betType,
      betType === "EXACTA" ? betDetail.exactaHorseNumbers : betDetail.horseNumber, // Supports Exacta format
      betDetail.betAmount,
      betType === "EXACTA" ? betDetail.comboType || "WHEEL" : "WHEEL",
    ];
    rows.push(row);
  });

  const csvContent = rows.map(row => row.join(",")).join("\n");

  const fileName = `./bets-${betType}-${Date.now()}.csv`;

  fs.writeFileSync(fileName, csvContent, { encoding: "utf-8" });

  return fileName; // Return the CSV file path
};