import express from 'express';
import { SearchService } from '../services/SearchService.js';

const router = express.Router();
const searchService = new SearchService();

/**
 * POST /api/search
 * Perform semantic search on feedback
 */
router.post('/', async (req, res) => {
  try {
    const { query, limit, threshold, useHybrid, textWeight, vectorWeight } = req.body;

    // Validate required parameters
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter is required and must be a string'
      });
    }

    if (query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query cannot be empty'
      });
    }

    // Validate optional parameters
    const options: any = {};
    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < 1 || limit > 100) {
        return res.status(400).json({
          error: 'Limit must be a number between 1 and 100'
        });
      }
      options.limit = limit;
    }

    if (threshold !== undefined) {
      if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        return res.status(400).json({
          error: 'Threshold must be a number between 0 and 1'
        });
      }
      options.threshold = threshold;
    }

    if (useHybrid !== undefined) {
      if (typeof useHybrid !== 'boolean') {
        return res.status(400).json({
          error: 'useHybrid must be a boolean'
        });
      }
      options.useHybrid = useHybrid;
    }

    if (textWeight !== undefined) {
      if (typeof textWeight !== 'number' || textWeight < 0 || textWeight > 1) {
        return res.status(400).json({
          error: 'textWeight must be a number between 0 and 1'
        });
      }
      options.textWeight = textWeight;
    }

    if (vectorWeight !== undefined) {
      if (typeof vectorWeight !== 'number' || vectorWeight < 0 || vectorWeight > 1) {
        return res.status(400).json({
          error: 'vectorWeight must be a number between 0 and 1'
        });
      }
      options.vectorWeight = vectorWeight;
    }

    // Perform search
    const searchResults = await searchService.search(query.trim(), options);

    res.json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({
      error: 'Internal server error during search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions based on partial query
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Query parameter "q" is required and must be a string'
      });
    }

    const suggestionLimit = limit ? parseInt(limit as string) : 5;
    if (isNaN(suggestionLimit) || suggestionLimit < 1 || suggestionLimit > 20) {
      return res.status(400).json({
        error: 'Limit must be a number between 1 and 20'
      });
    }

    const suggestions = await searchService.getSearchSuggestions(q.trim(), suggestionLimit);

    res.json({
      success: true,
      data: {
        query: q.trim(),
        suggestions
      }
    });
  } catch (error) {
    console.error('Error in search suggestions endpoint:', error);
    res.status(500).json({
      error: 'Internal server error getting search suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/search/similar/:feedbackId
 * Find similar feedback to a given feedback item
 */
router.get('/similar/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { limit } = req.query;

    if (!feedbackId) {
      return res.status(400).json({
        error: 'Feedback ID is required'
      });
    }

    const similarLimit = limit ? parseInt(limit as string) : 10;
    if (isNaN(similarLimit) || similarLimit < 1 || similarLimit > 50) {
      return res.status(400).json({
        error: 'Limit must be a number between 1 and 50'
      });
    }

    const similarFeedback = await searchService.findSimilar(feedbackId, similarLimit);

    res.json({
      success: true,
      data: {
        feedbackId,
        similar: similarFeedback,
        count: similarFeedback.length
      }
    });
  } catch (error) {
    console.error('Error in similar feedback endpoint:', error);
    
    if (error instanceof Error && error.message === 'Feedback not found') {
      return res.status(404).json({
        error: 'Feedback not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error finding similar feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/search/generate-embeddings
 * Generate embeddings for feedback without embeddings
 */
router.post('/generate-embeddings', async (req, res) => {
  try {
    const { batchSize } = req.body;

    const processingBatchSize = batchSize && typeof batchSize === 'number' ? batchSize : 50;
    if (processingBatchSize < 1 || processingBatchSize > 200) {
      return res.status(400).json({
        error: 'Batch size must be between 1 and 200'
      });
    }

    const result = await searchService.generateMissingEmbeddings(processingBatchSize);

    res.json({
      success: true,
      data: {
        processed: result.processed,
        errors: result.errors,
        batchSize: processingBatchSize
      }
    });
  } catch (error) {
    console.error('Error in generate embeddings endpoint:', error);
    res.status(500).json({
      error: 'Internal server error generating embeddings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/search/analytics
 * Get search analytics and embedding coverage
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await searchService.getSearchAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error in search analytics endpoint:', error);
    res.status(500).json({
      error: 'Internal server error getting search analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;