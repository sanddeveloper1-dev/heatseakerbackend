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
 * Scheduled job for daily report generation and email delivery
 */

import { schedule as cronSchedule } from "node-cron";
import logger from "../config/logger";
import { generateDailyReport } from "./dailyReportService";
import { sendDailyReportEmail } from "./emailService";

/**
 * Run the daily report job
 */
async function runDailyReport(): Promise<void> {
	try {
		logger.info("Starting daily report generation");

		const reportData = await generateDailyReport();
		logger.info("Daily report generated successfully", {
			tracksCount: reportData.tracks_ingested.length,
			spreadsheetCallsCount: reportData.spreadsheet_calls.length,
			totalErrors: reportData.error_summary.total_errors,
		});

		await sendDailyReportEmail(reportData);
		logger.info("Daily report email sent successfully");
	} catch (error: any) {
		logger.error("Daily report job failed", { error: error.message });
		// Don't throw - we want the job to continue running even if one report fails
	}
}

/**
 * Schedule daily report job to run at 9am Mountain Time
 * Mountain Time is UTC-7 (or UTC-6 during DST)
 * 9am MTN = 16:00 UTC (during standard time) or 15:00 UTC (during daylight time)
 * We'll use 16:00 UTC (4pm UTC) which covers most of the year
 * Cron format: minute hour day month day-of-week
 * "0 16 * * *" = 4pm UTC daily = 9am MTN (standard time) or 10am MTN (daylight time)
 * 
 * Note: This doesn't account for DST changes automatically. For exact 9am MTN year-round,
 * you may want to adjust the schedule twice a year or use a timezone-aware scheduler.
 */
export function scheduleDailyReport() {
	// Schedule for 4pm UTC (9am MTN standard time, 10am MTN daylight time)
	const cronExpression = "0 16 * * *"; // 4pm UTC daily

	logger.info("Scheduling daily report job", {
		cronExpression,
		description: "Runs daily at 9am Mountain Time (approximately)",
	});

	const task = cronSchedule(cronExpression, runDailyReport, {
		timezone: "UTC",
	});

	logger.info("Daily report job scheduled successfully");

	return task;
}

/**
 * Manually trigger daily report (for testing)
 */
export async function triggerDailyReport(): Promise<void> {
	logger.info("Manually triggering daily report");
	await runDailyReport();
}

