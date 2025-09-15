// Database model interfaces for SmartGov Assistant

export interface Feedback {
  id: string;
  text: string;
  category: 'health' | 'infrastructure' | 'safety' | 'other';
  sentiment: number; // -1.00 to 1.00
  confidence: number; // 0.00 to 1.00
  timestamp: Date;
  processed: boolean;
  vector_embedding?: any; // JSON data for vector search
  created_at: Date;
  updated_at: Date;
}

export interface SummaryCache {
  id: string;
  cache_key: string;
  category?: string;
  summary_data: any; // JSON data containing summary results
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export interface AgentLog {
  id: string;
  agent_type: 'categorizer' | 'summarizer';
  feedback_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  processing_time_ms?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Migration {
  id: string;
  description: string;
  applied_at: Date;
}

// Database query result types
export interface FeedbackQueryResult {
  feedback: Feedback[];
  total: number;
  page: number;
  limit: number;
}

export interface CategorySummary {
  category: string;
  count: number;
  averageSentiment: number;
  keyIssues: string[];
  trends: string[];
}

export interface Trend {
  topic: string;
  frequency: number;
  sentimentChange: number;
  timeframe: string;
}

export interface SentimentStats {
  positive: number;
  neutral: number;
  negative: number;
}

export interface CategoryStats {
  health: number;
  infrastructure: number;
  safety: number;
  other: number;
}

// Input types for validation
export interface FeedbackCreateInput {
  text: string;
  category?: 'health' | 'infrastructure' | 'safety' | 'other';
  sentiment?: number;
  confidence?: number;
}

export interface FeedbackUpdateInput {
  text?: string;
  category?: 'health' | 'infrastructure' | 'safety' | 'other';
  sentiment?: number;
  confidence?: number;
  processed?: boolean;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Database connection configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}