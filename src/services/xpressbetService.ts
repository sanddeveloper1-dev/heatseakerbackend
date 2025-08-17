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
 * XpressBet integration service for betting operations
 */

import axios from "axios";
import * as cheerio from "cheerio"
import * as fs from "fs";
import FormData from "form-data";
import logger from "../config/logger";

/**
 * Handles the submission of the Excel file to the Xpressbet API.
 */
export const submitBet = async (filePath: string, betType: string, bets: any[]): Promise<any> => {
  let response;

  try {
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }

    logger.info(`Found file, preparing for submission: ${filePath}`);

    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();
    formData.append("proc", "wagr");
    formData.append("wagr", fileBuffer, { filename: "betfile.csv", contentType: "text/csv" });

    if (betType === "EXACTA") {
      formData.append("betCombination", bets[0].betCombination);
      formData.append("comboType", bets[0].comboType);
    }

    logger.info("Submitting bet file to Xpressbet API...");

    response = await axios.post(
      "https://dfu.xb-online.com/wagerupload/betupload.aspx",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: "text",
      }
    );

    logger.info(`Xpressbet API response received: ${response.status}`);

    if (response.data.includes("<html")) {
      const $ = cheerio.load(response.data);
      const errorMessages: string[] = [];
      $("#inva div").each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 0) {
          errorMessages.push(text);
        }
      });

      if (errorMessages.length > 0) {
        logger.error(`Xpressbet Validation Errors:\n${errorMessages.join("\n")}`);
      } else {
        logger.info("No validation errors found in the response.");
      }
    }

    return response.data;
  } catch (error: any) {
    logger.error(`Error uploading file: ${error.message}`, {
      filePath,
      response: error.response?.data || "No response received",
    });
    throw new Error(`Bet submission failed: ${error.response?.data || error.message}`);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted after submission: ${filePath}`);
    }
  }
};

/**
 * Generate a unique file name based on date, track, bet type, and race number.
 */
export const generateFileName = (track: string, betType: string, raceNumber: number): string => {
  const date = new Date();
  const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  return `${track}-${betType}-Bet-Race-${raceNumber}-${formattedDate}.csv`;
};

/**
 * High-level function to represent the placement of a bet.
 */
export const placeBet = async (track: string, betType: string, raceNumber: number, filePath: string, bets: any[]): Promise<any> => {
  const fileName = generateFileName(track, betType, raceNumber);
  logger.info(`Generated file name: ${fileName} for track ${track}, race ${raceNumber}, bet type ${betType}`);

  try {
    const response = await submitBet(filePath, betType, bets);
    logger.info(`Bet successfully placed: ${fileName}`);
    return response;
  } catch (error: any) {
    logger.error(`Error placing bet: ${error.message}`);
    throw error;
  }
};