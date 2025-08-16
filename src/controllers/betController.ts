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
 * Bet controller for handling betting operations and XpressBet integration
 */

import { Request, Response } from "express";
import { createBetCsv } from "../utils/betCsvGenerator";
import { placeBet } from "../services/xpressbetService";
import { betSchema } from "./betValidator";
import logger from "../config/logger";

export const handleBetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info("Received bet request", { body: req.body });

    const { bets, betType } = req.body;

    // Validate incoming data
    const { error } = betSchema.validate(req.body);
    if (error) {
      logger.warn("Validation failed", { error: error.details[0].message });
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    if (!Array.isArray(bets) || bets.length === 0 || !betType) {
      logger.warn("Invalid bet data received", { bets, betType });
      res.status(400).json({ success: false, message: "Invalid bet data or bet type." });
      return;
    }

    // Extract details for logging and file name generation
    const { trackCode, raceNumber } = bets[0]; // Assuming all bets are for the same track and race
    logger.info("Bet details extracted", {
      trackCode,
      raceNumber,
      betType,
      betCombination: bets[0].betCombination ?? "N/A" // Log the exacta combination if applicable
    });

    // Generate the CSV file for Xpressbet submission
    let filePath: string;
    try {
      filePath = createBetCsv(bets, betType);
      logger.info("Bet CSV file created", { filePath });
    } catch (error: any) {
      logger.error("Error generating bet file", { error: error.message });
      res.status(500).json({ success: false, message: `Error generating bet file: ${error.message}` });
      return;
    }

    // Submit the bet file to Xpressbet
    let result;
    try {
      result = await placeBet(trackCode, betType, raceNumber, filePath, bets);
      logger.info("Bet successfully placed", { trackCode, raceNumber, result });
    } catch (error: any) {
      logger.error("Error submitting bet file", { error: error.message });
      res.status(500).json({ success: false, message: `Error submitting bet file to Xpressbet: ${error.message}` });
      return;
    }

    // Successful response
    logger.info("Bet request processed successfully");
    res.status(200).json({ success: true, result });
  } catch (error: any) {
    logger.error("Unexpected error processing bet request", { error: error.message });
    res.status(500).json({ success: false, message: "An unexpected error occurred while processing the request." });
  }
};