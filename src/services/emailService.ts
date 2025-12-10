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

/**
 * Create nodemailer transporter from config
 */
function createTransporter() {
	if (!config.email.smtpHost || !config.email.smtpPort) {
		throw new Error("Email SMTP configuration is missing");
	}

	const transporterConfig: any = {
		host: config.email.smtpHost,
		port: config.email.smtpPort,
		secure: config.email.smtpPort === 465, // true for 465, false for other ports
		auth: config.email.smtpUser && config.email.smtpPassword ? {
			user: config.email.smtpUser,
			pass: config.email.smtpPassword,
		} : undefined,
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
		logger.error("Failed to send daily report email", { error: error.message });
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
		logger.error("Email configuration test failed", { error: error.message });
		return false;
	}
}

