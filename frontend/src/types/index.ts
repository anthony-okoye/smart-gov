// Feedback types
export interface Feedback {
  id: string
  text: string
  category: 'health' | 'infrastructure' | 'safety' | 'other'
  sentiment: number
  confidence: number
  timestamp: Date
  processed: boolean
}

// Summary types
export interface CategorySummary {
  category: string
  count: number
  averageSentiment: number
  keyIssues: string[]
  trends: string[]
}

export interface Trend {
  topic: string
  frequency: number
  sentimentChange: number
  timeframe: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Search types
export interface SearchResult {
  feedback: Feedback
  relevanceScore: number
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
  totalResults: number
}