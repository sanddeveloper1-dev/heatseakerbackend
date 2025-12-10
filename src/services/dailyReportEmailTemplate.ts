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
 * HTML email template generator for daily reports
 */

import { DailyReportData } from "./dailyReportService";

/**
 * Generate HTML email template for daily report
 */
export function generateHtmlReport(data: DailyReportData): string {
	const tracksSection = data.tracks_ingested.length > 0
		? generateTracksSection(data.tracks_ingested)
		: '<p><em>No tracks were ingested on this date.</em></p>';

	const spreadsheetSection = data.spreadsheet_calls.length > 0
		? generateSpreadsheetSection(data.spreadsheet_calls)
		: '<p><em>No spreadsheet API calls were made on this date.</em></p>';

	const errorSection = generateErrorSection(data.error_summary);

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>HeatSeaker Daily Report - ${data.report_date}</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 900px;
			margin: 0 auto;
			padding: 20px;
			background-color: #f5f5f5;
		}
		.container {
			background-color: #ffffff;
			border-radius: 8px;
			padding: 30px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		.header {
			border-bottom: 3px solid #4a90e2;
			padding-bottom: 20px;
			margin-bottom: 30px;
		}
		.header h1 {
			margin: 0;
			color: #2c3e50;
			font-size: 28px;
		}
		.header .date {
			color: #7f8c8d;
			font-size: 16px;
			margin-top: 5px;
		}
		.section {
			margin-bottom: 40px;
		}
		.section h2 {
			color: #2c3e50;
			font-size: 22px;
			border-bottom: 2px solid #ecf0f1;
			padding-bottom: 10px;
			margin-bottom: 20px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 15px;
		}
		table th {
			background-color: #4a90e2;
			color: white;
			padding: 12px;
			text-align: left;
			font-weight: 600;
		}
		table td {
			padding: 10px 12px;
			border-bottom: 1px solid #ecf0f1;
		}
		table tr:hover {
			background-color: #f8f9fa;
		}
		.stat-number {
			font-weight: 600;
			color: #2c3e50;
		}
		.spreadsheet-link {
			color: #4a90e2;
			text-decoration: none;
			word-break: break-all;
		}
		.spreadsheet-link:hover {
			text-decoration: underline;
		}
		.error-highlight {
			background-color: #fff3cd;
			padding: 15px;
			border-left: 4px solid #ffc107;
			margin-top: 15px;
		}
		.error-count {
			font-size: 24px;
			font-weight: bold;
			color: #dc3545;
		}
		.most-common-error {
			background-color: #f8d7da;
			padding: 12px;
			border-radius: 4px;
			margin-top: 10px;
		}
		.most-common-error strong {
			color: #721c24;
		}
		.no-data {
			color: #7f8c8d;
			font-style: italic;
		}
		.summary-stats {
			display: flex;
			gap: 20px;
			margin-bottom: 20px;
			flex-wrap: wrap;
		}
		.summary-stat {
			background-color: #f8f9fa;
			padding: 15px;
			border-radius: 6px;
			flex: 1;
			min-width: 150px;
		}
		.summary-stat-label {
			font-size: 12px;
			color: #7f8c8d;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.summary-stat-value {
			font-size: 24px;
			font-weight: bold;
			color: #2c3e50;
			margin-top: 5px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>HeatSeaker Daily Report</h1>
			<div class="date">Report Date: ${formatDate(data.report_date)}</div>
		</div>

		<div class="section">
			<h2>📊 Summary Statistics</h2>
			<div class="summary-stats">
				<div class="summary-stat">
					<div class="summary-stat-label">Tracks Ingested</div>
					<div class="summary-stat-value">${data.tracks_ingested.length}</div>
				</div>
				<div class="summary-stat">
					<div class="summary-stat-label">Total Races Added</div>
					<div class="summary-stat-value">${data.tracks_ingested.reduce((sum, t) => sum + t.races_added, 0)}</div>
				</div>
				<div class="summary-stat">
					<div class="summary-stat-label">Total Entries Added</div>
					<div class="summary-stat-value">${data.tracks_ingested.reduce((sum, t) => sum + t.entries_added, 0)}</div>
				</div>
				<div class="summary-stat">
					<div class="summary-stat-label">Total Winners Added</div>
					<div class="summary-stat-value">${data.tracks_ingested.reduce((sum, t) => sum + t.winners_added, 0)}</div>
				</div>
				<div class="summary-stat">
					<div class="summary-stat-label">Spreadsheet Calls</div>
					<div class="summary-stat-value">${data.spreadsheet_calls.length}</div>
				</div>
				<div class="summary-stat">
					<div class="summary-stat-label">Total Errors</div>
					<div class="summary-stat-value">${data.error_summary.total_errors}</div>
				</div>
			</div>
		</div>

		<div class="section">
			<h2>🏇 Tracks Ingested</h2>
			${tracksSection}
		</div>

		<div class="section">
			<h2>📊 Spreadsheet API Calls</h2>
			${spreadsheetSection}
		</div>

		<div class="section">
			<h2>⚠️ Error Summary</h2>
			${errorSection}
		</div>
	</div>
</body>
</html>
	`.trim();
}

function generateTracksSection(tracks: any[]): string {
	return `
		<table>
			<thead>
				<tr>
					<th>Track Code</th>
					<th>Track Name</th>
					<th>Races Run</th>
					<th>Races Added</th>
					<th>Entries Added</th>
					<th>Winners Added</th>
				</tr>
			</thead>
			<tbody>
				${tracks.map(track => `
					<tr>
						<td><strong>${track.track_code}</strong></td>
						<td>${track.track_name}</td>
						<td class="stat-number">${track.races_run}</td>
						<td class="stat-number">${track.races_added}</td>
						<td class="stat-number">${track.entries_added}</td>
						<td class="stat-number">${track.winners_added}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	`;
}

function generateSpreadsheetSection(calls: any[]): string {
	return `
		<table>
			<thead>
				<tr>
					<th>Spreadsheet URL</th>
					<th>Track</th>
					<th>Endpoint</th>
					<th>Calls</th>
					<th>First Call</th>
					<th>Last Call</th>
				</tr>
			</thead>
			<tbody>
				${calls.map(call => `
					<tr>
						<td><a href="${call.spreadsheet_url}" class="spreadsheet-link" target="_blank">${truncateUrl(call.spreadsheet_url, 50)}</a></td>
						<td>${call.track_code || 'N/A'}</td>
						<td><code>${call.endpoint}</code></td>
						<td class="stat-number">${call.call_count}</td>
						<td>${formatDateTime(call.first_call)}</td>
						<td>${formatDateTime(call.last_call)}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	`;
}

function generateErrorSection(errorSummary: any): string {
	if (errorSummary.total_errors === 0) {
		return '<p class="no-data">✅ No errors occurred on this date.</p>';
	}

	const mostCommonSection = errorSummary.most_common_error
		? `
			<div class="most-common-error">
				<strong>Most Common Error:</strong><br>
				${escapeHtml(errorSummary.most_common_error.message)}<br>
				<small>Occurred ${errorSummary.most_common_error.count} time(s)</small>
			</div>
		`
		: '';

	const breakdownSection = errorSummary.error_breakdown.length > 0
		? `
			<h3 style="margin-top: 20px; font-size: 18px;">Error Breakdown (Top 10)</h3>
			<table>
				<thead>
					<tr>
						<th>Error Message</th>
						<th>Count</th>
					</tr>
				</thead>
				<tbody>
					${errorSummary.error_breakdown.map((error: any) => `
						<tr>
							<td>${escapeHtml(error.message)}</td>
							<td class="stat-number">${error.count}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`
		: '';

	return `
		<div class="error-highlight">
			<div class="error-count">${errorSummary.total_errors} Total Errors</div>
			<div style="margin-top: 5px; color: #7f8c8d;">${errorSummary.unique_errors} Unique Error Types</div>
		</div>
		${mostCommonSection}
		${breakdownSection}
	`;
}

function formatDate(dateString: string): string {
	const date = new Date(dateString + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

function formatDateTime(date: Date): string {
	return new Date(date).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short',
	});
}

function truncateUrl(url: string, maxLength: number): string {
	if (url.length <= maxLength) return url;
	return url.substring(0, maxLength - 3) + '...';
}

function escapeHtml(text: string): string {
	const div = { innerHTML: text } as any;
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
