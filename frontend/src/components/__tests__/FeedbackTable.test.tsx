import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import FeedbackTable from '../FeedbackTable'
import { apiClient } from '@/lib/api'
import { Feedback, PaginatedResponse } from '@/types'

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    getFeedback: jest.fn(),
  },
}))

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

// Mock data
const mockFeedback: Feedback[] = [
  {
    id: '1',
    text: 'The road near my house has a big pothole that needs fixing.',
    category: 'infrastructure',
    sentiment: -0.3,
    confidence: 0.85,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    processed: true,
  },
  {
    id: '2',
    text: 'Great job on the new park! My kids love playing there.',
    category: 'other',
    sentiment: 0.8,
    confidence: 0.92,
    timestamp: new Date('2024-01-14T14:20:00Z'),
    processed: true,
  },
  {
    id: '3',
    text: 'The hospital wait times are getting longer. We need more staff.',
    category: 'health',
    sentiment: -0.6,
    confidence: 0.78,
    timestamp: new Date('2024-01-13T09:15:00Z'),
    processed: false,
  },
]

const mockPaginatedResponse: PaginatedResponse<Feedback> = {
  data: mockFeedback,
  total: 3,
  page: 1,
  limit: 50,
  totalPages: 1,
}

describe('FeedbackTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockApiClient.getFeedback.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<FeedbackTable />)
    
    expect(screen.getByText('Loading feedback...')).toBeInTheDocument()
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
  })

  it('renders feedback data correctly', async () => {
    mockApiClient.getFeedback.mockResolvedValue(mockPaginatedResponse)
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('3 total submissions')).toBeInTheDocument()
    })

    // Check if feedback items are rendered
    expect(screen.getByText('The road near my house has a big pothole that needs fixing.')).toBeInTheDocument()
    expect(screen.getByText('Great job on the new park! My kids love playing there.')).toBeInTheDocument()
    expect(screen.getByText('The hospital wait times are getting longer. We need more staff.')).toBeInTheDocument()

    // Check categories
    expect(screen.getByText('Infrastructure & Transportation')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getByText('Health & Healthcare')).toBeInTheDocument()

    // Check sentiment labels
    expect(screen.getByText('Negative')).toBeInTheDocument()
    expect(screen.getByText('Positive')).toBeInTheDocument()
  })

  it('handles empty state correctly', async () => {
    mockApiClient.getFeedback.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    })
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('No feedback found')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Feedback submissions will appear here once citizens start providing input.')).toBeInTheDocument()
  })

  it('handles error state correctly', async () => {
    const errorMessage = 'Failed to load feedback'
    mockApiClient.getFeedback.mockRejectedValue(new Error(errorMessage))
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading feedback')).toBeInTheDocument()
    })
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('retries loading when try again button is clicked', async () => {
    mockApiClient.getFeedback
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockPaginatedResponse)
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading feedback')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Try Again'))
    
    await waitFor(() => {
      expect(screen.getByText('3 total submissions')).toBeInTheDocument()
    })
  })

  it('filters by category correctly', async () => {
    mockApiClient.getFeedback.mockResolvedValue(mockPaginatedResponse)
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('3 total submissions')).toBeInTheDocument()
    })

    // Change category filter
    const categorySelect = screen.getByDisplayValue('All Categories')
    fireEvent.change(categorySelect, { target: { value: 'health' } })
    
    await waitFor(() => {
      expect(mockApiClient.getFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'health',
          page: 1,
          limit: 50,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        })
      )
    })
  })

  it('sorts columns correctly', async () => {
    mockApiClient.getFeedback.mockResolvedValue(mockPaginatedResponse)
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('3 total submissions')).toBeInTheDocument()
    })

    // Click on category column header to sort
    const categoryHeader = screen.getByText('Category').closest('th')
    fireEvent.click(categoryHeader!)
    
    await waitFor(() => {
      expect(mockApiClient.getFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'category',
          sortOrder: 'asc',
        })
      )
    })

    // Click again to reverse sort
    fireEvent.click(categoryHeader!)
    
    await waitFor(() => {
      expect(mockApiClient.getFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'category',
          sortOrder: 'desc',
        })
      )
    })
  })

  it('handles pagination correctly', async () => {
    const multiPageResponse: PaginatedResponse<Feedback> = {
      data: mockFeedback,
      total: 150,
      page: 1,
      limit: 50,
      totalPages: 3,
    }
    
    mockApiClient.getFeedback.mockResolvedValue(multiPageResponse)
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('150 total submissions')).toBeInTheDocument()
    })

    // Check pagination info
    expect(screen.getByText('Showing 1 to 50 of 150 results')).toBeInTheDocument()
    
    // Check page numbers
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // Click next page
    const nextButton = screen.getByLabelText('Next')
    fireEvent.click(nextButton)
    
    await waitFor(() => {
      expect(mockApiClient.getFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      )
    })
  })

  it('calls onFeedbackSelect when feedback is clicked', async () => {
    const mockOnFeedbackSelect = jest.fn()
    mockApiClient.getFeedback.mockResolvedValue(mockPaginatedResponse)
    
    render(<FeedbackTable onFeedbackSelect={mockOnFeedbackSelect} />)
    
    await waitFor(() => {
      expect(screen.getByText('3 total submissions')).toBeInTheDocument()
    })

    // Click on a feedback row
    const feedbackRow = screen.getByText('The road near my house has a big pothole that needs fixing.').closest('tr')
    fireEvent.click(feedbackRow!)
    
    expect(mockOnFeedbackSelect).toHaveBeenCalledWith(mockFeedback[0])
  })

  it('calls onFeedbackSelect when View button is clicked', async () => {
    const mockOnFeedbackSelect = jest.fn()
    mockApiClient.getFeedback.mockResolvedValue(mockPaginatedResponse)
    
    render(<FeedbackTable onFeedbackSelect={mockOnFeedbackSelect} />)
    
    await waitFor(() => {
      expect(screen.getByText('3 total submissions')).toBeInTheDocument()
    })

    // Click on View button
    const viewButtons = screen.getAllByText('View')
    fireEvent.click(viewButtons[0])
    
    expect(mockOnFeedbackSelect).toHaveBeenCalledWith(mockFeedback[0])
  })

  it('truncates long feedback text correctly', async () => {
    const longFeedbackResponse: PaginatedResponse<Feedback> = {
      data: [{
        id: '1',
        text: 'This is a very long feedback text that should be truncated when displayed in the table because it exceeds the maximum length limit that we have set for the table display to ensure good user experience and readability.',
        category: 'other',
        sentiment: 0.0,
        confidence: 0.5,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        processed: true,
      }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    }
    
    mockApiClient.getFeedback.mockResolvedValue(longFeedbackResponse)
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('1 total submissions')).toBeInTheDocument()
    })

    // Check that text is truncated
    expect(screen.getByText(/This is a very long feedback text that should be truncated when displayed in the table because it exceeds the maximum length limit that we have set for the table display to ensure good user experience and readability\.\.\./)).toBeInTheDocument()
    expect(screen.getByText('Click to view full text')).toBeInTheDocument()
  })

  it('displays correct sentiment colors and labels', async () => {
    mockApiClient.getFeedback.mockResolvedValue(mockPaginatedResponse)
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('3 total submissions')).toBeInTheDocument()
    })

    // Check sentiment scores are displayed
    expect(screen.getByText('Score: -0.30')).toBeInTheDocument()
    expect(screen.getByText('Score: 0.80')).toBeInTheDocument()
    expect(screen.getByText('Score: -0.60')).toBeInTheDocument()
  })

  it('applies initial category filter correctly', async () => {
    mockApiClient.getFeedback.mockResolvedValue(mockPaginatedResponse)
    
    render(<FeedbackTable initialCategory="health" />)
    
    await waitFor(() => {
      expect(mockApiClient.getFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'health',
        })
      )
    })
  })

  it('shows correct empty state message when category filter has no results', async () => {
    mockApiClient.getFeedback.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    })
    
    render(<FeedbackTable initialCategory="safety" />)
    
    await waitFor(() => {
      expect(screen.getByText('No feedback found for the selected category.')).toBeInTheDocument()
    })
  })

  it('handles mobile pagination correctly', async () => {
    const multiPageResponse: PaginatedResponse<Feedback> = {
      data: mockFeedback,
      total: 150,
      page: 2,
      limit: 50,
      totalPages: 3,
    }
    
    mockApiClient.getFeedback.mockResolvedValue(multiPageResponse)
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    render(<FeedbackTable />)
    
    await waitFor(() => {
      expect(screen.getByText('150 total submissions')).toBeInTheDocument()
    })

    // Mobile pagination should show Previous/Next buttons
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })
})