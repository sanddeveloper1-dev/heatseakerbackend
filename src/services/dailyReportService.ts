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
 * Daily report service for generating data ingestion and retrieval reports
 */

import pool from "../config/database";
import logger from "../config/logger";
import { getLogsFromDatabase } from "./logStorageService";

export interface TrackStatistics {
	track_code: string;
	track_name: string;
	races_run: number;
	races_added: number;
	entries_added: number;
	winners_added: number;
}

export interface SpreadsheetApiCall {
	spreadsheet_url: string;
	track_code: string | null;
	endpoint: string;
	call_count: number;
	first_call: Date;
	last_call: Date;
}

export interface ErrorSummary {
	total_errors: number;
	unique_errors: number;
	most_common_error: {
		message: string;
		count: number;
	} | null;
	error_breakdown: Array<{
		message: string;
		count: number;
	}>;
}

export interface DailyReportData {
	report_date: string;
	tracks_ingested: TrackStatistics[];
	spreadsheet_calls: SpreadsheetApiCall[];
	error_summary: ErrorSummary;
}

/**
 * Get the previous day's date range in Mountain Time (midnight to midnight)
 * Uses a simpler approach: get current UTC date, subtract 1 day, then convert to MTN timezone
 */
function getPreviousDayMountainTime(): { startDate: Date; endDate: Date; dateString: string } {
	// Get current UTC date
	const now = new Date();

	// Get previous day in UTC
	const previousDayUTC = new Date(now);
	previousDayUTC.setUTCDate(previousDayUTC.getUTCDate() - 1);
	previousDayUTC.setUTCHours(0, 0, 0, 0);

	// Format date string (YYYY-MM-DD) - this represents the calendar date in MTN
	const dateString = previousDayUTC.toISOString().split('T')[0];

	// For database queries, we want to query by date (YYYY-MM-DD) which works regardless of timezone
	// The database stores dates in UTC, so we'll query for the date string directly
	// Start of day in UTC (which will be previous day in MTN)
	const startDate = new Date(previousDayUTC);

	// End of day in UTC (23:59:59.999)
	const endDate = new Date(previousDayUTC);
	endDate.setUTCHours(23, 59, 59, 999);

	return { startDate, endDate, dateString };
}

/**
 * Get track statistics for the previous day
 */
async function getTrackStatistics(dateString: string): Promise<TrackStatistics[]> {
	try {
		const query = `
			SELECT 
				t.code AS track_code,
				t.name AS track_name,
				COUNT(DISTINCT r.id) AS races_added,
				COUNT(DISTINCT re.id) AS entries_added,
				COUNT(DISTINCT rw.id) AS winners_added
			FROM tracks t
			LEFT JOIN races r ON r.track_id = t.id AND DATE(r.date) = $1
			LEFT JOIN race_entries re ON re.race_id = r.id
			LEFT JOIN race_winners rw ON rw.race_id = r.id
			WHERE r.id IS NOT NULL
			GROUP BY t.id, t.code, t.name
			ORDER BY t.name;
		`;

		const result = await pool.query(query, [dateString]);

		// Get total races run per track (count of distinct race numbers)
		const racesRunQuery = `
			SELECT 
				t.code AS track_code,
				COUNT(DISTINCT r.race_number) AS races_run
			FROM tracks t
			JOIN races r ON r.track_id = t.id
			WHERE DATE(r.date) = $1
			GROUP BY t.code;
		`;

		const racesRunResult = await pool.query(racesRunQuery, [dateString]);
		const racesRunMap = new Map<string, number>();
		racesRunResult.rows.forEach((row: any) => {
			racesRunMap.set(row.track_code, parseInt(row.races_run) || 0);
		});

		return result.rows.map((row: any) => ({
			track_code: row.track_code,
			track_name: row.track_name,
			races_run: racesRunMap.get(row.track_code) || 0,
			races_added: parseInt(row.races_added) || 0,
			entries_added: parseInt(row.entries_added) || 0,
			winners_added: parseInt(row.winners_added) || 0,
		}));
	} catch (error: any) {
		logger.error("Error getting track statistics", { error: error.message, dateString });
		throw error;
	}
}

/**
 * Get spreadsheet API calls from logs for the previous day
 */
