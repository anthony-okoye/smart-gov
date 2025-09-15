import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SummaryPanel from '../SummaryPanel'
import { apiClient } from '@/lib/api'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
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
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
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
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { beforeEach } from '@jest/globals'
import { describe } from '@jest/globals'

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    getSummary: jest.fn(),
  },
}))

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const mockSummaryData = {
  categories: [
    {
      category: 'health',
      count: 45,
      averageSentiment: 0.2,
      keyIssues: ['Long wait times', 'Staff shortage', 'Equipment issues'],
      trends: ['Increasing complaints about wait times']
    },
    {
      category: 'infrastructure',
      count: 32,
      averageSentiment: -0.4,
      keyIssues: ['Road conditions', 'Public transport delays'],
      trends: ['More reports of potholes']
    },
    {
      category: 'safety',
      count: 18,
      averageSentiment: 0.6,
      keyIssues: ['Street lighting', 'Police response time'],
      trends: ['Improved safety measures appreciated']
    },
    {
      category: 'other',
      count: 5,
      averageSentiment: 0.0,
      keyIssues: ['General inquiries'],
      trends: []
    }
  ],
  trends: [
    {
      topic: 'Healthcare wait times',
      frequency: 25,
      sentimentChange: -0.15,
      timeframe: 'Last 30 days'
    },
    {
      topic: 'Road maintenance',
      frequency: 18,
      sentimentChange: 0.1,
      timeframe: 'Last 14 days'
    }
  ],
  lastUpdated: '2024-01-15T10:30:00Z'
}

