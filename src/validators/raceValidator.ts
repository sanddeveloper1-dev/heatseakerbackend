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
 * Race data validation schemas and validation logic
 */

import Joi from "joi";

/**
 * Validation schema for race entry data
 */
export const raceEntrySchema = Joi.object({
	horse_number: Joi.alternatives().try(
		Joi.number().integer().min(1).max(16),
		Joi.string().pattern(/^\d+$/)
	).required(),
	double: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	constant: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	p3: Joi.string().allow('', null, 'FALSE'),
	correct_p3: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	ml: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	live_odds: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	sharp_percent: Joi.string().allow('', null),
	action: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	double_delta: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	p3_delta: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	x_figure: Joi.alternatives().try(
		Joi.number(),
		Joi.string().allow('', null)
	),
	will_pay_2: Joi.string().allow('', null),
	will_pay: Joi.string().allow('', null),
	will_pay_1_p3: Joi.string().allow('', null),
	win_pool: Joi.string().allow('', null),
	veto_rating: Joi.string().allow('', null),
	raw_data: Joi.string().allow('', null)
});

/**
 * Validation schema for individual race data
 */
export const raceSchema = Joi.object({
	race_id: Joi.string().required(),
	track: Joi.string().required(),
	date: Joi.string().pattern(/^\d{1,2}-\d{1,2}-\d{2}$/).required(),
	race_number: Joi.alternatives().try(
		Joi.number().integer().min(1).max(15),
		Joi.string().pattern(/^\d+$/).custom((value, helpers) => {
			const num = parseInt(value);
			if (num < 1 || num > 15) {
				return helpers.error('any.invalid');
			}
			return value;
		})
	).required(),
	post_time: Joi.string().allow('', null),
	entries: Joi.array().items(raceEntrySchema).min(1).required()
});

/**
 * Validation schema for the main API request
 */
export const dailyRaceDataSchema = Joi.object({
	source: Joi.string().required(),
	races: Joi.array().items(raceSchema).min(1).required()
});

/**
 * Custom validation function for the entire request
 */
export function validateDailyRaceData(data: any): { error?: string; value?: any } {
	const { error, value } = dailyRaceDataSchema.validate(data, {
		abortEarly: false,
		allowUnknown: false
	});

	if (error) {
		const errorMessages = error.details.map(detail => detail.message);
		return { error: errorMessages.join('; ') };
	}

	return { value };
}

/**
 * Validate individual race data
 */
export function validateRaceData(race: any): { error?: string; value?: any } {
	const { error, value } = raceSchema.validate(race, {
		abortEarly: false,
		allowUnknown: false
	});

	if (error) {
		const errorMessages = error.details.map(detail => detail.message);
		return { error: errorMessages.join('; ') };
	}

	return { value };
} 