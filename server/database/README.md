# SmartGov Assistant Database Setup

This directory contains the database configuration, schema, and migration scripts for the SmartGov Assistant application.

## Overview

The application uses TiDB Serverless, a MySQL-compatible database with vector search capabilities. The database stores citizen feedback, AI agent processing results, and cached summaries.

## Database Schema

### Tables

#### `feedback`
Stores citizen feedback submissions with AI categorization results.

- `id` (VARCHAR(36), PRIMARY KEY) - Unique feedback identifier
- `text` (TEXT) - The feedback content from citizens
- `category` (ENUM) - AI-categorized topic: 'health', 'infrastructure', 'safety', 'other'
- `sentiment` (DECIMAL(3,2)) - Sentiment score from -1.00 (negative) to 1.00 (positive)
- `confidence` (DECIMAL(3,2)) - AI confidence score from 0.00 to 1.00
- `timestamp` (TIMESTAMP) - When feedback was submitted
- `processed` (BOOLEAN) - Whether AI categorization is complete
- `vector_embedding` (JSON) - Vector embedding for semantic search
- `created_at`, `updated_at` (TIMESTAMP) - Record timestamps

#### `summary_cache`
Caches AI-generated summaries and insights.

- `id` (VARCHAR(36), PRIMARY KEY) - Unique cache entry identifier
- `cache_key` (VARCHAR(255)) - Unique key for cache lookups
- `category` (VARCHAR(50)) - Category for categorized summaries
- `summary_data` (JSON) - Cached summary results from summarizer agent
- `expires_at` (TIMESTAMP) - Cache expiration time
- `created_at`, `updated_at` (TIMESTAMP) - Record timestamps

#### `agent_logs`
Tracks AI agent processing for monitoring and debugging.

- `id` (VARCHAR(36), PRIMARY KEY) - Unique log entry identifier
- `agent_type` (ENUM) - Type of agent: 'categorizer', 'summarizer'
- `feedback_id` (VARCHAR(36)) - Reference to processed feedback
- `status` (ENUM) - Processing status: 'pending', 'processing', 'completed', 'failed'
- `error_message` (TEXT) - Error details if processing failed
- `processing_time_ms` (INT) - Processing duration in milliseconds
- `created_at`, `updated_at` (TIMESTAMP) - Record timestamps

## Configuration

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# TiDB Serverless Configuration
TIDB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=your_username
TIDB_PASSWORD=your_password
TIDB_DATABASE=smartgov

# Alternative: Full connection string
DATABASE_URL=mysql://username:password@host:port/database
```

### Connection Features

- **Connection Pooling**: Configured with 10 concurrent connections
- **SSL Support**: Required for TiDB Serverless
- **Automatic Reconnection**: Built-in retry logic
- **Error Handling**: Comprehensive error logging and recovery

## Migration System

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Verify database schema
npm run migrate:verify

# Reset database (development only)
npm run migrate:reset
```

### Migration Commands

- `npm run migrate` - Apply all pending migrations
- `npm run migrate:reset` - Reset and recreate database (dev only)
- `npm run migrate:verify` - Verify schema integrity
- `npm run test:db` - Test database setup and connections

### Adding New Migrations

1. Add SQL to `schema.sql` or create new migration files
2. Update the migrations array in `database/migrations.ts`
3. Run `npm run migrate` to apply changes

## Repository Pattern

The application uses a repository pattern for database operations:

### Available Repositories

- **FeedbackRepository**: CRUD operations for citizen feedback
- **SummaryCacheRepository**: Cache management for AI summaries
- **AgentLogRepository**: Logging and monitoring for AI agents

### Usage Example

```typescript
import { feedbackRepository } from '../repositories/index.js';

// Create new feedback
const feedback = await feedbackRepository.create({
  text: "The streetlights on Main St are broken",
  category: "infrastructure",
  sentiment: -0.3,
  confidence: 0.85,
  processed: true
});

// Get paginated feedback
const result = await feedbackRepository.getPaginated(1, 20, 'infrastructure');
```

## Performance Considerations

### Indexes

The schema includes optimized indexes for:
- Category-based queries
- Timestamp-based sorting
- Sentiment analysis queries
- Processing status lookups

### Caching Strategy

- Summary results are cached with configurable expiration
- Vector embeddings are stored for fast semantic search
- Database connection pooling reduces overhead

## Security

- **SSL/TLS**: All connections use encrypted transport
- **Input Validation**: All queries use parameterized statements
- **Access Control**: Database credentials stored in environment variables
- **Error Handling**: No sensitive information leaked in error messages

## Monitoring

### Health Checks

- Database connectivity testing
- Schema validation
- Performance metrics collection

### Logging

- All database operations are logged
- Agent processing times tracked
- Error conditions monitored and alerted

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check TiDB credentials and network access
2. **SSL Errors**: Ensure SSL is properly configured for TiDB Serverless
3. **Migration Failures**: Verify database permissions and schema state
4. **Performance Issues**: Check indexes and query optimization

### Debug Commands

```bash
# Test database connection
npm run test:db

# Verify schema integrity
npm run migrate:verify

# Check server health (includes DB status)
curl http://localhost:3001/health
```

## Development Workflow

1. **Setup**: Configure environment variables
2. **Initialize**: Run `npm run migrate` to create schema
3. **Develop**: Use repositories for database operations
4. **Test**: Run `npm run test:db` to verify setup
5. **Deploy**: Ensure production environment variables are set

## Production Considerations

- Use connection pooling for high concurrency
- Monitor query performance and optimize as needed
- Implement backup and recovery procedures
- Set up monitoring and alerting for database health
- Configure appropriate cache expiration times