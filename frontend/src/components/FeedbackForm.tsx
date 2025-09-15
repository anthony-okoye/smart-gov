'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'

interface FeedbackFormProps {
  onSuccess?: (feedbackId: string) => void
  onError?: (error: string) => void
  className?: string
}

interface FormData {
  text: string
  category: string
}

interface FormErrors {
  text?: string
  general?: string
}

export default function FeedbackForm({ onSuccess, onError, className = '' }: FeedbackFormProps) {
  const [formData, setFormData] = useState<FormData>({
    text: '',
    category: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string>('')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate feedback text
    if (!formData.text.trim()) {
      newErrors.text = 'Feedback text is required'
    } else if (formData.text.trim().length < 10) {
      newErrors.text = 'Feedback must be at least 10 characters long'
    } else if (formData.text.trim().length > 2000) {
      newErrors.text = 'Feedback must be less than 2000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific errors when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await apiClient.submitFeedback(
        formData.text.trim(),
        formData.category || undefined
      )

      if (response.success && response.data?.id) {
        setIsSubmitted(true)
        setSubmittedId(response.data.id)
        onSuccess?.(response.data.id)
      } else {
        throw new Error(response.message || 'Failed to submit feedback')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setErrors({ general: errorMessage })
      onError?.(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearForm = () => {
    setFormData({ text: '', category: '' })
    setErrors({})
    setIsSubmitted(false)
    setSubmittedId('')
  }

  const handleSubmitAnother = () => {
    setIsSubmitted(false)
    setSubmittedId('')
    setFormData({ text: '', category: '' })
    setErrors({})
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success-100 dark:bg-success-900/20 mb-4">
            <svg className="h-6 w-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Thank you for your feedback!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your feedback has been successfully submitted and will be automatically categorized and analyzed.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Feedback ID: <span className="font-mono">{submittedId}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleSubmitAnother}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Submit Another Feedback
            </button>
            <a
              href="/dashboard"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors text-center"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General error message */}
        {errors.general && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-error-800 dark:text-error-200">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback text field */}
        <div>
          <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Feedback *
          </label>
          <textarea
            id="feedback-text"
            rows={6}
            value={formData.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            placeholder="Please share your feedback about government services, infrastructure, healthcare, safety, or any other concerns..."
            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none transition-colors ${
              errors.text 
                ? 'border-error-300 dark:border-error-600 focus:ring-error-500 focus:border-error-500' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={isSubmitting}
            required
          />
          {errors.text && (
            <p className="mt-2 text-sm text-error-600 dark:text-error-400">{errors.text}</p>
          )}
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {formData.text.length}/2000 characters • Minimum 10 characters required
          </p>
        </div>

        {/* Category field */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category (Optional)
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors"
            disabled={isSubmitting}
          >
            <option value="">Let AI categorize automatically</option>
            <option value="health">Health & Healthcare</option>
            <option value="infrastructure">Infrastructure & Transportation</option>
            <option value="safety">Safety & Security</option>
            <option value="other">Other</option>
          </select>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            If not selected, our AI will automatically categorize your feedback.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Privacy Notice
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Your feedback is anonymous and will be used to improve government services. 
                  It will be automatically analyzed for sentiment and categorized to help identify trends and areas for improvement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={handleClearForm}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.text.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}