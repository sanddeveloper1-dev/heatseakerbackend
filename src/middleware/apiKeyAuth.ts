/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 Paul Stortini
 * Software Development & Maintenance by Alexander Meyer
 * 
 * ZERO LIABILITY NOTICE: Service provider assumes no liability for betting operations.
 * Client bears 100% responsibility for all business outcomes.
 * 
 * This software is provided "ASIS" without warranty.
 * For complete terms, see SERVICE_AGREEMENT.md
 * 
 * API key authentication middleware for secure endpoint access
 */

import { Request, Response, NextFunction } from "express";
import config from "../config/config";
import logger from "../config/logger";

/**
	•	Middleware to validate API Key in request headers
*/
const apiKeyAuth = (req: Request, res: Response, next: NextFunction): any => {
	// Check if API key is configured
	if (!config.apiKey) {
		logger.error("API key not configured - system is not secure");
		return res.status(500).json({
			error: "System configuration error - contact administrator"
		});
	}

	const providedApiKey: string | undefined = req.header(`x-api-key`);

	if (!providedApiKey) {
		return res.status(403).json({ error: `Forbidden: No API key provided` });
	}

	if (providedApiKey !== config.apiKey) {
		return res.status(403).json({ error: `Forbidden: Invalid API key` });
	}

	next();
};

export default apiKeyAuth;