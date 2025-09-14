-- SmartGov Assistant Database Schema
-- Compatible with TiDB Serverless (MySQL-compatible)

-- Create feedback table for storing citizen feedback
CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  text TEXT NOT NULL,
  category ENUM('health', 'infrastructure', 'safety', 'other') DEFAULT 'other',
  sentiment DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Sentiment score from -1.00 to 1.00',
  confidence DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Confidence score from 0.00 to 1.00',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE COMMENT 'Whether feedback has been processed by categorizer agent',
  vector_embedding JSON COMMENT 'Vector embedding for semantic search',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_category (category),
  INDEX idx_timestamp (timestamp),
  INDEX idx_sentiment (sentiment),
  INDEX idx_processed (processed),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create summary_cache table for caching agent results
CREATE TABLE IF NOT EXISTS summary_cache (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  cache_key VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique key for cache entry',
  category VARCHAR(50) COMMENT 'Category for categorized summaries',
  summary_data JSON NOT NULL COMMENT 'Cached summary results from summarizer agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL COMMENT 'Cache expiration timestamp',
  
  -- Indexes for performance
  INDEX idx_cache_key (cache_key),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create agent_logs table for tracking agent processing
CREATE TABLE IF NOT EXISTS agent_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  agent_type ENUM('categorizer', 'summarizer') NOT NULL,
  feedback_id VARCHAR(36) COMMENT 'Reference to feedback being processed',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT COMMENT 'Error message if processing failed',
  processing_time_ms INT COMMENT 'Processing time in milliseconds',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_agent_type (agent_type),
  INDEX idx_feedback_id (feedback_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  -- Foreign key constraint
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;