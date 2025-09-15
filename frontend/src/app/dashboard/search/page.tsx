export default function SearchPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Search Feedback
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Use AI-powered search to find relevant feedback and insights
        </p>
      </div>

      {/* Search interface */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query
            </label>
            <div className="relative">
              <input
                type="text"
                id="search-query"
                placeholder="Enter your search query (e.g., 'road conditions', 'healthcare services')..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include sentiment analysis
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Show relevance scores
                </span>
              </label>
            </div>
            
            <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Search results */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Search Results
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No search performed
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter a search query above to find relevant feedback using AI-powered vector search.
            </p>
          </div>
        </div>
      </div>

      {/* Search tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          Search Tips
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Use natural language queries like "complaints about road conditions"</li>
          <li>• Search for specific topics like "healthcare access" or "public transportation"</li>
          <li>• Include sentiment keywords like "positive feedback about parks"</li>
          <li>• Try broader terms if you don't find specific results</li>
        </ul>
      </div>
    </div>
  )
}