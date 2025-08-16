/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 [CLIENT_ORG_NAME]
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

/**
	•	Middleware to validate API Key in request headers
*/
const apiKeyAuth = (req: Request, res: Response, next: NextFunction): any => {
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