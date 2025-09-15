'use client'

import FeedbackForm from '@/components/FeedbackForm'

export default function FeedbackSubmissionPage() {
  const handleSuccess = (feedbackId: string) => {
    console.log('Feedback submitted successfully:', feedbackId)
  }

  const handleError = (error: string) => {
    console.error('Feedback submission error:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Submit Your Feedback
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Help us improve government services by sharing your thoughts and experiences
          </p>
        </div>

        {/* Feedback form */}
        <FeedbackForm 
          onSuccess={handleSuccess}
          onError={handleError}
        />

        {/* Additional info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Want to see how your feedback is being used?{' '}
            <a href="/dashboard" className="text-primary-600 hover:text-primary-500">
              View the public dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}