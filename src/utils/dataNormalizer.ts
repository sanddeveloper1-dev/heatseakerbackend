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
 * Data normalization utilities for race data processing
 */

/**
 * Convert MM-DD-YY format to YYYY-MM-DD
 */
export function convertDateFormat(dateStr: string): string {
	if (!dateStr || typeof dateStr !== 'string') {
		throw new Error('Invalid date string');
	}

	// Handle MM-DD-YY format
	const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
	if (match) {
		const [, month, day, year] = match;
		// Use current year as reference for century determination
		const currentYear = new Date().getFullYear();
		const currentCentury = Math.floor(currentYear / 100) * 100;
		const yearNum = parseInt(year);

		// Determine century: if year is within 10 years of current year, use current century
		// Otherwise, assume it's the previous century
		const fullYear = yearNum >= (currentYear % 100 - 10) ?
			currentCentury + yearNum :
			currentCentury - 100 + yearNum;

		return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	// Handle YYYY-MM-DD format (already correct)
	const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
	if (isoMatch) {
		return dateStr;
	}

	throw new Error(`Unsupported date format: ${dateStr}`);
}

/**
 * Generate standardized race ID from track, date, and race number
 */
export function generateRaceId(trackCode: string, date: string, raceNumber: string): string {
	const normalizedDate = convertDateFormat(date);
	const datePart = normalizedDate.replace(/-/g, '');
	const raceNum = raceNumber.padStart(2, '0');

	return `${trackCode}_${datePart}_${raceNum}`;
}

/**
 * Normalize numeric value by removing currency symbols and commas
 */
export function normalizeNumeric(value: any): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'number') {
		return value;
	}

	if (typeof value === 'string') {
		// Remove currency symbols, commas, and whitespace
		const cleaned = value.replace(/[$,\s]/g, '');

		// Check for invalid values
		if (['SC', 'N/A', '#VALUE!', '#DIV/0!', 'FALSE', ''].includes(cleaned.toUpperCase())) {
			return null;
		}

		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? null : parsed;
	}

	return null;
}

/**
 * Validate horse number
 */
export function validateHorseNumber(horseNumber: any): number | null {
	const num = normalizeNumeric(horseNumber);
	if (num === null) return null;

	// Horse numbers should be between 1 and 16
	return (num >= 1 && num <= 16) ? Math.floor(num) : null;
}

/**
 * Validate race number (must be 1-15)
 */
export function validateRaceNumber(raceNumber: any): number | null {
	const num = normalizeNumeric(raceNumber);
	if (num === null) return null;

	// Race numbers should be between 1 and 15
	return (num >= 1 && num <= 15) ? Math.floor(num) : null;
}

/**
 * Normalize percentage string (keep as string, just clean it)
 */
export function normalizePercentage(value: any): string | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'string') {
		const cleaned = value.trim();
		// Check if it looks like a percentage
		if (cleaned.includes('%') || /^\d+\.?\d*%?$/.test(cleaned)) {
			return cleaned;
		}
	}

	return null;
}

/**
 * Normalize currency string (keep as string, just clean it)
 */
export function normalizeCurrency(value: any): string | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'string') {
		const cleaned = value.trim();
		// Check if it looks like currency
		if (cleaned.includes('$') || /^\$?\d+\.?\d*$/.test(cleaned)) {
			return cleaned;
		}
	}

	return null;
}

/**
 * Normalize p3 field (can be 'FALSE' or numeric)
 */
export function normalizeP3(value: any): string | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'string') {
		const cleaned = value.trim().toUpperCase();
		// Handle 'FALSE' as a valid value
		if (cleaned === 'FALSE') {
			return 'FALSE';
		}
		// Check if it's a valid number
		if (/^\d+\.?\d*$/.test(cleaned)) {
			return cleaned;
		}
	}

	if (typeof value === 'number') {
		return value.toString();
	}

	return null;
}

/**
 * Normalize string field (trim whitespace, convert empty strings to null)
 */
export function normalizeString(value: any): string | null {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed === '' ? null : trimmed;
	}

	if (typeof value === 'number') {
		return value.toString();
	}

	return null;
}

/**
 * Validate and filter race entries
 */
export function validateRaceEntry(entry: any): boolean {
	// Must have a valid horse number
	const horseNumber = validateHorseNumber(entry.horse_number);
	if (horseNumber === null) {
		return false;
	}

	// Must have at least some valid data (not all null)
	const hasValidData = [
		entry.double, entry.constant, entry.p3, entry.correct_p3, entry.ml,
		entry.live_odds, entry.sharp_percent, entry.action,
		entry.double_delta, entry.p3_delta, entry.x_figure,
		entry.will_pay_2, entry.will_pay, entry.will_pay_1_p3, entry.win_pool,
		entry.purse, entry.race_type, entry.age
	].some(value => value !== null && value !== undefined && value !== '');

	return hasValidData;
}

/**
 * Clean and normalize a race entry object
 */
export function normalizeRaceEntry(entry: any, raceId: string, sourceFile?: string): any {
	const normalized = {
		race_id: raceId,
		horse_number: validateHorseNumber(entry.horse_number),
		double: normalizeNumeric(entry.double),
		constant: normalizeNumeric(entry.constant),
		p3: normalizeP3(entry.p3),  // Use new p3 normalizer
		correct_p3: normalizeNumeric(entry.correct_p3),  // New field
		ml: normalizeNumeric(entry.ml),
		live_odds: normalizeNumeric(entry.live_odds),
		sharp_percent: normalizePercentage(entry.sharp_percent),
		action: normalizeNumeric(entry.action),
		double_delta: normalizeNumeric(entry.double_delta),
		p3_delta: normalizeNumeric(entry.p3_delta),
		x_figure: normalizeNumeric(entry.x_figure),
		will_pay_2: normalizeCurrency(entry.will_pay_2),
		will_pay: normalizeCurrency(entry.will_pay),  // New field
		will_pay_1_p3: normalizeCurrency(entry.will_pay_1_p3),
		win_pool: normalizeCurrency(entry.win_pool),
		veto_rating: normalizeString(entry.veto_rating),
		purse: normalizeString(entry.purse),
		race_type: normalizeString(entry.race_type),
		age: normalizeString(entry.age),
		raw_data: normalizeString(entry.raw_data),
		source_file: sourceFile ? normalizeString(sourceFile) : null
	};

	// Ensure these fields are always present (even if null) for database insertion
	// This prevents them from being dropped during object serialization
	if (!('purse' in normalized)) normalized.purse = null;
	if (!('race_type' in normalized)) normalized.race_type = null;
	if (!('age' in normalized)) normalized.age = null;

	return normalized;
} 