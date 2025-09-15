import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBar from '../SearchBar'
import { apiClient } from '@/lib/api'
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
import { it } from '@jest/globals'
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
import { it } from '@jest/globals'
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
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { expect } from '@jest/globals'
import { it } from '@jest/globals'
import { afterEach } from '@jest/globals'
import { beforeEach } from '@jest/globals'
import { describe } from '@jest/globals'

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    searchFeedback: jest.fn()
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('SearchBar', () => {
  const mockOnSearchResults = jest.fn()
  const mockOnLoading = jest.fn()
  const mockOnError = jest.fn()

  const defaultProps = {
    onSearchResults: mockOnSearchResults,
    onLoading: mockOnLoading,
    onError: mockOnError
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('renders with default placeholder', () => {
    render(<SearchBar {...defaultProps} />)
    
    expect(screen.getByPlaceholderText('Search feedback...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<SearchBar {...defaultProps} placeholder="Custom placeholder" />)
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('shows search icon initially', () => {
    render(<SearchBar {...defaultProps} />)
    
    const searchIcon = screen.getByRole('textbox').parentElement?.querySelector('svg')
    expect(searchIcon).toBeInTheDocument()
  })

  it('shows clear button when there is text', async () => {
    const user = userEvent.setup()
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test query')
    
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'test query')
    
    const clearButton = screen.getByRole('button')
    await user.click(clearButton)
    
    expect(input.value).toBe('')
    expect(mockOnSearchResults).toHaveBeenCalledWith([], '')
  })

  it('performs debounced search', async () => {
    jest.useFakeTimers()
    const mockSearchResponse = {
      results: [
        {
          feedback: {
            id: '1',
            text: 'Test feedback',
            category: 'health' as const,
            sentiment: 0.5,
            confidence: 0.8,
            timestamp: new Date(),
            processed: true
          },
          relevanceScore: 0.9
        }
      ],
      totalResults: 1
    }

    ;(apiClient.searchFeedback as jest.Mock).mockResolvedValue(mockSearchResponse)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test query')
    
    // Fast-forward time to trigger debounced search
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(apiClient.searchFeedback).toHaveBeenCalledWith('test query', 50)
    })

    expect(mockOnSearchResults).toHaveBeenCalledWith(mockSearchResponse.results, 'test query')
    
    jest.useRealTimers()
  })

  it('shows loading state during search', async () => {
    jest.useFakeTimers()
    
    // Mock a delayed API response
    ;(apiClient.searchFeedback as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test query')
    
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(mockOnLoading).toHaveBeenCalledWith(true)
    })
    
    jest.useRealTimers()
  })

  it('handles search errors', async () => {
    jest.useFakeTimers()
    const mockError = new Error('Search failed')
    ;(apiClient.searchFeedback as jest.Mock).mockRejectedValue(mockError)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test query')
    
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Search failed. Please try again.')
    })

    expect(mockOnSearchResults).toHaveBeenCalledWith([], 'test query')
    
    jest.useRealTimers()
  })

  it('shows suggestions on focus', async () => {
    const mockHistory = JSON.stringify([
      { query: 'previous search', timestamp: new Date(), resultCount: 5 }
    ])
    mockLocalStorage.getItem.mockReturnValue(mockHistory)

    const user = userEvent.setup()
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.click(input)
    
    await waitFor(() => {
      expect(screen.getByText('previous search')).toBeInTheDocument()
    })
  })

  it('filters suggestions based on input', async () => {
    const mockHistory = JSON.stringify([
      { query: 'road conditions', timestamp: new Date(), resultCount: 5 },
      { query: 'healthcare services', timestamp: new Date(), resultCount: 3 }
    ])
    mockLocalStorage.getItem.mockReturnValue(mockHistory)

    const user = userEvent.setup()
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'road')
    await user.click(input)
    
    await waitFor(() => {
      expect(screen.getByText('road conditions')).toBeInTheDocument()
      expect(screen.queryByText('healthcare services')).not.toBeInTheDocument()
    })
  })

  it('selects suggestion when clicked', async () => {
    jest.useFakeTimers()
    const mockHistory = JSON.stringify([
      { query: 'road conditions', timestamp: new Date(), resultCount: 5 }
    ])
    mockLocalStorage.getItem.mockReturnValue(mockHistory)

    const mockSearchResponse = {
      results: [],
      totalResults: 0
    }
    ;(apiClient.searchFeedback as jest.Mock).mockResolvedValue(mockSearchResponse)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.click(input)
    
    await waitFor(() => {
      expect(screen.getByText('road conditions')).toBeInTheDocument()
    })

    const suggestion = screen.getByText('road conditions')
    await user.click(suggestion)
    
    expect(input.value).toBe('road conditions')
    
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(apiClient.searchFeedback).toHaveBeenCalledWith('road conditions', 50)
    })
    
    jest.useRealTimers()
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    
    // Test Escape key
    await user.type(input, 'test')
    await user.keyboard('{Escape}')
    
    // Should close suggestions (tested by checking focus)
    expect(input).not.toHaveFocus()
  })

  it('handles Enter key to trigger search', async () => {
    jest.useFakeTimers()
    const mockSearchResponse = {
      results: [],
      totalResults: 0
    }
    ;(apiClient.searchFeedback as jest.Mock).mockResolvedValue(mockSearchResponse)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test query')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(apiClient.searchFeedback).toHaveBeenCalledWith('test query', 50)
    })
    
    jest.useRealTimers()
  })

  it('saves search history after successful search', async () => {
    jest.useFakeTimers()
    const mockSearchResponse = {
      results: [
        {
          feedback: {
            id: '1',
            text: 'Test feedback',
            category: 'health' as const,
            sentiment: 0.5,
            confidence: 0.8,
            timestamp: new Date(),
            processed: true
          },
          relevanceScore: 0.9
        }
      ],
      totalResults: 1
    }

    ;(apiClient.searchFeedback as jest.Mock).mockResolvedValue(mockSearchResponse)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test query')
    
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'searchHistory',
        expect.stringContaining('test query')
      )
    })
    
    jest.useRealTimers()
  })

  it('does not search for empty queries', async () => {
    jest.useFakeTimers()
    
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, '   ') // Only whitespace
    
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(apiClient.searchFeedback).not.toHaveBeenCalled()
    expect(mockOnSearchResults).toHaveBeenCalledWith([], '')
    
    jest.useRealTimers()
  })

  it('applies custom className', () => {
    render(<SearchBar {...defaultProps} className="custom-class" />)
    
    const container = screen.getByRole('textbox').closest('.custom-class')
    expect(container).toBeInTheDocument()
  })
})