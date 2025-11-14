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
 * Service for retrieving daily race data directly from PostgreSQL.
 */

import pool from "../config/database";
import logger from "../config/logger";

const toNumber = (value: unknown): number | null => {
	if (value === null || value === undefined) {
		return null;
	}

	const num = Number(value);
	return Number.isFinite(num) ? num : null;
};

const toNumeric = (value: unknown): number | null => {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value === "string") {
		const cleaned = value.replace(/[$,\s]/g, "");
		if (cleaned === "" || cleaned.toUpperCase() === "FALSE") {
			return null;
		}
		const parsed = Number(cleaned);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
};

export interface DailyRaceEntryRecord {
	race_id: string;
	race_date: string;
	race_number: number;
	track_code: string;
	track_name: string;
	horse_number: number;
	double?: number | null;
	constant?: number | null;
	p3?: string | null;
	correct_p3?: number | null;
	ml?: number | null;
	live_odds?: number | null;
	sharp_percent?: string | null;
	action?: number | null;
	double_delta?: number | null;
	p3_delta?: number | null;
	x_figure?: number | null;
	will_pay_2?: number | null;
	will_pay?: number | null;
	will_pay_1_p3?: number | null;
	win_pool?: number | null;
	veto_rating?: number | null;
	raw_data?: string | null;
	source_file?: string | null;
}

export interface DailyRaceWinnerRecord {
	race_id: string;
	race_date: string;
	race_number: number;
	track_code: string;
	track_name: string;
	winning_horse_number: number;
	winning_payout_2_dollar?: number | null;
	winning_payout_1_p3?: number | null;
	extraction_method?: string | null;
	extraction_confidence?: string | null;
}

export const fetchDailyRaceEntries = async (date: string): Promise<DailyRaceEntryRecord[]> => {
	logger.info("Fetching daily race entries from database", { date });

	const sql = `
		SELECT
			r.id AS race_id,
			r.date AS race_date,
			r.race_number,
			t.code AS track_code,
			t.name AS track_name,
			re.horse_number,
			re.double,
			re.constant,
			re.p3,
			re.correct_p3,
			re.ml,
			re.live_odds,
			re.sharp_percent,
			re.action,
			re.double_delta,
			re.p3_delta,
			re.x_figure,
			re.will_pay_2,
			re.will_pay,
			re.will_pay_1_p3,
			re.win_pool,
			re.veto_rating,
			re.raw_data,
			re.source_file
		FROM race_entries re
		JOIN races r ON re.race_id = r.id
		JOIN tracks t ON r.track_id = t.id
		WHERE r.date = $1
		ORDER BY t.code, r.race_number, re.horse_number;
	`;

	const result = await pool.query<DailyRaceEntryRecord>(sql, [date]);

	return result.rows.map(row => ({
		...row,
		double: toNumber(row.double),
		constant: toNumber(row.constant),
		correct_p3: toNumber(row.correct_p3),
		ml: toNumber(row.ml),
		live_odds: toNumber(row.live_odds),
		action: toNumber(row.action),
		double_delta: toNumber(row.double_delta),
		p3_delta: toNumber(row.p3_delta),
		x_figure: toNumber(row.x_figure),
		will_pay_2: toNumeric(row.will_pay_2),
		will_pay: toNumeric(row.will_pay),
		will_pay_1_p3: toNumeric(row.will_pay_1_p3),
		win_pool: toNumeric(row.win_pool),
		veto_rating: toNumeric(row.veto_rating),
		horse_number: toNumber(row.horse_number) ?? row.horse_number,
	}));
};

export const fetchDailyRaceWinners = async (date: string): Promise<DailyRaceWinnerRecord[]> => {
	logger.info("Fetching daily race winners from database", { date });

	const sql = `
		SELECT
			rw.race_id,
			r.date AS race_date,
			r.race_number,
			t.code AS track_code,
			t.name AS track_name,
			rw.winning_horse_number,
			rw.winning_payout_2_dollar,
			rw.winning_payout_1_p3,
			rw.extraction_method,
			rw.extraction_confidence
		FROM race_winners rw
		JOIN races r ON rw.race_id = r.id
		JOIN tracks t ON r.track_id = t.id
		WHERE r.date = $1
		ORDER BY t.code, r.race_number;
	`;

	const result = await pool.query<DailyRaceWinnerRecord>(sql, [date]);

	return result.rows.map(row => ({
		...row,
		race_number: toNumber(row.race_number) ?? row.race_number,
		winning_horse_number: toNumber(row.winning_horse_number) ?? row.winning_horse_number,
		winning_payout_2_dollar: toNumber(row.winning_payout_2_dollar),
		winning_payout_1_p3: toNumber(row.winning_payout_1_p3),
	}));
};
