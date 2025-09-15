// Agent interface definitions for SmartGov Assistant

export interface CategorizationResult {
  category: 'health' | 'infrastructure' | 'safety' | 'other';
  sentiment: number; // -1 to 1 scale
  confidence: number; // 0 to 1 scale
}

export interface SummarizationResult {
  categoryInsights: CategoryInsight[];
  emergingTrends: Trend[];
  keyComplaints: string[];
  recommendations: string[];
}

export interface CategoryInsight {
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

export interface AgentError extends Error {
  code: string;
  retryable: boolean;
}

export interface AgentConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}