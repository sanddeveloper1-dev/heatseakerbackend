# Race Data Ingestion API

This document describes the new race data ingestion API that allows you to store daily race information in a PostgreSQL database.

## Overview

The race data ingestion API provides endpoints to:
- Ingest daily race data with automatic validation and normalization
- Retrieve race information by various criteria
- Manage track information
- Handle race entries with comprehensive data fields

## Database Schema

The API uses three main tables:

### Tracks Table
- `id`: Primary key
- `code`: Unique track code (e.g., 'AQU', 'BEL')
- `name`: Full track name (e.g., 'AQUEDUCT', 'BELMONT')
- `location`: Optional location information
- `created_at`, `updated_at`: Timestamps

### Races Table
- `id`: Primary key (format: TRACKCODE_YYYYMMDD_RACENUMBER)
- `track_id`: Foreign key to tracks table
- `date`: Race date (YYYY-MM-DD format)
- `race_number`: Race number (3-15 only)
- `prev_race_1_winner_horse_number`: Previous race winner horse number
- `prev_race_1_winner_payout`: Previous race winner payout
- `prev_race_2_winner_horse_number`: Two races ago winner horse number
- `prev_race_2_winner_payout`: Two races ago winner payout
- `source_file`: Original source identifier
- `created_at`, `updated_at`: Timestamps

