export default function FeedbackSubmissionPage() {
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <form className="space-y-6">
            <div>
              <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Feedback *
              </label>
              <textarea
                id="feedback-text"
                rows={6}
                placeholder="Please share your feedback about government services, infrastructure, healthcare, safety, or any other concerns..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                required
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Minimum 10 characters required. Your feedback will be automatically categorized and analyzed.
              </p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category (Optional)
              </label>
              <select
                id="category"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
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

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          </form>
        </div>

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