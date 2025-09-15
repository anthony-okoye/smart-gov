'use client'

import { useState, useEffect } from 'react'
import { CategorySummary, Trend } from '@/types'
import { apiClient } from '@/lib/api'

interface SummaryData {
  categories: CategorySummary[]
  trends: Trend[]
  lastUpdated: string
}

interface SummaryPanelProps {
  className?: string
}

export default function SummaryPanel({ className = '' }: SummaryPanelProps) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSummaryData()
  }, [])

  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getSummary()
      
      if (response.success && response.data) {
        setSummaryData(response.data)
      } else {
        setError(response.message || 'Failed to fetch summary data')
      }
    } catch (err) {
      setError('Failed to load summary data')
      console.error('Error fetching summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0.3) return 'text-success-600'
    if (sentiment < -0.3) return 'text-error-600'
    return 'text-warning-600'
  }

  const getSentimentLabel = (sentiment: number): string => {
    if (sentiment > 0.3) return 'Positive'
    if (sentiment < -0.3) return 'Negative'
    return 'Neutral'
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'health':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      case 'infrastructure':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'safety':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Summary & Insights
          </h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Summary & Insights
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Error loading summary
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {error}
            </p>
            <button
              onClick={fetchSummaryData}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!summaryData || summaryData.categories.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Summary & Insights
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No data available
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Summary insights will appear here once feedback is processed.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const totalFeedback = summaryData.categories.reduce((sum, cat) => sum + cat.count, 0)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Summary & Insights
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date(summaryData.lastUpdated).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Category Distribution */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Category Distribution ({totalFeedback} total)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryData.categories.map((category) => {
              const percentage = totalFeedback > 0 ? (category.count / totalFeedback) * 100 : 0
              return (
                <div
                  key={category.category}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center mb-2">
                    <div className="text-gray-600 dark:text-gray-400 mr-2">
                      {getCategoryIcon(category.category)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {category.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {category.count}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      Avg sentiment:
                    </span>
                    <span className={`text-xs font-medium ${getSentimentColor(category.averageSentiment)}`}>
                      {getSentimentLabel(category.averageSentiment)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key Issues by Category */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Key Issues by Category
          </h3>
          <div className="space-y-4">
            {summaryData.categories
              .filter(cat => cat.keyIssues.length > 0)
              .map((category) => (
                <div
                  key={category.category}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="flex items-center mb-3">
                    <div className="text-gray-600 dark:text-gray-400 mr-2">
                      {getCategoryIcon(category.category)}
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {category.category}
                    </h4>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {category.count} items
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {category.keyIssues.slice(0, 3).map((issue, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                        <span className="text-primary-500 mr-2">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>

        {/* Emerging Trends */}
        {summaryData.trends.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Emerging Trends
            </h3>
            <div className="space-y-3">
              {summaryData.trends.slice(0, 5).map((trend, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {trend.topic}
                    </span>
                    <div className="flex items-center mt-1 space-x-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Frequency: {trend.frequency}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {trend.timeframe}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {trend.sentimentChange > 0 ? (
                      <svg className="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                      </svg>
                    ) : trend.sentimentChange < 0 ? (
                      <svg className="w-4 h-4 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                      </svg>
                    )}
                    <span className={`ml-1 text-xs font-medium ${
                      trend.sentimentChange > 0 ? 'text-success-600' :
                      trend.sentimentChange < 0 ? 'text-error-600' : 'text-gray-500'
                    }`}>
                      {trend.sentimentChange > 0 ? '+' : ''}{(trend.sentimentChange * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}