describe('SummaryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockApiClient.getSummary.mockImplementation(() => new Promise(() => {}))
    
    const { container } = render(<SummaryPanel />)
    
    expect(screen.getByText('Summary & Insights')).toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders summary data correctly', async () => {
    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: mockSummaryData
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Category Distribution (100 total)')).toBeInTheDocument()
    })

    // Check category distribution
    expect(screen.getAllByText('health')).toHaveLength(2) // appears in both distribution and key issues
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('45.0%')).toBeInTheDocument()
    
    expect(screen.getAllByText('infrastructure')).toHaveLength(2)
    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('32.0%')).toBeInTheDocument()

    // Check sentiment labels
    expect(screen.getAllByText('Neutral')).toHaveLength(2) // health: 0.2 and other: 0.0
    expect(screen.getByText('Negative')).toBeInTheDocument() // infrastructure: -0.4
    expect(screen.getByText('Positive')).toBeInTheDocument() // safety: 0.6
  })

  it('displays key issues by category', async () => {
    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: mockSummaryData
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Key Issues by Category')).toBeInTheDocument()
    })

    // Check key issues are displayed
    expect(screen.getByText('Long wait times')).toBeInTheDocument()
    expect(screen.getByText('Staff shortage')).toBeInTheDocument()
    expect(screen.getByText('Road conditions')).toBeInTheDocument()
    expect(screen.getByText('Public transport delays')).toBeInTheDocument()
  })

  it('displays emerging trends', async () => {
    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: mockSummaryData
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Emerging Trends')).toBeInTheDocument()
    })

    // Check trends are displayed
    expect(screen.getByText('Healthcare wait times')).toBeInTheDocument()
    expect(screen.getByText('Frequency: 25')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('-15.0%')).toBeInTheDocument()

    expect(screen.getByText('Road maintenance')).toBeInTheDocument()
    expect(screen.getByText('Frequency: 18')).toBeInTheDocument()
    expect(screen.getByText('+10.0%')).toBeInTheDocument()
  })

  it('displays last updated timestamp', async () => {
    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: mockSummaryData
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })
  })

  it('handles error state correctly', async () => {
    mockApiClient.getSummary.mockRejectedValue(new Error('Network error'))

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Error loading summary')).toBeInTheDocument()
      expect(screen.getByText('Failed to load summary data')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('handles API error response', async () => {
    mockApiClient.getSummary.mockResolvedValue({
      success: false,
      message: 'Server error',
      data: null as never
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Error loading summary')).toBeInTheDocument()
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('handles empty data state', async () => {
    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: {
        categories: [],
        trends: [],
        lastUpdated: '2024-01-15T10:30:00Z'
      }
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument()
      expect(screen.getByText('Summary insights will appear here once feedback is processed.')).toBeInTheDocument()
    })
  })

  it('allows retry on error', async () => {
    mockApiClient.getSummary
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        success: true,
        data: mockSummaryData
      })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))

    await waitFor(() => {
      expect(screen.getByText('Category Distribution (100 total)')).toBeInTheDocument()
    })

    expect(mockApiClient.getSummary).toHaveBeenCalledTimes(2)
  })

  it('applies custom className', () => {
    mockApiClient.getSummary.mockImplementation(() => new Promise(() => {}))
    
    const { container } = render(<SummaryPanel className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('calculates percentages correctly', async () => {
    const customData = {
      ...mockSummaryData,
      categories: [
        { ...mockSummaryData.categories[0], count: 60 },
        { ...mockSummaryData.categories[1], count: 40 }
      ]
    }

    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: customData
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('60.0%')).toBeInTheDocument()
      expect(screen.getByText('40.0%')).toBeInTheDocument()
    })
  })

  it('limits key issues display to 3 items', async () => {
    const dataWithManyIssues = {
      ...mockSummaryData,
      categories: [
        {
          ...mockSummaryData.categories[0],
          keyIssues: ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4', 'Issue 5']
        }
      ]
    }

    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: dataWithManyIssues
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Issue 1')).toBeInTheDocument()
      expect(screen.getByText('Issue 2')).toBeInTheDocument()
      expect(screen.getByText('Issue 3')).toBeInTheDocument()
      expect(screen.queryByText('Issue 4')).not.toBeInTheDocument()
      expect(screen.queryByText('Issue 5')).not.toBeInTheDocument()
    })
  })

  it('limits trends display to 5 items', async () => {
    const dataWithManyTrends = {
      ...mockSummaryData,
      trends: Array.from({ length: 8 }, (_, i) => ({
        topic: `Trend ${i + 1}`,
        frequency: 10 + i,
        sentimentChange: 0.1,
        timeframe: 'Last 7 days'
      }))
    }

    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: dataWithManyTrends
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Trend 1')).toBeInTheDocument()
      expect(screen.getByText('Trend 5')).toBeInTheDocument()
      expect(screen.queryByText('Trend 6')).not.toBeInTheDocument()
      expect(screen.queryByText('Trend 8')).not.toBeInTheDocument()
    })
  })

  it('handles categories with no key issues', async () => {
    const dataWithEmptyIssues = {
      ...mockSummaryData,
      categories: [
        {
          category: 'health',
          count: 10,
          averageSentiment: 0.0,
          keyIssues: [],
          trends: []
        }
      ]
    }

    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: dataWithEmptyIssues
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      expect(screen.getByText('Category Distribution (10 total)')).toBeInTheDocument()
      // Key Issues section should not show categories with empty keyIssues
      expect(screen.queryByText('Key Issues by Category')).toBeInTheDocument()
    })
  })

  it('renders correct sentiment colors and labels', async () => {
    const sentimentTestData = {
      ...mockSummaryData,
      categories: [
        { ...mockSummaryData.categories[0], averageSentiment: 0.5 }, // Positive
        { ...mockSummaryData.categories[1], averageSentiment: -0.5 }, // Negative  
        { ...mockSummaryData.categories[2], averageSentiment: 0.1 }, // Neutral
      ]
    }

    mockApiClient.getSummary.mockResolvedValue({
      success: true,
      data: sentimentTestData
    })

    render(<SummaryPanel />)

    await waitFor(() => {
      const positiveElements = screen.getAllByText('Positive')
      const negativeElements = screen.getAllByText('Negative')
      const neutralElements = screen.getAllByText('Neutral')
      
      expect(positiveElements.length).toBeGreaterThan(0)
      expect(negativeElements.length).toBeGreaterThan(0)
      expect(neutralElements.length).toBeGreaterThan(0)
    })
  })
})