'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { SearchResult } from '@/types'
import { apiClient } from '@/lib/api'

interface SearchBarProps {
  onSearchResults: (results: SearchResult[], query: string) => void
  onLoading: (loading: boolean) => void
  onError: (error: string | null) => void
  placeholder?: string
  className?: string
  initialQuery?: string
}

interface SearchHistory {
  query: string
  timestamp: Date
  resultCount: number
}

export default function SearchBar({
  onSearchResults,
  onLoading,
  onError,
  placeholder = "Search feedback...",
  className = "",
  initialQuery = ""
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load search history from localStorage on mount and handle initial query
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory).map((item: { query: string; timestamp: string; resultCount: number }) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
        setSearchHistory(parsed)
      } catch (error) {
        console.error('Failed to parse search history:', error)
      }
    }
  }, [])

  // Update query when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // Save search history to localStorage
  const saveSearchHistory = useCallback((newHistory: SearchHistory[]) => {
    localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    setSearchHistory(newHistory)
  }, [])

  // Add search to history
  const addToHistory = useCallback((searchQuery: string, resultCount: number) => {
    const newEntry: SearchHistory = {
      query: searchQuery,
      timestamp: new Date(),
      resultCount
    }
    
    const updatedHistory = [
      newEntry,
      ...searchHistory.filter(item => item.query !== searchQuery)
    ].slice(0, 10) // Keep only last 10 searches
    
    saveSearchHistory(updatedHistory)
  }, [searchHistory, saveSearchHistory])

  // Generate suggestions based on search history and common queries
  const generateSuggestions = useCallback((currentQuery: string) => {
    if (!currentQuery.trim()) {
      // Show recent searches when no query
      return searchHistory.slice(0, 5).map(item => item.query)
    }

    const commonQueries = [
      'road conditions',
      'healthcare services',
      'public transportation',
      'waste management',
      'water quality',
      'noise complaints',
      'park maintenance',
      'street lighting',
      'building permits',
      'tax services'
    ]

    const historySuggestions = searchHistory
      .filter(item => item.query.toLowerCase().includes(currentQuery.toLowerCase()))
      .map(item => item.query)

    const commonSuggestions = commonQueries
      .filter(query => query.toLowerCase().includes(currentQuery.toLowerCase()))

    const allSuggestions = [...new Set([...historySuggestions, ...commonSuggestions])]
    return allSuggestions.slice(0, 5)
  }, [searchHistory])

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onSearchResults([], '')
      return
    }

    setIsSearching(true)
    onLoading(true)
    onError(null)

    try {
      const response = await apiClient.searchFeedback(searchQuery, 50)
      onSearchResults(response.results, searchQuery)
      addToHistory(searchQuery, response.totalResults)
    } catch (error) {
      console.error('Search failed:', error)
      onError('Search failed. Please try again.')
      onSearchResults([], searchQuery)
    } finally {
      setIsSearching(false)
      onLoading(false)
    }
  }, [onSearchResults, onLoading, onError, addToHistory])

  // Handle input change with debouncing
  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    setSuggestions(generateSuggestions(value))

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedSearch(value)
    }, 300) // 300ms debounce delay
  }, [debouncedSearch, generateSuggestions])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    debouncedSearch(suggestion)
  }, [debouncedSearch])

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true)
    setSuggestions(generateSuggestions(query))
  }, [query, generateSuggestions])

  // Handle input blur (with delay to allow suggestion clicks)
  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      searchInputRef.current?.blur()
    } else if (e.key === 'Enter') {
      setShowSuggestions(false)
      debouncedSearch(query)
    }
  }, [query, debouncedSearch])

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    onSearchResults([], '')
    searchInputRef.current?.focus()
  }, [onSearchResults])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
        />
        
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg 
            className={`h-5 w-5 ${isSearching ? 'animate-spin text-primary-500' : 'text-gray-400'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isSearching ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            )}
          </svg>
        </div>

        {/* Clear button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-center">
                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-900 dark:text-white">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}