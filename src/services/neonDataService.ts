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
 * Neon Data API helper utilities for executing read-only queries.
 */

import axios, { AxiosError } from "axios";
import config from "../config/config";
import logger from "../config/logger";

const DEFAULT_API_URL = "https://api.neon.tech/sql";

interface NeonQueryPayload {
	sql: string;
	parameters?: unknown[];
	database?: string;
	branch?: string;
}

interface NeonQueryResultRow {
	[key: string]: unknown;
}

interface NeonQueryResult {
	command: string;
	rowCount: number;
	rows?: NeonQueryResultRow[];
	fields?: Array<{ name: string }>;
}

interface NeonApiResponse {
	results?: NeonQueryResult[];
	error?: {
		code?: string;
		message: string;
	};
}

const getHeaders = () => {
	if (!config.neon.apiKey) {
		throw new Error("Neon API key (NEON_API_KEY) is not configured");
	}
	if (!config.neon.projectId) {
		throw new Error("Neon project id (NEON_PROJECT_ID) is not configured");
	}

	const headers: Record<string, string> = {
		Authorization: `Bearer ${config.neon.apiKey}`,
		Accept: "application/json",
		"Content-Type": "application/json",
		"x-neon-project-id": config.neon.projectId,
	};

	if (config.neon.branchId) {
		headers["x-neon-branch-id"] = config.neon.branchId;
	}

	if (config.neon.database) {
		headers["x-neon-database"] = config.neon.database;
	}

	return headers;
};

/**
 * Execute a SQL query against the Neon Data API.
 */
export const executeNeonQuery = async <T = NeonQueryResultRow>(sql: string, parameters: unknown[] = []): Promise<T[]> => {
	const apiUrl = config.neon.apiUrl || DEFAULT_API_URL;

	const payload: NeonQueryPayload = { sql };

	if (parameters.length > 0) {
		payload.parameters = parameters;
	}

	if (config.neon.database) {
		payload.database = config.neon.database;
	}

	if (config.neon.branchId) {
		payload.branch = config.neon.branchId;
	}

	try {
		const response = await axios.post<NeonApiResponse>(apiUrl, payload, {
			headers: getHeaders(),
		});

		if (response.data.error) {
			throw new Error(response.data.error.message);
		}

		const rows = response.data.results?.flatMap(result => result.rows ?? []) ?? [];
		return rows as T[];
	} catch (error) {
		if (error instanceof AxiosError) {
			const message = error.response?.data?.error?.message || error.message;
			logger.error("Neon Data API request failed", {
				message,
				status: error.response?.status,
				data: error.response?.data,
			});
			throw new Error(`Neon Data API error: ${message}`);
		}

		logger.error("Neon Data API unexpected error", { error: (error as Error).message });
		throw error;
	}
};
