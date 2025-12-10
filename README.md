# 🏇 HeatSeaker Backend - Commercial Betting Platform

> **ZERO LIABILITY NOTICE**: Service provider assumes no liability for betting operations. Client bears 100% responsibility for all business outcomes.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Daily Reports](#daily-reports)
- [Deployment](#deployment)
- [Testing](#testing)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

HeatSeaker Backend is a commercial-grade betting platform backend that provides:

- **Race Data Ingestion**: Process and store horse racing data from multiple sources
- **Bet Management**: Handle betting operations with XpressBet integration
- **Transaction Support**: Robust database operations with rollback capabilities
- **Logging System**: Comprehensive application logging with database persistence
- **Daily Reports**: Automated daily email reports on data ingestion and API usage
- **Health Monitoring**: Comprehensive system and database health checks
- **API Gateway**: RESTful endpoints for all betting operations

## 🏗️ Architecture

### **Technology Stack**
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Testing**: Jest with comprehensive mocking
- **Logging**: Winston with structured logging and database persistence
- **Validation**: Joi schema validation
- **File Processing**: XLSX for Excel operations, CSV generation
- **Email**: Nodemailer for SMTP email delivery
- **Scheduling**: Node-cron for scheduled jobs

### **System Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway  │    │  Race Ingestion │    │  Bet Processing │
│   (Express)    │◄──►│     Service     │◄──►│     Service     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Validation   │    │  Data Models    │    │  XpressBet API │
│   (Joi)        │    │  (Track/Race)   │    │   Integration   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database     │    │  Logging       │    │  Daily Reports  │
│   (PostgreSQL) │    │   (Winston)    │    │   (Email)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✨ Features

### **Core Functionality**
- **Race Data Processing**: Ingest, validate, and store horse racing information
- **Bet Management**: Create, validate, and submit betting slips
- **Track Management**: Maintain track information and mappings
- **Data Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Graceful error handling with detailed logging

### **Advanced Features**
- **Transaction Support**: ACID-compliant database operations
- **Migration System**: Version-controlled schema changes
- **Health Monitoring**: Real-time system and database health checks
- **Audit Logging**: Comprehensive operation tracking with database persistence
- **Rollback Capabilities**: Database operation rollback support
- **Daily Reports**: Automated email reports on data ingestion and API usage
- **Spreadsheet Tracking**: Track which spreadsheets are making API calls

## 🌐 API Endpoints

### **Health & Monitoring**
```
GET  /health          - Application health status
GET  /health/db       - Database connection health
```

### **Betting Operations**
```
POST /api/submit-bets - Submit betting slips
```

### **Race Management**
```
POST /api/races/daily                    - Ingest daily race data
GET  /api/races/tracks                   - Get all tracks
GET  /api/races?startDate=X&endDate=Y    - Get races by date range
GET  /api/races/:id                      - Get specific race with entries
GET  /api/races/:id/winner               - Get winner for specific race
GET  /api/races/winners                  - Get winners by date range
GET  /api/races/winners/track/:trackId   - Get winners by track
GET  /api/races/entries/daily?date=X     - Get all race entries for a date
GET  /api/races/winners/daily?date=X     - Get winners for a date
```

### **Logging**
```
GET  /api/logs        - Get application logs (with optional filtering)
```

### **API Authentication**
All protected endpoints require a valid API key passed in the `x-api-key` header.

**Example:**
```bash
curl -H "x-api-key: your-api-key" https://your-api.com/api/races
```

## 🔐 Authentication

### **API Key Authentication**
The system uses **API key authentication only** for all protected endpoints. All endpoints that previously used API keys continue to work exactly as before.

**Status Codes:**
- `403 Forbidden`: Missing or invalid API key
- Error messages: "Forbidden: No API key provided" / "Forbidden: Invalid API key"

**Protected Endpoints:**
- All `/api/*` endpoints (except public health checks)
- All endpoints use the same `x-api-key` header format

**Backward Compatibility:**
✅ All existing API key-based clients continue to work without any changes.

## 🗄️ Database Schema

### **Core Tables**

#### **Tracks Table**
```sql
CREATE TABLE tracks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Races Table**
```sql
CREATE TABLE races (
  id VARCHAR(50) PRIMARY KEY,
  track_id INTEGER REFERENCES tracks(id),
  date DATE NOT NULL,
  race_number INTEGER NOT NULL,
  post_time TIME,
  source_file VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Race Entries Table**
```sql
CREATE TABLE race_entries (
  id SERIAL PRIMARY KEY,
  race_id VARCHAR(50) REFERENCES races(id),
  horse_number INTEGER NOT NULL,
  double DECIMAL(5,2),
  constant DECIMAL(5,2),
  p3 VARCHAR(50),
  correct_p3 DECIMAL(5,2),
  ml DECIMAL(5,2),
  live_odds DECIMAL(5,2),
  sharp_percent VARCHAR(20),
  action DECIMAL(5,2),
  double_delta DECIMAL(5,2),
  p3_delta DECIMAL(5,2),
  x_figure DECIMAL(5,2),
  will_pay_2 VARCHAR(50),
  will_pay VARCHAR(50),
  will_pay_1_p3 VARCHAR(50),
  win_pool VARCHAR(50),
  veto_rating VARCHAR(50),
  purse VARCHAR(50),
  race_type VARCHAR(50),
  age VARCHAR(50),
  raw_data TEXT,
  source_file VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Race Winners Table**
```sql
CREATE TABLE race_winners (
  id SERIAL PRIMARY KEY,
  race_id VARCHAR(50) UNIQUE REFERENCES races(id),
  winning_horse_number INTEGER NOT NULL,
  winning_payout_2_dollar DECIMAL(10,2),
  winning_payout_1_p3 DECIMAL(10,2),
  extraction_method VARCHAR(50),
  extraction_confidence VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Logs Table**
```sql
CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Installation & Setup

### **Prerequisites**
- Node.js 18+
- PostgreSQL 12+
- Yarn package manager

### **Quick Start**
```bash
# Clone the repository
git clone <repository-url>
cd heatseakerbackend

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
# The logs table migration is at: src/migrations/create_logs_table.sql

# Start the application
yarn dev
```

## ⚙️ Configuration

### **Environment Variables**

#### **Required Configuration**
```bash
# API Security (CRITICAL - Required)
API_KEY=your-secure-api-key-here

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
DB_SSL_REJECT_UNAUTHORIZED=true  # Set to "false" only if needed

# Server Configuration
PORT=8080
NODE_ENV=production  # or development

# Logging
LOG_LEVEL=info  # debug, info, warn, error
LOG_RETENTION_DAYS=90  # Log retention period in days
```

#### **CORS Configuration**
```bash
# CORS origin for frontend (defaults to http://localhost:3000)
UI_ORIGIN=https://your-frontend-domain.com
```

#### **Email Configuration (for Daily Reports)**
```bash
# Enable/disable email sending
EMAIL_ENABLED=true

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # For Gmail: Use App Password
SMTP_SECURE=true
EMAIL_FROM=your-email@gmail.com
REPORT_EMAIL_RECIPIENT=alexmeyer@awmdevelopment.com
```

### **Gmail SMTP Setup**

For Gmail, you need to:

1. **Enable 2-Factor Authentication**: https://myaccount.google.com/security
2. **Generate App Password**: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter name like "HeatSeaker Daily Reports"
   - Copy the 16-character password
3. **Use App Password**: Set `SMTP_PASSWORD` to the App Password (not your regular password)

### **SMTP Configuration Examples**

#### **Gmail**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # 16-char App Password
```

#### **SendGrid**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
```

#### **Other Providers**
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`

### **Database Configuration**
The application uses a connection pool for optimal database performance:
- Maximum connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

### **Logging Configuration**
- Structured logging with Winston
- Logs stored in database with 90-day retention (configurable)
- In-memory buffer for recent logs
- Automatic cleanup of old logs

## 📧 Daily Reports

### **Overview**
The system automatically generates and emails a comprehensive daily report at **9am Mountain Time** each day. The report includes:

1. **Tracks Ingested**: Tracks that ran the previous day with statistics
   - Races run
   - Races added to database
   - Entries added to database
   - Winners added to database

2. **Spreadsheet API Calls**: Tracks that retrieved data with links to spreadsheets
   - Spreadsheet URL (clickable link)
   - Track code (if available)
   - API endpoint called
   - Number of calls made
   - First and last call timestamps

3. **Error Summary**: Error analysis
   - Total error count
   - Number of unique error types
   - Most common error message
   - Top 10 error breakdown

### **Spreadsheet Integration**
To track which spreadsheets are making API calls, include the `X-Source-Spreadsheet-URL` header in requests.

#### **Google Apps Script Example**
```javascript
function fetchRaceData() {
  const url = 'https://your-api.com/api/races';
  const spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  
  const options = {
    'method': 'get',
    'headers': {
      'x-api-key': 'your-api-key',
      'X-Source-Spreadsheet-URL': spreadsheetUrl
    }
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
}
```

#### **Excel/VBA Example**
```vba
Sub FetchRaceData()
    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    http.Open "GET", "https://your-api.com/api/races", False
    http.setRequestHeader "x-api-key", "your-api-key"
    http.setRequestHeader "X-Source-Spreadsheet-URL", ThisWorkbook.FullName
    http.send
End Sub
```

### **Schedule**
- Runs daily at **9am Mountain Time** (approximately 4pm UTC)
- Uses node-cron for scheduling
- Automatically starts with the application

### **Manual Testing**
To manually trigger a daily report for testing, you can create a test endpoint or import the function:

```typescript
import { triggerDailyReport } from './services/dailyReportScheduler';
await triggerDailyReport();
```

## 🚀 Deployment

### **GitHub Secrets for Production**

For production deployments via GitHub Actions, add these secrets to your repository:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### **Required Secrets**
- `API_KEY` - Your secure API key
- `DATABASE_URL` - PostgreSQL connection string
- `DB_SSL_REJECT_UNAUTHORIZED` - `true` or `false`
- `LOG_LEVEL` - `info`, `warn`, `error`, etc.

#### **Email Secrets (for Daily Reports)**
- `EMAIL_ENABLED` - `true` or `false`
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP port (usually `587`)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASSWORD` - SMTP password/API key
- `SMTP_SECURE` - `true` or `false`
- `EMAIL_FROM` - Email address to send from
- `REPORT_EMAIL_RECIPIENT` - Email address to receive reports

### **Docker Deployment**
```bash
# Build Docker image
yarn build:local

# Run locally
yarn start:local

# Deploy to AWS
yarn deploy
```

### **AWS Deployment**
The application includes AWS deployment configuration:
- `Dockerrun.aws.json` - Elastic Beanstalk configuration
- `.github/workflows/deploy.yml` - GitHub Actions deployment workflow
- ECR integration for container registry
- Automatic deployment to EC2 on push to `main`

### **Deployment Process**
1. Push to `main` branch
2. GitHub Actions builds Docker image
3. Image pushed to ECR
4. Image deployed to EC2 instance
5. Environment variables from GitHub Secrets injected
6. Application starts automatically

## 🧪 Testing

### **Test Structure**
```
src/__tests__/
├── controllers/          # Controller tests
├── routes/              # Route tests  
├── services/            # Service tests
├── models/              # Model tests
└── utils/               # Utility function tests
```

### **Running Tests**
```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

### **Test Coverage**
Current test coverage: **71.73%**
- **Controllers**: 86.84%
- **Services**: 96.22%
- **Utils**: 54.86%
- **Validators**: 68.18%

### **Mocking Strategy**
- **Database**: Mocked connection pool and queries
- **External APIs**: Mocked HTTP responses
- **File System**: Mocked file operations
- **Models**: Mocked database model methods
- **Logging**: Mocked log storage service

## 👨‍💻 Development

### **Code Structure**
```
src/
├── config/              # Configuration files
├── controllers/         # Request handlers
├── middleware/          # Express middleware
├── models/              # Database models
├── routes/              # API route definitions
├── services/            # Business logic
│   ├── dailyReportService.ts      # Daily report generation
│   ├── dailyReportScheduler.ts    # Scheduled job
│   ├── emailService.ts            # Email sending
│   ├── logStorageService.ts       # Log persistence
│   └── ...
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── validators/          # Input validation schemas
```

### **Development Workflow**
1. **Feature Development**: Create feature branch from `main`
2. **Testing**: Write tests for new functionality
3. **Code Review**: Submit pull request for review
4. **Integration**: Merge after approval and CI passing

### **Code Quality**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code style and quality enforcement
- **Git Hooks**: Pre-commit validation

## 🔧 Troubleshooting

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database health
curl http://localhost:8080/health/db

# Check logs for connection errors
tail -f logs/combined.log | grep "database"
```

#### **API Key Issues**
```bash
# Verify API key is set
curl -H "x-api-key: your-key" http://localhost:8080/health
```

#### **Email Not Sending**
1. Check `EMAIL_ENABLED=true` in environment
2. Verify SMTP credentials are correct
3. For Gmail: Ensure you're using an App Password (not regular password)
4. Check application logs for SMTP errors
5. Verify firewall allows SMTP port (587/465)

#### **Daily Report Issues**
1. Check logs for: `"Daily report job scheduled successfully"`
2. Verify email configuration is correct
3. Check that data exists for the previous day
4. Verify spreadsheet URLs are being captured in logs

#### **Spreadsheet URLs Not Appearing**
1. Ensure spreadsheets include `X-Source-Spreadsheet-URL` header
2. Verify CORS allows the header (already configured)
3. Check logs contain the header in metadata

### **Log Analysis**
The application provides structured logging for easy debugging:

```json
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2025-01-27T10:00:00.000Z",
  "error": "Connection refused",
  "meta": {
    "ip": "127.0.0.1",
    "userAgent": "curl/7.68.0"
  }
}
```

### **Performance Monitoring**
- **Database Query Performance**: Tracked in migration logs
- **API Response Times**: Logged for all endpoints
- **Memory Usage**: Monitored through health checks
- **Connection Pool Status**: Available through database health endpoint

## 📚 Additional Documentation

- [Service Agreement](SERVICE_AGREEMENT.md) - Legal terms and liability framework
- [Contractor Agreement](CONTRACTOR_AGREEMENT.md) - Contractor service agreement

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### **Code Standards**
- Follow TypeScript best practices
- Write comprehensive tests
- Use meaningful commit messages
- Update documentation as needed

## 📄 License

This software is commercial software provided "AS IS" without warranty. See [LICENSE](LICENSE) and [SERVICE_AGREEMENT.md](SERVICE_AGREEMENT.md) for complete terms.

## 📞 Support

For technical support or questions:
- **Developer**: Alexander Meyer (alexmeyer@awmdevelopment.com)
- **Client**: Paul Stortini
- **Repository**: [GitHub Repository](https://github.com/sanddeveloper1-dev/heatseakerbackend)

---

**⚠️ IMPORTANT**: This is commercial software with zero liability for betting operations. Users bear 100% responsibility for all business outcomes.
