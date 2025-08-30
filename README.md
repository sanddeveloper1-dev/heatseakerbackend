# 🏇 HeatSeaker Backend - Commercial Betting Platform

> **ZERO LIABILITY NOTICE**: Service provider assumes no liability for betting operations. Client bears 100% responsibility for all business outcomes.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Transaction Support](#transaction-support)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

HeatSeaker Backend is a commercial-grade betting platform backend that provides:

- **Race Data Ingestion**: Process and store horse racing data from multiple sources
- **Bet Management**: Handle betting operations with XpressBet integration
- **Transaction Support**: Robust database operations with rollback capabilities
- **Migration System**: Version-controlled database schema management
- **Health Monitoring**: Comprehensive system and database health checks
- **API Gateway**: RESTful endpoints for all betting operations

## 🏗️ Architecture

### **Technology Stack**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Testing**: Jest with comprehensive mocking
- **Logging**: Winston with structured logging
- **Validation**: Joi schema validation
- **File Processing**: XLSX for Excel operations, CSV generation

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
│   Database     │    │  Migration      │    │  File Storage   │
│   (PostgreSQL) │    │   Manager       │    │   (CSV/XLSX)    │
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
- **Audit Logging**: Comprehensive operation tracking
- **Rollback Capabilities**: Database operation rollback support

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
POST /api/races/ingest - Ingest race data
GET  /api/races        - Retrieve race information
```

### **API Authentication**
All endpoints require a valid API key passed in the `X-API-Key` header.

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
  prev_race_1_winner_horse_number INTEGER,
  prev_race_1_winner_payout DECIMAL(10,2),
  prev_race_2_winner_horse_number INTEGER,
  prev_race_2_winner_payout DECIMAL(10,2),
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
  p3 DECIMAL(5,2),
  ml DECIMAL(5,2),
  live_odds DECIMAL(5,2),
  sharp_percent VARCHAR(20),
  action DECIMAL(5,2),
  double_delta DECIMAL(5,2),
  p3_delta DECIMAL(5,2),
  x_figure DECIMAL(5,2),
  will_pay_2 VARCHAR(50),
  will_pay_1_p3 VARCHAR(50),
  win_pool VARCHAR(50),
  veto_rating VARCHAR(50),
  raw_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Migrations Table**
```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64) NOT NULL,
  execution_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success'
);
```

## 🔄 Transaction Support

### **Overview**
The application implements comprehensive transaction support to ensure data integrity across all database operations. This is particularly critical for betting operations where multiple related records must be created or updated atomically.

### **Transaction Implementation**

#### **1. Connection Pool Management**
```typescript
// Get a client from the pool for transaction management
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... perform operations ...
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

#### **2. Model-Level Transaction Support**
All models provide both standard and transaction-aware methods:

```typescript
// Standard method (auto-commits)
await TrackModel.create(trackData);

// Transaction-aware method (part of larger transaction)
await TrackModel.createWithClient(client, trackData);
```

#### **3. Race Ingestion Transactions**
Race data ingestion uses transactions to ensure all related data is stored consistently:

```typescript
// Process races with transaction support
const results = await this.processRacesWithTransaction(races, source);
```

#### **4. Bet Processing Transactions**
Bet processing ensures file generation and database updates are atomic:

```typescript
// Generate CSV file and update database within transaction
const filePath = createBetCsv(bets, betType);
const result = await placeBet(trackCode, betType, raceNumber, filePath, bets);
```

### **Transaction Benefits**
- **Data Consistency**: Related operations succeed or fail together
- **Rollback Capability**: Failed operations can be undone
- **Performance**: Reduced round-trips to database
- **Reliability**: Better error handling and recovery

### **Transaction Safety**
- **Automatic Rollback**: Failed transactions are automatically rolled back
- **Connection Management**: Proper connection release in all scenarios
- **Error Propagation**: Errors are properly logged and propagated
- **Resource Cleanup**: File system resources are cleaned up on failure

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
yarn migrate

# Start the application
yarn dev
```

### **Environment Variables**
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/heatseaker
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=heatseaker
DATABASE_USER=username
DATABASE_PASSWORD=password

# Application Configuration
PORT=8080
NODE_ENV=development
LOG_LEVEL=info

# API Configuration
API_KEY=your-secret-api-key
```

## ⚙️ Configuration

### **Database Configuration**
The application uses a connection pool for optimal database performance:

```typescript
// src/config/database.ts
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### **Logging Configuration**
Structured logging with Winston:

```typescript
// src/config/logger.ts
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

## 🧪 Testing

### **Test Structure**
```
src/__tests__/
├── controllers/          # Controller tests
├── routes/              # Route tests  
├── services/            # Service tests
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

## 🚀 Deployment

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
- `deploy-ec2.sh` - Deployment script
- ECR integration for container registry

### **Environment-Specific Configs**
- **Development**: Local database, debug logging
- **Staging**: Staging database, info logging
- **Production**: Production database, error logging only

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
- **Prettier**: Code formatting
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

#### **Migration Issues**
```bash
# Check migration status
yarn migrate:status

# Run migrations manually
yarn migrate:run
```

#### **API Key Issues**
```bash
# Verify API key is set
curl -H "X-API-Key: your-key" http://localhost:8080/health
```

### **Log Analysis**
The application provides structured logging for easy debugging:

```json
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2025-08-17T02:36:49.645Z",
  "error": "Connection refused",
  "context": "database connection"
}
```

### **Performance Monitoring**
- **Database Query Performance**: Tracked in migration logs
- **API Response Times**: Logged for all endpoints
- **Memory Usage**: Monitored through health checks
- **Connection Pool Status**: Available through database health endpoint

## 📚 Additional Documentation

- [Environment Setup Guide](ENVIRONMENT_SETUP.md)
- [Migration Checklist](MIGRATION_CHECKLIST.md)
- [Race API Documentation](RACE_API_README.md)
- [Service Agreement](SERVICE_AGREEMENT.md)
- [Contractor Agreement](CONTRACTOR_AGREEMENT.md)

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
