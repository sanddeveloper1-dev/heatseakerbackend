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
 * Email service for sending daily reports via SMTP
 */

import nodemailer from "nodemailer";
import logger from "../config/logger";
import config from "../config/config";
import { DailyReportData } from "./dailyReportService";
import { generateHtmlReport } from "./dailyReportEmailTemplate";

// Cache validation result - config doesn't change at runtime
let emailConfigValidated = false;
let emailConfigValidationError: Error | null = null;

/**
 * Validate email configuration (cached after first validation)
 */
function validateEmailConfig(): void {
	// Return cached validation result if already validated
	if (emailConfigValidated) {
		if (emailConfigValidationError) {
			throw emailConfigValidationError;
		}
		return;
	}

	// Perform validation
	try {
		if (!config.email.smtpHost) {
			throw new Error("Email SMTP configuration is missing: SMTP_HOST is required");
		}
		if (!config.email.smtpPort) {
			throw new Error("Email SMTP configuration is missing: SMTP_PORT is required");
		}
		if (!config.email.smtpUser) {
			throw new Error("Email SMTP configuration is missing: SMTP_USER is required");
		}
		if (!config.email.smtpPassword) {
			throw new Error("Email SMTP configuration is missing: SMTP_PASSWORD is required");
		}
		if (!config.email.fromAddress) {
			throw new Error("Email SMTP configuration is missing: EMAIL_FROM is required");
		}
		if (!config.email.reportRecipient) {
			throw new Error("Email SMTP configuration is missing: REPORT_EMAIL_RECIPIENT is required");
		}

		// Validate port is a number
		if (isNaN(config.email.smtpPort) || config.email.smtpPort < 1 || config.email.smtpPort > 65535) {
			throw new Error(`Invalid SMTP_PORT: ${config.email.smtpPort}. Must be a number between 1 and 65535`);
		}

		// Validate email addresses format (basic check)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(config.email.fromAddress)) {
			throw new Error(`Invalid EMAIL_FROM format: ${config.email.fromAddress}`);
		}
		if (!emailRegex.test(config.email.reportRecipient)) {
			throw new Error(`Invalid REPORT_EMAIL_RECIPIENT format: ${config.email.reportRecipient}`);
		}

		// Cache successful validation
		emailConfigValidated = true;
	} catch (error: any) {
		// Cache validation error
		emailConfigValidated = true;
		emailConfigValidationError = error instanceof Error ? error : new Error(String(error));
		throw error;
	}
}

/**
 * Create nodemailer transporter from config
 */
function createTransporter() {
	// Validate configuration before creating transporter (cached after first call)
	validateEmailConfig();

	const transporterConfig: any = {
		host: config.email.smtpHost,
		port: config.email.smtpPort,
		secure: config.email.smtpPort === 465, // true for 465, false for other ports
		auth: {
			user: config.email.smtpUser,
			pass: config.email.smtpPassword,
		},
	};

	// Add TLS options if needed
	if (config.email.smtpSecure === false) {
		transporterConfig.tls = {
			rejectUnauthorized: false,
		};
	}

	return nodemailer.createTransport(transporterConfig);
}

/**
 * Send daily report email
 */
export async function sendDailyReportEmail(reportData: DailyReportData): Promise<void> {
	try {
		if (!config.email.enabled) {
			logger.info("Email is disabled, skipping daily report email");
			return;
		}

		const transporter = createTransporter();
		const htmlContent = generateHtmlReport(reportData);

		const mailOptions = {
			from: config.email.fromAddress,
			to: config.email.reportRecipient,
			subject: `HeatSeaker Daily Report - ${reportData.report_date}`,
			html: htmlContent,
		};

		const info = await transporter.sendMail(mailOptions);
		logger.info("Daily report email sent successfully", {
			messageId: info.messageId,
			recipient: config.email.reportRecipient,
		});
	} catch (error: any) {
		logger.error("Failed to send daily report email", {
			error: error.message,
			stack: error instanceof Error ? error.stack : undefined,
			reportDate: reportData.report_date,
			recipient: config.email.reportRecipient,
		});
		throw error;
	}
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
	try {
		const transporter = createTransporter();
		await transporter.verify();
		logger.info("Email configuration verified successfully");
		return true;
	} catch (error: any) {
		logger.error("Email configuration test failed", {
			error: error.message,
			stack: error instanceof Error ? error.stack : undefined,
			smtpHost: config.email.smtpHost,
			smtpPort: config.email.smtpPort,
		});
		return false;
	}
}

