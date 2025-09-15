'use client'

import { SearchResult } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  loading: boolean
  error: string | null
  showRelevanceScores?: boolean
  showSentimentAnalysis?: boolean
}

export default function SearchResults({
  results,
  query,
  loading,
  error,
  showRelevanceScores = false,
  showSentimentAnalysis = false
}: SearchResultsProps) {
  // Helper function to get sentiment color and label
  const getSentimentInfo = (sentiment: number) => {
    if (sentiment > 0.1) {
      return { color: 'text-green-600 dark:text-green-400', label: 'Positive', bg: 'bg-green-100 dark:bg-green-900/20' }
    } else if (sentiment < -0.1) {
      return { color: 'text-red-600 dark:text-red-400', label: 'Negative', bg: 'bg-red-100 dark:bg-red-900/20' }
    } else {
      return { color: 'text-gray-600 dark:text-gray-400', label: 'Neutral', bg: 'bg-gray-100 dark:bg-gray-900/20' }
    }
  }

  // Helper function to get category color
  const getCategoryColor = (category: string) => {
    const colors = {
      health: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      infrastructure: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      safety: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  // Helper function to highlight search terms in text
  const highlightSearchTerms = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text

    const terms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 2)
    let highlightedText = text

    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>'
      )
    })

    return highlightedText
  }

  // Helper function to get relevance score color
  const getRelevanceScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Searching...
          </h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Search Results
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Search Error
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!query.trim()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Search Results
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No search performed
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter a search query above to find relevant feedback using AI-powered vector search.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Search Results
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No results found for &quot;{query}&quot;
          </p>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.1-5.5-2.709" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No results found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search terms or using broader keywords.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Search Results
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Found {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
        </p>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {results.map((result) => {
          const sentimentInfo = getSentimentInfo(result.feedback.sentiment)
          
          return (
            <div key={result.feedback.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(result.feedback.category)}`}>
                    {result.feedback.category}
                  </span>
                  
                  {showSentimentAnalysis && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sentimentInfo.bg} ${sentimentInfo.color}`}>
                      {sentimentInfo.label}
                    </span>
                  )}
                  
                  {showRelevanceScores && (
                    <span className={`text-xs font-medium ${getRelevanceScoreColor(result.relevanceScore)}`}>
                      {Math.round(result.relevanceScore * 100)}% match
                    </span>
                  )}
                </div>
                
                <time className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(result.feedback.timestamp), { addSuffix: true })}
                </time>
              </div>
              
              <div 
                className="text-gray-900 dark:text-white leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: highlightSearchTerms(result.feedback.text, query) 
                }}
              />
              
              {showSentimentAnalysis && (
                <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>Sentiment Score: </span>
                  <span className={`ml-1 font-medium ${sentimentInfo.color}`}>
                    {result.feedback.sentiment > 0 ? '+' : ''}{result.feedback.sentiment.toFixed(2)}
                  </span>
                  <span className="mx-2">•</span>
                  <span>Confidence: {Math.round(result.feedback.confidence * 100)}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}