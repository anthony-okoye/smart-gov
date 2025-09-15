import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import FeedbackForm from '../FeedbackForm'
import { apiClient } from '@/lib/api'

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    submitFeedback: jest.fn(),
  },
}))

const mockSubmitFeedback = jest.mocked(apiClient.submitFeedback)

describe('FeedbackForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form elements correctly', () => {
    render(<FeedbackForm />)
    
    // Check form elements are present
    expect(screen.getByLabelText(/Your Feedback/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument()
    expect(screen.getByText('Clear Form')).toBeInTheDocument()
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument()
    
    // Check privacy notice
    expect(screen.getByText('Privacy Notice')).toBeInTheDocument()
    expect(screen.getByText(/Your feedback is anonymous/)).toBeInTheDocument()
  })

  it('shows character count and validation message', () => {
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    
    // Initial state
    expect(screen.getByText('0/2000 characters • Minimum 10 characters required')).toBeInTheDocument()
    
    // Type some text
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(screen.getByText('5/2000 characters • Minimum 10 characters required')).toBeInTheDocument()
  })

  it('validates minimum text length', async () => {
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Try to submit with short text
    fireEvent.change(textarea, { target: { value: 'Short' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Feedback must be at least 10 characters long')).toBeInTheDocument()
    })
    
    expect(mockSubmitFeedback).not.toHaveBeenCalled()
  })

  it('validates maximum text length', async () => {
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Try to submit with text that's too long
    const longText = 'a'.repeat(2001)
    fireEvent.change(textarea, { target: { value: longText } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Feedback must be less than 2000 characters')).toBeInTheDocument()
    })
    
    expect(mockSubmitFeedback).not.toHaveBeenCalled()
  })

  it('validates required text field', async () => {
    render(<FeedbackForm />)
    
    const submitButton = screen.getByText('Submit Feedback')
    
    // Try to submit without text
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Feedback text is required')).toBeInTheDocument()
    })
    
    expect(mockSubmitFeedback).not.toHaveBeenCalled()
  })

  it('clears field errors when user starts typing', async () => {
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Trigger validation error
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Feedback text is required')).toBeInTheDocument()
    })
    
    // Start typing to clear error
    fireEvent.change(textarea, { target: { value: 'This is valid feedback text' } })
    
    expect(screen.queryByText('Feedback text is required')).not.toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const mockOnSuccess = jest.fn()
    const mockResponse = {
      success: true,
      data: { id: 'feedback-123' },
    }
    
    mockSubmitFeedback.mockResolvedValue(mockResponse)
    
    render(<FeedbackForm onSuccess={mockOnSuccess} />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const categorySelect = screen.getByLabelText(/Category/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill form
    fireEvent.change(textarea, { target: { value: 'This is a valid feedback message' } })
    fireEvent.change(categorySelect, { target: { value: 'health' } })
    
    // Submit form
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith(
        'This is a valid feedback message',
        'health'
      )
    })
    
    expect(mockOnSuccess).toHaveBeenCalledWith('feedback-123')
  })

  it('submits form without category (auto-categorize)', async () => {
    const mockResponse = {
      success: true,
      data: { id: 'feedback-456' },
    }
    
    mockSubmitFeedback.mockResolvedValue(mockResponse)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill form without category
    fireEvent.change(textarea, { target: { value: 'This feedback will be auto-categorized' } })
    
    // Submit form
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith(
        'This feedback will be auto-categorized',
        undefined
      )
    })
  })

  it('shows loading state during submission', async () => {
    let resolveSubmission: (value: { success: boolean; data: { id: string } }) => void
    const submissionPromise = new Promise((resolve) => {
      resolveSubmission = resolve
    })
    
    mockSubmitFeedback.mockReturnValue(submissionPromise)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill and submit form
    fireEvent.change(textarea, { target: { value: 'This is a valid feedback message' } })
    fireEvent.click(submitButton)
    
    // Check loading state
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    expect(textarea).toBeDisabled()
    
    // Resolve submission
    resolveSubmission!({
      success: true,
      data: { id: 'feedback-789' },
    })
    
    await waitFor(() => {
      expect(screen.queryByText('Submitting...')).not.toBeInTheDocument()
    })
  })

  it('handles submission error', async () => {
    const mockOnError = jest.fn()
    const errorMessage = 'Network error occurred'
    
    mockSubmitFeedback.mockRejectedValue(new Error(errorMessage))
    
    render(<FeedbackForm onError={mockOnError} />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill and submit form
    fireEvent.change(textarea, { target: { value: 'This is a valid feedback message' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
    
    expect(mockOnError).toHaveBeenCalledWith(errorMessage)
  })

  it('handles API response error', async () => {
    const mockResponse = {
      success: false,
      message: 'Server validation failed',
    }
    
    mockSubmitFeedback.mockResolvedValue(mockResponse)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill and submit form
    fireEvent.change(textarea, { target: { value: 'This is a valid feedback message' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Server validation failed')).toBeInTheDocument()
    })
  })

  it('shows success state after submission', async () => {
    const mockResponse = {
      success: true,
      data: { id: 'feedback-success' },
    }
    
    mockSubmitFeedback.mockResolvedValue(mockResponse)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill and submit form
    fireEvent.change(textarea, { target: { value: 'This is a valid feedback message' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument()
    })
    
    expect(screen.getByText(/Your feedback has been successfully submitted/)).toBeInTheDocument()
    expect(screen.getByText('feedback-success')).toBeInTheDocument()
    expect(screen.getByText('Submit Another Feedback')).toBeInTheDocument()
    expect(screen.getByText('View Dashboard')).toBeInTheDocument()
  })

  it('allows submitting another feedback after success', async () => {
    const mockResponse = {
      success: true,
      data: { id: 'feedback-success' },
    }
    
    mockSubmitFeedback.mockResolvedValue(mockResponse)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill and submit form
    fireEvent.change(textarea, { target: { value: 'This is a valid feedback message' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument()
    })
    
    // Click submit another
    fireEvent.click(screen.getByText('Submit Another Feedback'))
    
    // Should return to form
    expect(screen.getByLabelText(/Your Feedback/)).toBeInTheDocument()
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument()
    
    // Form should be cleared
    expect(screen.getByLabelText(/Your Feedback/)).toHaveValue('')
  })

  it('clears form when clear button is clicked', () => {
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const categorySelect = screen.getByLabelText(/Category/)
    const clearButton = screen.getByText('Clear Form')
    
    // Fill form
    fireEvent.change(textarea, { target: { value: 'Some feedback text' } })
    fireEvent.change(categorySelect, { target: { value: 'health' } })
    
    // Clear form
    fireEvent.click(clearButton)
    
    // Check form is cleared
    expect(textarea).toHaveValue('')
    expect(categorySelect).toHaveValue('')
  })

  it('disables submit button when text is empty', () => {
    render(<FeedbackForm />)
    
    const submitButton = screen.getByText('Submit Feedback')
    
    // Initially disabled
    expect(submitButton).toBeDisabled()
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    
    // Add text
    fireEvent.change(textarea, { target: { value: 'Some text' } })
    expect(submitButton).not.toBeDisabled()
    
    // Remove text
    fireEvent.change(textarea, { target: { value: '' } })
    expect(submitButton).toBeDisabled()
    
    // Add whitespace only
    fireEvent.change(textarea, { target: { value: '   ' } })
    expect(submitButton).toBeDisabled()
  })

  it('trims whitespace from feedback text before submission', async () => {
    const mockResponse = {
      success: true,
      data: { id: 'feedback-trimmed' },
    }
    
    mockSubmitFeedback.mockResolvedValue(mockResponse)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    // Fill form with text that has leading/trailing whitespace
    fireEvent.change(textarea, { target: { value: '   This feedback has whitespace   ' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith(
        'This feedback has whitespace',
        undefined
      )
    })
  })

  it('applies custom className', () => {
    const { container } = render(<FeedbackForm className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has responsive design classes', () => {
    render(<FeedbackForm />)
    
    // Check for responsive button layout
    const buttonContainer = screen.getByText('Clear Form').parentElement
    expect(buttonContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row')
    
    // Check for responsive spacing
    expect(buttonContainer).toHaveClass('space-y-3', 'sm:space-y-0', 'sm:space-x-4')
  })

  it('shows correct category options', () => {
    render(<FeedbackForm />)
    
    // Check all options are present
    expect(screen.getByText('Let AI categorize automatically')).toBeInTheDocument()
    expect(screen.getByText('Health & Healthcare')).toBeInTheDocument()
    expect(screen.getByText('Infrastructure & Transportation')).toBeInTheDocument()
    expect(screen.getByText('Safety & Security')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('handles unexpected API response format', async () => {
    const mockResponse = {
      success: true,
      // Missing data.id
    }
    
    mockSubmitFeedback.mockResolvedValue(mockResponse)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    fireEvent.change(textarea, { target: { value: 'Valid feedback text' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to submit feedback')).toBeInTheDocument()
    })
  })

  it('shows loading spinner in submit button', async () => {
    let resolveSubmission: (value: { success: boolean; data: { id: string } }) => void
    const submissionPromise = new Promise((resolve) => {
      resolveSubmission = resolve
    })
    
    mockSubmitFeedback.mockReturnValue(submissionPromise)
    
    render(<FeedbackForm />)
    
    const textarea = screen.getByLabelText(/Your Feedback/)
    const submitButton = screen.getByText('Submit Feedback')
    
    fireEvent.change(textarea, { target: { value: 'Valid feedback text' } })
    fireEvent.click(submitButton)
    
    // Check for loading spinner
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
    
    // Check spinner SVG is present
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    
    resolveSubmission!({
      success: true,
      data: { id: 'test-id' },
    })
    
    await waitFor(() => {
      expect(screen.queryByText('Submitting...')).not.toBeInTheDocument()
    })
  })
})