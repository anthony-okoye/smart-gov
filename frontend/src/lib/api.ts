import { ApiResponse, PaginatedResponse, Feedback, SearchResponse, CategorySummary, Trend } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Feedback endpoints
  async submitFeedback(text: string, category?: string): Promise<ApiResponse<{ id: string }>> {
    return this.request('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ text, category }),
    })
  }

  async getFeedback(params: {
    page?: number
    limit?: number
    category?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<PaginatedResponse<Feedback>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    return this.request(`/api/feedback?${searchParams.toString()}`)
  }

  async searchFeedback(query: string, limit?: number): Promise<SearchResponse> {
    const searchParams = new URLSearchParams({ q: query })
    if (limit) searchParams.append('limit', limit.toString())
    
    return this.request(`/api/feedback/search?${searchParams.toString()}`)
  }

  // Summary endpoints
  async getSummary(): Promise<ApiResponse<{
    categories: CategorySummary[]
    trends: Trend[]
    lastUpdated: string
  }>> {
    return this.request('/api/summary')
  }

  // Analytics endpoints
  async getAnalytics(): Promise<ApiResponse<{
    totalFeedback: number
    sentimentDistribution: Record<string, number>
    categoryDistribution: Record<string, number>
  }>> {
    return this.request('/api/analytics')
  }
}

export const apiClient = new ApiClient()
export default apiClient