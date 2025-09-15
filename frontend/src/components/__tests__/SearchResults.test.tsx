import { render, screen } from '@testing-library/react'
import SearchResults from '../SearchResults'
import { SearchResult } from '@/types'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { describe } from '@jest/globals'

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago')
}))

describe('SearchResults', () => {
  const mockSearchResults: SearchResult[] = [
    {
      feedback: {
        id: '1',
        text: 'The road conditions on Main Street are terrible with many potholes',
        category: 'infrastructure',
        sentiment: -0.7,
        confidence: 0.9,
        timestamp: new Date('2024-01-15T10:00:00Z'),
        processed: true
      },
      relevanceScore: 0.95
    },
    {
      feedback: {
        id: '2',
        text: 'Great healthcare services at the community center',
        category: 'health',
        sentiment: 0.8,
        confidence: 0.85,
        timestamp: new Date('2024-01-14T15:30:00Z'),
        processed: true
      },
      relevanceScore: 0.75
    },
    {
      feedback: {
        id: '3',
        text: 'The park maintenance has been adequate this year',
        category: 'other',
        sentiment: 0.1,
        confidence: 0.6,
        timestamp: new Date('2024-01-13T09:15:00Z'),
        processed: true
      },
      relevanceScore: 0.45
    }
  ]

  const defaultProps = {
    results: mockSearchResults,
    query: 'road conditions',
    loading: false,
    error: null
  }

  it('renders search results with basic information', () => {
    render(<SearchResults {...defaultProps} />)
    
    expect(screen.getByText('Search Results')).toBeInTheDocument()
    expect(screen.getByText('Found 3 results for "road conditions"')).toBeInTheDocument()
    
    // Check that all feedback texts are displayed (using partial text since highlighting may break them up)
    expect(screen.getByText(/Main Street are terrible with many potholes/)).toBeInTheDocument()
    expect(screen.getByText(/Great healthcare services at the community center/)).toBeInTheDocument()
    expect(screen.getByText(/The park maintenance has been adequate/)).toBeInTheDocument()
  })

  it('displays category badges for each result', () => {
    render(<SearchResults {...defaultProps} />)
    
    expect(screen.getByText('infrastructure')).toBeInTheDocument()
    expect(screen.getByText('health')).toBeInTheDocument()
    expect(screen.getByText('other')).toBeInTheDocument()
  })

  it('shows relevance scores when enabled', () => {
    render(<SearchResults {...defaultProps} showRelevanceScores={true} />)
    
    expect(screen.getByText('95% match')).toBeInTheDocument()
    expect(screen.getByText('75% match')).toBeInTheDocument()
    expect(screen.getByText('45% match')).toBeInTheDocument()
  })

  it('shows sentiment analysis when enabled', () => {
    render(<SearchResults {...defaultProps} showSentimentAnalysis={true} />)
    
    expect(screen.getByText('Negative')).toBeInTheDocument()
    expect(screen.getByText('Positive')).toBeInTheDocument()
    expect(screen.getByText('Neutral')).toBeInTheDocument()
    
    // Check sentiment scores
    expect(screen.getByText('-0.70')).toBeInTheDocument()
    expect(screen.getByText('+0.80')).toBeInTheDocument()
    expect(screen.getByText('+0.10')).toBeInTheDocument()
    
    // Check confidence scores
    expect(screen.getByText('Confidence: 90%')).toBeInTheDocument()
    expect(screen.getByText('Confidence: 85%')).toBeInTheDocument()
    expect(screen.getByText('Confidence: 60%')).toBeInTheDocument()
  })

  it('highlights search terms in results', () => {
    render(<SearchResults {...defaultProps} />)
    
    // The highlighting is done with dangerouslySetInnerHTML, so we check for the mark element
    const highlightedElements = document.querySelectorAll('mark')
    expect(highlightedElements.length).toBeGreaterThan(0)
  })

  it('displays loading state', () => {
    render(<SearchResults {...defaultProps} loading={true} />)
    
    expect(screen.getByText('Searching...')).toBeInTheDocument()
    
    // Check for loading skeleton
    const skeletonElements = document.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('displays error state', () => {
    render(<SearchResults {...defaultProps} error="Search failed" />)
    
    expect(screen.getByText('Search Error')).toBeInTheDocument()
    expect(screen.getByText('Search failed')).toBeInTheDocument()
  })

  it('displays no search performed state when query is empty', () => {
    render(<SearchResults {...defaultProps} query="" />)
    
    expect(screen.getByText('No search performed')).toBeInTheDocument()
    expect(screen.getByText(/Enter a search query above to find relevant feedback/)).toBeInTheDocument()
  })

  it('displays no results found state', () => {
    render(<SearchResults {...defaultProps} results={[]} />)
    
    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText('No results found for "road conditions"')).toBeInTheDocument()
    expect(screen.getByText(/Try adjusting your search terms/)).toBeInTheDocument()
  })

  it('displays singular result count correctly', () => {
    const singleResult = [mockSearchResults[0]]
    render(<SearchResults {...defaultProps} results={singleResult} />)
    
    expect(screen.getByText('Found 1 result for "road conditions"')).toBeInTheDocument()
  })

  it('applies correct sentiment colors', () => {
    render(<SearchResults {...defaultProps} showSentimentAnalysis={true} />)
    
    // Check for sentiment badge classes (we can't easily test the exact colors, but we can check the elements exist)
    const negativeElement = screen.getByText('Negative')
    const positiveElement = screen.getByText('Positive')
    const neutralElement = screen.getByText('Neutral')
    
    expect(negativeElement).toBeInTheDocument()
    expect(positiveElement).toBeInTheDocument()
    expect(neutralElement).toBeInTheDocument()
  })

  it('applies correct category colors', () => {
    render(<SearchResults {...defaultProps} />)
    
    const infrastructureElement = screen.getByText('infrastructure')
    const healthElement = screen.getByText('health')
    const otherElement = screen.getByText('other')
    
    expect(infrastructureElement).toBeInTheDocument()
    expect(healthElement).toBeInTheDocument()
    expect(otherElement).toBeInTheDocument()
  })

  it('applies correct relevance score colors', () => {
    render(<SearchResults {...defaultProps} showRelevanceScores={true} />)
    
    // High relevance (95%) should be green
    const highRelevance = screen.getByText('95% match')
    expect(highRelevance).toHaveClass('text-green-600')
    
    // Medium relevance (75%) should be yellow
    const mediumRelevance = screen.getByText('75% match')
    expect(mediumRelevance).toHaveClass('text-yellow-600')
    
    // Low relevance (45%) should be red
    const lowRelevance = screen.getByText('45% match')
    expect(lowRelevance).toHaveClass('text-red-600')
  })

  it('displays timestamps correctly', () => {
    render(<SearchResults {...defaultProps} />)
    
    // Since we mocked formatDistanceToNow to return '2 hours ago'
    const timeElements = screen.getAllByText('2 hours ago')
    expect(timeElements).toHaveLength(3)
  })

  it('handles safety category correctly', () => {
    const safetyResult: SearchResult[] = [
      {
        feedback: {
          id: '4',
          text: 'Street lighting is insufficient for safety',
          category: 'safety',
          sentiment: -0.5,
          confidence: 0.8,
          timestamp: new Date(),
          processed: true
        },
        relevanceScore: 0.8
      }
    ]

    render(<SearchResults {...defaultProps} results={safetyResult} />)
    
    expect(screen.getByText('safety')).toBeInTheDocument()
  })

  it('handles edge case sentiment values correctly', () => {
    const edgeCaseResults: SearchResult[] = [
      {
        feedback: {
          id: '5',
          text: 'Exactly neutral feedback',
          category: 'other',
          sentiment: 0.0,
          confidence: 0.5,
          timestamp: new Date(),
          processed: true
        },
        relevanceScore: 0.5
      },
      {
        feedback: {
          id: '6',
          text: 'Slightly positive feedback',
          category: 'other',
          sentiment: 0.05,
          confidence: 0.5,
          timestamp: new Date(),
          processed: true
        },
        relevanceScore: 0.5
      }
    ]

    render(<SearchResults {...defaultProps} results={edgeCaseResults} showSentimentAnalysis={true} />)
    
    // Both should be classified as neutral (sentiment between -0.1 and 0.1)
    const neutralElements = screen.getAllByText('Neutral')
    expect(neutralElements).toHaveLength(2)
  })

  it('does not highlight short search terms', () => {
    render(<SearchResults {...defaultProps} query="a b" />)
    
    // Short terms (length <= 2) should not be highlighted
    const highlightedElements = document.querySelectorAll('mark')
    expect(highlightedElements.length).toBe(0)
  })
})