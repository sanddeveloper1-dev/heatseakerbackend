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
 * Bet validation schema and validation logic
 */

import Joi from 'joi';

export const betSchema = Joi.object({
  bets: Joi.array().items(
    Joi.object({
      trackCode: Joi.string().required(),
      raceNumber: Joi.number().integer().positive().required(),
      betType: Joi.string().valid('WIN', 'PLACE', 'SHOW', 'EXACTA', /* other bet types */).required(),

      // ✅ **Preserve `horseNumber` for existing WIN/PLACE bets**
      horseNumber: Joi.when('betType', {
        is: 'EXACTA',
        then: Joi.forbidden(),  // Exacta uses `betCombination`
        otherwise: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
      }),

      // ✅ **Introduce `betCombination` for Exacta without breaking old bets**
      betCombination: Joi.when('betType', {
        is: 'EXACTA',
        then: Joi.string().pattern(/^(\d+(-\d+)+)$/).optional(), // Optional for backwards compatibility
        otherwise: Joi.forbidden(),
      }),

      // ✅ **Keep `betAmount`, alias `dollarAmount` for compatibility**
      betAmount: Joi.string().required(),  // 🔒 Existing field remains unchanged

      // ✅ **Make `comboType` optional for backward compatibility**
      comboType: Joi.when('betType', {
        is: 'EXACTA',
        then: Joi.string().valid('WHEEL', 'KEY', 'BOX', 'KEY-BOX', 'POWER-BOX').optional(),
        otherwise: Joi.forbidden(),
      }),
    })
  ).required(),
  betType: Joi.string().required(),
});