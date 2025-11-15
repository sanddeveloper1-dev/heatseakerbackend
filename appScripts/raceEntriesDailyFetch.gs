/**
 * Daily Race Entry Sync for Google Sheets.
 *
 * Setup:
 * - Open Extensions → Apps Script in the `DATABASE` spreadsheet and paste this file into the editor.
 * - In Script Properties (Project Settings → Script properties), add:
 *   - `RACE_API_BASE_URL` (for example: https://example.com)
 *   - `RACE_API_KEY`
 * - (Optional) Adjust the `RACE_ENTRIES_SHEET_NAME` constant if your sheet tab name differs.
 *
 * How it works:
 * - By default, running `runDailyRaceEntrySync()` fetches entries for yesterday (spreadsheet time zone).
 * - To run for a specific date, pass an ISO date string (YYYY-MM-DD) to `runDailyRaceEntrySync('2025-01-31')`
 *   or use `promptForDailyRaceEntrySync()` for an interactive prompt.
 * - The script overwrites existing rows with the same `race_id` and `horse_number` so the sheet always
 *   reflects the latest entry data.
 *
 * Scheduling:
 * - In the Apps Script editor, open Triggers → Add Trigger.
 * - Select `runDailyRaceEntrySync`, choose Event Source `Time-driven`, set a daily schedule, and save.
 */

const RACE_ENTRIES_SHEET_NAME = 'race_entries';
const UNIQUE_KEY_COLUMNS = { raceId: 'race_id', horseNumber: 'horse_number' };

/**
 * Primary entry point for automated execution.
 *
 * @param {string} [dateOverride] Optional ISO date (YYYY-MM-DD) to fetch instead of the default (yesterday).
 */
function runDailyRaceEntrySync(dateOverride) {
  const config = getScriptConfig();
  const targetDate = determineTargetDate_(dateOverride);
  const entries = fetchRaceEntries_(config, targetDate);

  const sheet = getTargetSheet_();
  const header = getHeaderRow_(sheet);
  const headerIndex = buildHeaderIndex_(header);

  validateHeader_(headerIndex);

  const existingRowMap = buildExistingRowMap_(sheet, headerIndex);
  const appendBuffer = [];
  const appendIndexMap = {};

  let appendedCount = 0;
  let overwrittenCount = 0;
  let skippedCount = 0;

  entries.forEach(function (entry) {
    const key = buildCompositeKey_(entry, headerIndex);
    if (!key) {
      skippedCount++;
      return;
    }

    const rowValues = mapEntryToRow_(entry, header, headerIndex);

    if (existingRowMap.hasOwnProperty(key)) {
      sheet.getRange(existingRowMap[key], 1, 1, header.length).setValues([rowValues]);
      overwrittenCount++;
      return;
    }

    if (appendIndexMap.hasOwnProperty(key)) {
      appendBuffer[appendIndexMap[key]] = rowValues;
      overwrittenCount++;
      return;
    }

    appendIndexMap[key] = appendBuffer.length;
    appendBuffer.push(rowValues);
    appendedCount++;
  });

  if (appendBuffer.length > 0) {
    const startRow = Math.max(sheet.getLastRow(), 1) + 1;
    sheet.getRange(startRow, 1, appendBuffer.length, header.length).setValues(appendBuffer);
  }

  Logger.log(
    'Daily race entry sync complete for %s. Fetched: %s, Appended: %s, Overwritten: %s, Skipped: %s',
    targetDate,
    entries.length,
    appendedCount,
    overwrittenCount,
    skippedCount
  );
}

/**
 * Helper entry point that prompts for a custom date when run manually.
 */
function promptForDailyRaceEntrySync() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Daily Race Entry Sync',
    'Enter a date to fetch (YYYY-MM-DD), or leave blank to use yesterday:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    Logger.log('Daily race entry sync cancelled by user.');
    return;
  }

  const dateText = response.getResponseText().trim();
  runDailyRaceEntrySync(dateText || undefined);
}

/**
 * Derives configuration (base URL and API key) from script properties.
 * @return {{baseUrl: string, apiKey: string}}
 */
function getScriptConfig() {
  const props = PropertiesService.getScriptProperties();
  const baseUrl = (props.getProperty('RACE_API_BASE_URL') || '').trim();
  const apiKey = (props.getProperty('RACE_API_KEY') || '').trim();

  if (!baseUrl) {
    throw new Error('Missing script property "RACE_API_BASE_URL".');
  }
  if (!apiKey) {
    throw new Error('Missing script property "RACE_API_KEY".');
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey: apiKey };
}

/**
 * Determines the ISO date to fetch.
 * @param {string} [dateOverride]
 * @return {string}
 */
