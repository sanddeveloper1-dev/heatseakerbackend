# Environment Configuration Guide

## Required Environment Variables

### Security (CRITICAL)
```bash
# REQUIRED: Set a strong API key for authentication
API_KEY=your-secure-api-key-here
```

**⚠️ WARNING**: Never leave this unset or use a default value. The system will not start without a proper API key.

### Server Configuration
```bash
# Server port (default: 8080)
PORT=8080

# Environment (development, staging, production)
NODE_ENV=development
```

### Database Configuration
```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@host:port/database

# Database SSL Configuration (Production Only)
# Set to "false" only if you need to disable SSL certificate validation
# WARNING: Setting to "false" reduces security
DB_SSL_REJECT_UNAUTHORIZED=true
```

### Neon Data API (Read-Only Queries)
```bash
# Required for Neon Data API access
NEON_API_KEY=your-neon-data-api-key
NEON_PROJECT_ID=your-neon-project-id

# Optional overrides
NEON_BRANCH_ID=branch-id-if-not-default
NEON_DATABASE=database-name-if-not-default
NEON_API_URL=https://api.neon.tech/sql
```

### Logging
```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info
```

## Production Deployment Checklist

1. ✅ **API_KEY**: Set a strong, unique API key
2. ✅ **NODE_ENV**: Set to "production"
3. ✅ **DATABASE_URL**: Use production database credentials
4. ✅ **DB_SSL_REJECT_UNAUTHORIZED**: Set to "true" for security
5. ✅ **PORT**: Use appropriate production port (usually 80, 443, or 8080)

## Security Notes

- **API Key**: Must be at least 32 characters, use a secure random generator
- **Database SSL**: Always use SSL in production, only disable if absolutely necessary
- **Environment Variables**: Never commit .env files to version control
- **Database Credentials**: Use strong passwords and limit database access

## Example Production Configuration

```bash
NODE_ENV=production
PORT=8080
API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
DATABASE_URL=postgresql://prod_user:StrongPassword123@prod-db.example.com:5432/heatseaker_prod
DB_SSL_REJECT_UNAUTHORIZED=true
LOG_LEVEL=info
```
