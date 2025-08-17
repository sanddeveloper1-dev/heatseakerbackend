# HeatSeaker Backend System

**Commercial Software - Contractor/Consultant Development Services**

> **ZERO LIABILITY NOTICE:** Service provider assumes no liability for betting operations. Client bears 100% responsibility for all business outcomes.

## Overview

The HeatSeaker Backend System is a commercial software application providing race data ingestion, betting integration, and data management services. This system is developed and maintained under an ongoing contractor/consultant relationship with zero betting liability.

## Commercial License Status

**⚠️ IMPORTANT: This is NOT open source software.**

- **License Type:** Commercial Software License Agreement
- **Copyright:** Copyright (c) 2024 Paul Stortini
- **Development:** Software Development & Maintenance by Alexander Meyer
- **Relationship:** Ongoing Contractor/Consultant Services

## Zero Betting Liability Framework

### Service Provider Liability
The service provider (Alexander Meyer) assumes **ZERO liability** for:
- Any betting operations, decisions, or outcomes
- Financial losses, regulatory violations, or business operations
- Any consequences arising from the use of this software
- Any business decisions made by Client or Client's users

### Client Responsibility
**Client bears 100% responsibility for:**
- All betting operations and decisions
- Regulatory compliance and licensing
- Financial outcomes and business operations
- User management and customer relations
- Data accuracy and business logic
- Risk management and compliance

### Legal Framework
This software is governed by:
- **LICENSE:** Commercial Software License Agreement
- **SERVICE_AGREEMENT.md:** Liability framework and service scope
- **CONTRACTOR_AGREEMENT.md:** Detailed contractor service agreement

## Contractor Relationship

### Ongoing Development Services
Alexander Meyer provides continuous:
- Software development and maintenance
- Technical consultation and support
- System enhancements and bug fixes
- Database management and optimization
- API development and maintenance
- Testing and quality assurance

### Service Delivery Model
- **Agile Development:** Iterative feature development and releases
- **Continuous Maintenance:** Ongoing system optimization and support
- **Technical Consultation:** Architecture decisions and best practices
- **Quality Assurance:** Comprehensive testing and code reviews

## System Architecture

### Core Components
- **Race Data Ingestion API:** Daily race information processing
- **Betting Integration Services:** Third-party betting platform integration
- **Database Management:** PostgreSQL with optimized schemas
- **Authentication & Security:** API key authentication and data protection
- **Performance Monitoring:** Real-time system health and performance tracking

### Technology Stack
- **Backend:** Node.js with TypeScript
- **Database:** PostgreSQL with connection pooling
- **API Framework:** Express.js with middleware
- **Testing:** Jest with comprehensive test coverage
- **Deployment:** Docker with AWS ECR integration

## API Endpoints

### Race Management
- `POST /api/races/daily` - Ingest daily race data
- `GET /api/races/tracks` - Retrieve track information
- `GET /api/races` - Query races by date range
- `GET /api/races/:id` - Get specific race with entries

### Betting Integration
- `POST /api/bets` - Process betting operations
- `GET /api/bets` - Retrieve betting history
- `GET /api/bets/statistics` - Betting analytics and reports

## Setup and Installation

### Prerequisites
- Node.js 18+ and Yarn
- PostgreSQL 12+ database
- Environment configuration

### Environment Variables
```env
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
API_KEY=your-api-key-here
```

### Installation
```bash
# Install dependencies
yarn install

# Run database migrations
yarn migrate

# Start development server
yarn dev

# Run tests
yarn test

# Build for production
yarn build
```

## Development Workflow

### Code Quality Standards
- TypeScript with strict type checking
- ESLint for code quality enforcement
- Comprehensive test coverage requirements
- Code review process for all changes

### Testing Strategy
- Unit tests for individual components
- Integration tests for API endpoints
- Performance testing for critical paths
- Security testing for vulnerability assessment

### Deployment Process
- Automated testing and quality checks
- Staging environment validation
- Client approval for production deployments
- Monitoring and rollback procedures

## Security and Compliance

### Data Protection
- Encrypted data transmission
- Secure API authentication
- Database access controls
- Regular security assessments

### Regulatory Compliance
- Data privacy protection
- Audit trail maintenance
- Compliance monitoring
- Regular compliance reviews

## Support and Maintenance

### Ongoing Support
- 24/7 emergency support for critical issues
- Regular maintenance and updates
- Performance optimization and monitoring
- Security patches and updates

### Communication Channels
- Weekly status reports and updates
- Issue tracking and resolution
- Change management and approvals
- Knowledge transfer and training

## Legal and Compliance

### Commercial License
This software is provided under a commercial license agreement with restrictive terms. No redistribution, modification, or reverse engineering is permitted without explicit written permission.

### Intellectual Property
All intellectual property rights remain with Paul Stortini. This agreement does not transfer ownership of the software system.

### Confidentiality
This software and related documentation contain confidential and proprietary information. Unauthorized disclosure is prohibited.

## Contact Information

### Service Provider
- **Name:** Alexander Meyer
- **Email:** alexmeyer@gmail.com
- **Role:** Software Development & Maintenance Contractor

### Client
- **Organization:** Paul Stortini
- **Contact:** [CLIENT_TECH_LEAD]
- **Role:** System Owner and Business Operator

## Important Disclaimers

### Betting Disclaimer
> "Service Provider provides software and integration services only. No financial, legal, or betting advice is provided. Client has exclusive control and responsibility for all betting operations, decisions, and regulatory compliance."

### Warranty Disclaimer
> "This software is provided 'AS IS' without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement."

### Liability Limitation
> "Service Provider's liability for any betting-related claims is limited to $0 (ZERO DOLLARS). Client bears 100% responsibility for all business outcomes."

---

## License and Legal

For complete terms and conditions, see:
- [LICENSE](LICENSE) - Commercial Software License Agreement
- [SERVICE_AGREEMENT.md](SERVICE_AGREEMENT.md) - Liability framework and service scope
- [CONTRACTOR_AGREEMENT.md](CONTRACTOR_AGREEMENT.md) - Detailed contractor service agreement
- [NOTICE](NOTICE) - Commercial license status and contractor attribution

**This is commercial software with restrictive licensing terms. Unauthorized use, modification, or distribution may result in legal action.**

---

**Last Updated:** [DATE]  
**Version:** 1.0.4  
**Status:** Active Contractor Development Relationship