function determineTargetDate_(dateOverride) {
  if (dateOverride) {
    const sanitized = sanitizeDate_(dateOverride);
    if (!sanitized) {
      throw new Error('Invalid date override. Expected YYYY-MM-DD.');
    }
    return sanitized;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const timezone =
    (spreadsheet && spreadsheet.getSpreadsheetTimeZone()) || Session.getScriptTimeZone() || 'UTC';

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return Utilities.formatDate(yesterday, timezone, 'yyyy-MM-dd');
}

/**
 * Fetches race entries from the backend API.
 * @param {{baseUrl: string, apiKey: string}} config
 * @param {string} targetDate
 * @return {Array<Object>}
 */
function fetchRaceEntries_(config, targetDate) {
  const url = config.baseUrl + '/api/races/entries/daily?date=' + encodeURIComponent(targetDate);
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'x-api-key': config.apiKey,
      accept: 'application/json'
    }
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Race entry fetch failed (' + status + '): ' + response.getContentText());
  }

  const raw = response.getContentText();
  const data = JSON.parse(raw || '[]');

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && Array.isArray(data.entries)) {
    Logger.log(
      'Race entry API metadata: %s',
      JSON.stringify(
        {
          success: data.success,
          date: data.date || targetDate,
          count: data.count,
          entriesLength: data.entries.length
        }
      )
    );
    return data.entries;
  }

  throw new Error('Unexpected response format. Expected an array of race entries.');
}

/**
 * Returns the race entries sheet.
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getTargetSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('No active spreadsheet found.');
  }
  const sheet = spreadsheet.getSheetByName(RACE_ENTRIES_SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet "' + RACE_ENTRIES_SHEET_NAME + '" not found.');
  }
  return sheet;
}

/**
 * Extracts the header row values.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @return {Array<string>}
 */
function getHeaderRow_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    throw new Error('The race entries sheet is empty. Add a header row before running the script.');
  }
  const headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues();
  return headerValues[0].map(function (value) {
    return typeof value === 'string' ? value.trim() : value;
  });
}

/**
 * Builds a map of header names to column indices.
 * @param {Array<string>} header
 * @return {{[key: string]: number}}
 */
function buildHeaderIndex_(header) {
  return header.reduce(function (map, columnName, index) {
    if (columnName) {
      map[columnName] = index;
    }
    return map;
  }, {});
}

/**
 * Ensures required columns exist in the header.
 * @param {{[key: string]: number}} headerIndex
 */
function validateHeader_(headerIndex) {
  const missing = [];
  if (headerIndex[UNIQUE_KEY_COLUMNS.raceId] === undefined) {
    missing.push(UNIQUE_KEY_COLUMNS.raceId);
  }
  if (headerIndex[UNIQUE_KEY_COLUMNS.horseNumber] === undefined) {
    missing.push(UNIQUE_KEY_COLUMNS.horseNumber);
  }
  if (missing.length) {
    throw new Error('Missing required column(s) in header: ' + missing.join(', '));
  }
}

/**
 * Builds a map of existing rows keyed by race_id + horse_number.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {{[key: string]: number}} headerIndex
 * @return {{[key: string]: number}} Maps composite key → row number (1-based).
 */
function buildExistingRowMap_(sheet, headerIndex) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {};
  }

  const rowCount = lastRow - 1;
  const colCount = sheet.getLastColumn();
  const values = sheet.getRange(2, 1, rowCount, colCount).getValues();

  const map = {};
  const raceIdx = headerIndex[UNIQUE_KEY_COLUMNS.raceId];
  const horseIdx = headerIndex[UNIQUE_KEY_COLUMNS.horseNumber];

  values.forEach(function (row, rowOffset) {
    const raceId = row[raceIdx];
    const horseNumber = row[horseIdx];
    if (!raceId || horseNumber === '' || horseNumber === null || horseNumber === undefined) {
      return;
    }
    const key = String(raceId).trim() + '::' + String(horseNumber).trim();
    map[key] = rowOffset + 2; // Adjust to 1-based row number including header.
  });

  return map;
}

/**
 * Maps an entry object into an ordered row matching the sheet header.
 * @param {Object} entry
 * @param {Array<string>} header
 * @param {{[key: string]: number}} headerIndex
 * @return {Array<*>}
 */
function mapEntryToRow_(entry, header, headerIndex) {
  const row = new Array(header.length);
  for (var i = 0; i < header.length; i++) {
    var columnName = header[i];
    row[i] = entry.hasOwnProperty(columnName) ? entry[columnName] : '';
  }
  return row;
}

/**
 * Builds a composite key if the entry contains both required fields.
 * @param {Object} entry
 * @param {{[key: string]: number}} headerIndex
 * @return {string|null}
 */
function buildCompositeKey_(entry, headerIndex) {
  const raceValue = entry[UNIQUE_KEY_COLUMNS.raceId];
  const horseValue = entry[UNIQUE_KEY_COLUMNS.horseNumber];

  if (!raceValue || horseValue === '' || horseValue === null || horseValue === undefined) {
    return null;
  }
  return String(raceValue).trim() + '::' + String(horseValue).trim();
}

/**
 * Ensures a string is a valid ISO date (YYYY-MM-DD).
 * @param {string} value
 * @return {string|null}
 */
function sanitizeDate_(value) {
  const trimmed = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

