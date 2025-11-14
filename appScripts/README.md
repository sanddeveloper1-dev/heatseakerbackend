## Daily Race Entry Sync Script

This repository stores a Google Apps Script that keeps the `DATABASE` Google Sheet in sync with the `/api/races/entries/daily` endpoint.

- **Script file:** `appScripts/raceEntriesDailyFetch.gs`
- **Primary functions:** `runDailyRaceEntrySync(dateOverride?)` for automated runs, `promptForDailyRaceEntrySync()` for manual prompts.

### Setup

- Open the `DATABASE` spreadsheet in Google Sheets.
- Go to `Extensions → Apps Script`, paste the contents of `appScripts/raceEntriesDailyFetch.gs` into a script file, and save.
- In the Apps Script editor, open `Project Settings → Script properties` and define:
  - `RACE_API_BASE_URL` – e.g. `https://your-service.example.com`
  - `RACE_API_KEY` – API key that authenticates with the backend
- Confirm the spreadsheet has a header row on the `race_entries` tab with columns matching the API response fields (for example `race_id`, `race_date`, `track_code`, `horse_number`, `double`, `p3`, `action`, etc.).

### Running the script

- **Default run:** `runDailyRaceEntrySync()` fetches entries for “yesterday” in the spreadsheet’s time zone.
- **Manual override:** call `runDailyRaceEntrySync('YYYY-MM-DD')` or run `promptForDailyRaceEntrySync()` and enter a date when prompted.
- The script appends new rows and overwrites any existing row that shares the same `race_id` and `horse_number`, preventing duplicate entries. A summary is logged via `Logger.log`.

### Scheduling daily runs

- In the Apps Script editor choose `Triggers → Add Trigger`.
- Select `runDailyRaceEntrySync` as the function, choose `Time-driven`, pick a daily frequency, and set the desired time.
- Ensure the script is authorized the first time it runs so the trigger can execute automatically.