async function getSpreadsheetApiCalls(startDate: Date, endDate: Date): Promise<SpreadsheetApiCall[]> {
	try {
		// Query logs for API calls with X-Source-Spreadsheet-URL header
		const query = `
			SELECT 
				timestamp,
				message,
				meta
			FROM logs
			WHERE timestamp >= $1 
				AND timestamp <= $2
				AND level IN ('info', 'warn')
				AND (message LIKE '%GET /api/%' OR message LIKE '%POST /api/%')
				AND meta::text LIKE '%X-Source-Spreadsheet-URL%'
			ORDER BY timestamp DESC;
		`;

		const result = await pool.query(query, [startDate.toISOString(), endDate.toISOString()]);

		// Parse logs and extract spreadsheet URLs
		const spreadsheetMap = new Map<string, {
			spreadsheet_url: string;
			track_code: string | null;
			endpoint: string;
			calls: Date[];
		}>();

		for (const row of result.rows) {
			try {
				const meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
				const spreadsheetUrl = meta?.['x-source-spreadsheet-url'] || meta?.['X-Source-Spreadsheet-URL'];

				if (spreadsheetUrl) {
					// Extract endpoint from message (e.g., "[abc123] GET /api/races 200 - 45ms")
					const endpointMatch = row.message.match(/(GET|POST)\s+(\/api\/[^\s]+)/);
					const endpoint = endpointMatch ? endpointMatch[2] : 'unknown';

					// Try to extract track code from endpoint or meta
					let trackCode: string | null = null;
					if (meta?.trackCode) {
						trackCode = meta.trackCode;
					} else if (endpoint.includes('/races/')) {
						// Could extract from query params if available
						const trackMatch = endpoint.match(/track[=:]([A-Z]+)/i);
						if (trackMatch) {
							trackCode = trackMatch[1].toUpperCase();
						}
					}

					const key = `${spreadsheetUrl}|${endpoint}`;
					if (!spreadsheetMap.has(key)) {
						spreadsheetMap.set(key, {
							spreadsheet_url: spreadsheetUrl,
							track_code: trackCode,
							endpoint,
							calls: [],
						});
					}

					spreadsheetMap.get(key)!.calls.push(new Date(row.timestamp));
				}
			} catch (parseError) {
				// Skip logs that can't be parsed
				continue;
			}
		}

		// Convert to final format
		return Array.from(spreadsheetMap.values()).map(item => ({
			spreadsheet_url: item.spreadsheet_url,
			track_code: item.track_code,
			endpoint: item.endpoint,
			call_count: item.calls.length,
			first_call: new Date(Math.min(...item.calls.map(d => d.getTime()))),
			last_call: new Date(Math.max(...item.calls.map(d => d.getTime()))),
		}));
	} catch (error: any) {
		logger.error("Error getting spreadsheet API calls", { error: error.message });
		throw error;
	}
}

/**
 * Get error summary for the previous day
 */
async function getErrorSummary(startDate: Date, endDate: Date): Promise<ErrorSummary> {
	try {
		const query = `
			SELECT 
				message,
				COUNT(*) as count
			FROM logs
			WHERE timestamp >= $1 
				AND timestamp <= $2
				AND level = 'error'
			GROUP BY message
			ORDER BY count DESC;
		`;

		const result = await pool.query(query, [startDate.toISOString(), endDate.toISOString()]);

		const totalErrors = result.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);
		const uniqueErrors = result.rows.length;

		const errorBreakdown = result.rows.map((row: any) => ({
			message: row.message,
			count: parseInt(row.count),
		}));

		const mostCommonError = errorBreakdown.length > 0 ? errorBreakdown[0] : null;

		return {
			total_errors: totalErrors,
			unique_errors: uniqueErrors,
			most_common_error: mostCommonError,
			error_breakdown: errorBreakdown.slice(0, 10), // Top 10 errors
		};
	} catch (error: any) {
		logger.error("Error getting error summary", { error: error.message });
		throw error;
	}
}

/**
 * Generate daily report data
 */
export async function generateDailyReport(): Promise<DailyReportData> {
	try {
		logger.info("Generating daily report");

		const { startDate, endDate, dateString } = getPreviousDayMountainTime();

		logger.info("Daily report date range", {
			dateString,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
		});

		// Get all data in parallel
		const [tracks, spreadsheetCalls, errorSummary] = await Promise.all([
			getTrackStatistics(dateString),
			getSpreadsheetApiCalls(startDate, endDate),
			getErrorSummary(startDate, endDate),
		]);

		return {
			report_date: dateString,
			tracks_ingested: tracks,
			spreadsheet_calls: spreadsheetCalls,
			error_summary: errorSummary,
		};
	} catch (error: any) {
		logger.error("Error generating daily report", { error: error.message });
		throw error;
	}
}

