'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SearchBar, SearchResults } from '@/components'
import { SearchResult } from '@/types'
import { apiClient } from '@/lib/api'

function SearchPageContent() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [currentQuery, setCurrentQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRelevanceScores, setShowRelevanceScores] = useState(false)
  const [showSentimentAnalysis, setShowSentimentAnalysis] = useState(false)
  
  const searchParams = useSearchParams()

  // Handle URL query parameter on mount
  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (urlQuery) {
      setCurrentQuery(urlQuery)
      performSearch(urlQuery)
    }
  }, [searchParams])

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setCurrentQuery('')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.searchFeedback(query, 50)
      setSearchResults(response.results)
      setCurrentQuery(query)
    } catch (error) {
      console.error('Search failed:', error)
      setError('Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchResults = (results: SearchResult[], query: string) => {
    setSearchResults(results)
    setCurrentQuery(query)
  }

  const handleLoading = (loading: boolean) => {
    setIsLoading(loading)
  }

  const handleError = (error: string | null) => {
    setError(error)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Search Feedback
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Use AI-powered search to find relevant feedback and insights
        </p>
      </div>

      {/* Search interface */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query
            </label>
            <SearchBar
              onSearchResults={handleSearchResults}
              onLoading={handleLoading}
              onError={handleError}
              placeholder="Enter your search query (e.g., 'road conditions', 'healthcare services')..."
              initialQuery={currentQuery}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showSentimentAnalysis}
                  onChange={(e) => setShowSentimentAnalysis(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include sentiment analysis
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showRelevanceScores}
                  onChange={(e) => setShowRelevanceScores(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Show relevance scores
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Search results */}
      <SearchResults
        results={searchResults}
        query={currentQuery}
        loading={isLoading}
        error={error}
        showRelevanceScores={showRelevanceScores}
        showSentimentAnalysis={showSentimentAnalysis}
      />

      {/* Search tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Search Tips
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Use natural language queries like &quot;complaints about road conditions&quot;</li>
          <li>• Search for specific topics like &quot;healthcare access&quot; or &quot;public transportation&quot;</li>
          <li>• Include sentiment keywords like &quot;positive feedback about parks&quot;</li>
          <li>• Try broader terms if you don&apos;t find specific results</li>
        </ul>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Search Feedback
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Loading search interface...
          </p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}