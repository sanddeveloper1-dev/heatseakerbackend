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
 * Track code to name mapping for standardization
 */
export const TRACK_MAPPING: Record<string, string> = {
	'AQU': 'AQUEDUCT', 'AQD': 'AQUEDUCT',
	'BEL': 'BELMONT',
	'CD': 'CHURCHILL',
	'GP': 'GULFSTREAM', 'GPW': 'GULFSTREAM',
	'SAR': 'SARATOGA',
	'DMR': 'DELMAR', 'DMF': 'DELMAR',
	'CNL': 'COLONIAL DOWNS',
	'MTH': 'MONMOUTH',
	'ELP': 'ELLIS PARK',
	'DEL': 'DELAWARE PARK',
	'PRX': 'PARX',
	'WO': 'WOODBINE',
	'KEE': 'KEENELAND',
	'SA': 'SANTA ANITA',
	'LA': 'LOS ALAMITOS',
	'LRL': 'LAUREL',
	'PIM': 'PIMLICO',
	'KD': 'KENTUCKY DOWNS',
	'CBY': 'CANTERBURY PARK',
	'GG': 'GOLDEN GATE',
	'PEN': 'PENN NATIONAL',
	'BAC': 'BEYER AVERAGES',
	'TAM': 'TAMPA BAY',
	'OP': 'OAKLAWN',
	'WOH': 'WOODBINE HARNESS',
	'PLAY': 'PLAYGROUND'
};

/**
 * Extract track code from track name or race ID
 */
export function extractTrackCode(trackName: string): string {
	// Remove common suffixes and clean up
	const cleaned = trackName
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.trim();

	// Try to find exact match first
	for (const [code, name] of Object.entries(TRACK_MAPPING)) {
		if (name === cleaned) {
			return code;
		}
	}

	// Try to extract code from race ID format (e.g., "AQUEDUCT 04-27-25 Race 3")
	const words = cleaned.split(' ');
	if (words.length > 0) {
		const firstWord = words[0];

		// Check if it's already a known code
		if (TRACK_MAPPING[firstWord]) {
			return firstWord;
		}

		// Try to find a code that matches the first word
		for (const [code, name] of Object.entries(TRACK_MAPPING)) {
			if (name === firstWord) {
				return code;
			}
		}
	}

	// If no match found, return the first word as a fallback
	return words[0] || 'UNKNOWN';
}

/**
 * Get standardized track name from track code or name
 */
export function getStandardizedTrackName(trackInput: string): string {
	const code = extractTrackCode(trackInput);
	return TRACK_MAPPING[code] || trackInput.toUpperCase();
}

/**
 * Generate track code from track name
 */
export function generateTrackCode(trackName: string): string {
	const standardized = getStandardizedTrackName(trackName);

	// Find the code for this standardized name
	for (const [code, name] of Object.entries(TRACK_MAPPING)) {
		if (name === standardized) {
			return code;
		}
	}

	// If not found, generate a code from the first 3 letters
	return standardized.substring(0, 3).toUpperCase();
} 