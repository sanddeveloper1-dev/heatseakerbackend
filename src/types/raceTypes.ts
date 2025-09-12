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
 * TypeScript interfaces for race data processing
 */

export interface RaceEntryData {
	horse_number: number | string;
	double?: number | string;
	constant?: number | string;
	p3?: string;  // Changed to string to handle 'FALSE' values
	correct_p3?: number | string;  // New field
	ml?: number | string;
	live_odds?: number | string;
	sharp_percent?: string;
	action?: number | string;
	double_delta?: number | string;
	p3_delta?: number | string;
	x_figure?: number | string;
	will_pay_2?: string;
	will_pay?: string;  // New field
	will_pay_1_p3?: string;
	win_pool?: string;
	veto_rating?: string;
	raw_data?: string;
}

export interface RaceData {
	race_id: string;
	track: string;
	date: string;
	race_number: string | number;
	post_time?: string;
	entries: RaceEntryData[];
}

export interface DailyRaceDataRequest {
	source: string;
	races: RaceData[];
	race_winners: { [raceId: string]: RaceWinnerData }; // Required race winners data
}

export interface ProcessingResult {
	success: boolean;
	message: string;
	statistics: ProcessingStatistics;
	processed_races: string[];
}

export interface ProcessingStatistics {
	races_processed: number;
	entries_processed: number;
	races_skipped: number;
	entries_skipped: number;
	errors: string[];
}

export interface RaceProcessingResult {
	success: boolean;
	raceId?: string;
	entriesProcessed?: number;
	error?: string;
}

export interface TransactionResult {
	successful: Array<{ raceId: string; entriesProcessed: number }>;
	failed: Array<{ raceId: string; error: string }>;
	totalEntries: number;
	errors: string[];
}

export interface RaceWinnerData {
	race_id: string;
	winning_horse_number: number;
	winning_payout_2_dollar?: number;
	winning_payout_1_p3?: number;
	extraction_method: 'simple_correct' | 'header' | 'summary' | 'cross_reference';
	extraction_confidence: 'high' | 'medium' | 'low';
}

export interface DatabaseClient {
	query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number }>;
	connect?: () => Promise<any>;
	release?: () => void;
}