### Race Entries Table
- `id`: Primary key
- `race_id`: Foreign key to races table
- `horse_number`: Horse number (1-16)
- `double`: Double odds
- `constant`: Constant value
- `p3`: Pick 3 value
- `ml`: Morning line odds
- `live_odds`: Live odds
- `sharp_percent`: Sharp action percentage
- `action`: Action value
- `double_delta`: Double delta
- `p3_delta`: P3 delta
- `x_figure`: X figure
- `will_pay_2`: $2 Will Pay amount
- `will_pay_1_p3`: $1 P3 Will Pay amount
- `win_pool`: Win pool amount
- `veto_rating`: Veto rating
- `raw_data`: Raw extracted data
- `source_file`: Original source identifier
- `created_at`, `updated_at`: Timestamps

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
API_KEY=your-api-key-here
```

### 2. Database Migration

The database schema will be automatically created when the application starts. The migration file is located at `migrations/001_create_race_tables.sql`.

### 3. Dependencies

Install the required dependencies:

```bash
yarn add pg
yarn add -D @types/pg
```

## API Endpoints

### POST /api/races/daily

**Description:** Ingest daily race data

**Authentication:** API Key required

**Request Body:**
```json
{
  "source": "daily_race_data",
  "races": [
    {
      "race_id": "AQUEDUCT 04-27-25 Race 3",
      "track": "AQUEDUCT",
      "date": "04-27-25",
      "race_number": "3",
      "post_time": "2:16:00 PM",
      "prev_race_1_winner_horse_number": 5,
      "prev_race_1_winner_payout": 12.40,
      "prev_race_2_winner_horse_number": 3,
      "prev_race_2_winner_payout": 8.60,
      "entries": [
        {
          "horse_number": 1,
          "double": "23.4",
          "constant": "58",
          "p3": "37.85",
          "ml": 20.0,
          "live_odds": 36.47,
          "sharp_percent": "107.44%",
          "action": "-0.17",
          "double_delta": "-0.17",
          "p3_delta": "-1.42",
          "x_figure": "-1.59",
          "will_pay_2": "$298.00",
          "will_pay_1_p3": "$2,238.00",
          "win_pool": "$3,743.00",
          "veto_rating": null,
          "raw_data": "1 | 23.4 | 58 | 37.85 | 20.0 | 36.47 | 107.44% | -0.17 | -0.17 | -1.42 | -1.59 | $298.00 | $2,238.00 | $3,743.00"
        }
      ]
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Daily race data processed successfully",
  "statistics": {
    "races_processed": 5,
    "entries_processed": 45,
    "races_skipped": 0,
    "entries_skipped": 3,
    "errors": []
  },
  "processed_races": ["AQU_20250427_03", "BEL_20250427_05"]
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Race AQUEDUCT 04-27-25 Race 2: Race number must be 3 or higher"
  ],
  "statistics": {
    "races_processed": 0,
    "entries_processed": 0,
    "races_skipped": 1,
    "entries_skipped": 5,
    "errors": 6
  }
}
```

### GET /api/races/tracks

**Description:** Get all tracks

**Authentication:** API Key required

**Response:**
```json
{
  "success": true,
  "tracks": [
    {
      "id": 1,
      "code": "AQU",
      "name": "AQUEDUCT",
      "location": null,
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

### GET /api/races?startDate=2025-01-01&endDate=2025-01-31

**Description:** Get races by date range

**Authentication:** API Key required

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD format)
- `endDate`: End date (YYYY-MM-DD format)

**Response:**
```json
{
  "success": true,
  "races": [
    {
      "id": "AQU_20250127_03",
      "track_id": 1,
      "date": "2025-01-27",
      "race_number": 3,
      "track_name": "AQUEDUCT",
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

### GET /api/races/:id

**Description:** Get specific race with entries

**Authentication:** API Key required

**Response:**
```json
{
  "success": true,
  "race": {
    "id": "AQU_20250127_03",
    "track_id": 1,
    "date": "2025-01-27",
    "race_number": 3,
    "created_at": "2025-01-27T10:00:00Z",
    "updated_at": "2025-01-27T10:00:00Z"
  },
  "entries": [
    {
      "id": 1,
      "race_id": "AQU_20250127_03",
      "horse_number": 1,
      "double": 23.4,
      "constant": 58,
      "p3": 37.85,
      "ml": 20.0,
      "live_odds": 36.47,
      "sharp_percent": "107.44%",
      "action": -0.17,
      "double_delta": -0.17,
      "p3_delta": -1.42,
      "x_figure": -1.59,
      "will_pay_2": "$298.00",
      "will_pay_1_p3": "$2,238.00",
      "win_pool": "$3,743.00",
      "veto_rating": null,
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

## Data Validation Rules

### Race Validation
- Race numbers must be between 3 and 15
- Each race must have at least 3 valid entries
- Date format must be MM-DD-YY (e.g., "04-27-25")

### Entry Validation
- Horse numbers must be between 1 and 16
- Invalid values are filtered out: 'SC', 'N/A', '#VALUE!', '#DIV/0!', empty strings
- At least some valid data must be present in each entry

### Track Standardization
The API automatically standardizes track names using the following mapping:
- 'AQU'/'AQD' → 'AQUEDUCT'
- 'BEL' → 'BELMONT'
- 'CD' → 'CHURCHILL'
- 'GP'/'GPW' → 'GULFSTREAM'
- And many more...

## Data Processing

### Automatic Data Normalization
- Currency symbols ($) and commas are removed from numeric fields
- String numbers are converted to proper numeric types
- Date format is converted from MM-DD-YY to YYYY-MM-DD
- Race IDs are generated in format: TRACKCODE_YYYYMMDD_RACENUMBER

### Upsert Logic
- Existing races are updated if they already exist
- New races are created if they don't exist
- Race entries are upserted (inserted or updated)
- Referential integrity is maintained

### Error Handling
- Partial success is supported (some races may succeed while others fail)
- Detailed error messages are provided
- Processing statistics are returned
- Failed transactions are rolled back

## Usage Examples

### cURL Example

```bash
curl -X POST http://localhost:8080/api/races/daily \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "source": "daily_race_data",
    "races": [
      {
        "race_id": "AQUEDUCT 04-27-25 Race 3",
        "track": "AQUEDUCT",
        "date": "04-27-25",
        "race_number": "3",
        "entries": [
          {
            "horse_number": 1,
            "double": "23.4",
            "constant": "58",
            "p3": "37.85",
            "ml": 20.0,
            "live_odds": 36.47,
            "sharp_percent": "107.44%",
            "action": "-0.17",
            "double_delta": "-0.17",
            "p3_delta": "-1.42",
            "x_figure": "-1.59",
            "will_pay_2": "$298.00",
            "will_pay_1_p3": "$2,238.00",
            "win_pool": "$3,743.00"
          }
        ]
      }
    ]
  }'
```

### JavaScript Example

```javascript
const response = await fetch('http://localhost:8080/api/races/daily', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    source: 'daily_race_data',
    races: [
      {
        race_id: 'AQUEDUCT 04-27-25 Race 3',
        track: 'AQUEDUCT',
        date: '04-27-25',
        race_number: '3',
        entries: [
          {
            horse_number: 1,
            double: '23.4',
            constant: '58',
            p3: '37.85',
            ml: 20.0,
            live_odds: 36.47,
            sharp_percent: '107.44%',
            action: '-0.17',
            double_delta: '-0.17',
            p3_delta: '-1.42',
            x_figure: '-1.59',
            will_pay_2: '$298.00',
            will_pay_1_p3: '$2,238.00',
            win_pool: '$3,743.00'
          }
        ]
      }
    ]
  })
});

const result = await response.json();
console.log(result);
```

## Testing

Run the test suite:

```bash
yarn test
```

The tests cover:
- Data validation
- Data normalization
- Track mapping
- Race ID generation
- Date format conversion

## Monitoring

The API provides comprehensive logging:
- Request/response logging
- Database operation logging
- Error logging with context
- Processing statistics

Check the application logs for detailed information about API usage and any issues.

## Performance Considerations

- Connection pooling is configured for optimal performance
- Batch processing is used for race entries
- Database indexes are created for common query patterns
- Transactions ensure data consistency

## Error Codes

- `400`: Validation error or processing error
- `401`: Missing or invalid API key
- `404`: Race not found (for GET endpoints)
- `500`: Internal server error

## Support

For issues or questions about the race data ingestion API, please check the application logs and refer to this documentation. The API includes comprehensive error messages to help diagnose issues. 