import { Router, Request, Response, NextFunction } from 'express';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { FeedbackService } from '../services/FeedbackService.js';
import { FeedbackCreateInput } from '../types/database.js';
import { validateFeedbackInput, normalizeFeedbackInput } from '../validation/feedback.js';

const router = Router();
const feedbackRepository = new FeedbackRepository();
const feedbackService = new FeedbackService();

// POST /api/feedback - Submit new feedback
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, category } = req.body;

    // Basic input validation
    if (!text || (typeof text === 'string' && text.trim().length === 0)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Feedback text is required',
        details: ['text field is required']
      });
    }

    // Create feedback input object
    const feedbackInput: FeedbackCreateInput = {
      text: text.toString(),
      category: category || 'other'
    };

    // Validate and normalize input
    const { normalized, validation } = normalizeFeedbackInput(feedbackInput);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid feedback data',
        details: validation.errors
      });
    }

    // Create feedback and trigger async categorization
    const feedback = await feedbackService.createFeedback(normalized);

    // Return success response
    res.status(201).json({
      id: feedback.id,
      status: 'success',
      message: 'Feedback submitted successfully',
      data: {
        id: feedback.id,
        text: feedback.text,
        category: feedback.category,
        timestamp: feedback.timestamp,
        processed: feedback.processed
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message,
        details: []
      });
    }

    // Handle database errors
    if (error instanceof Error && (
      error.message.includes('connection') || 
      error.message.includes('database') ||
      error.message.includes('timeout')
    )) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database connection error. Please try again later.'
      });
    }

    // Pass other errors to global error handler
    next(error);
  }
});

// GET /api/feedback - Retrieve feedback with pagination and filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and validate query parameters
    const pageParam = req.query.page as string;
    const limitParam = req.query.limit as string;
    
    let page = 1;
    let limit = 50;
    
    // Parse and validate page parameter
    if (pageParam) {
      const parsedPage = parseInt(pageParam);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Page number must be greater than 0',
          details: ['page must be a positive integer']
        });
      }
      page = parsedPage;
    }
    
    // Parse and validate limit parameter
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Limit must be between 1 and 100',
          details: ['limit must be between 1 and 100']
        });
      }
      limit = parsedLimit;
    }
    
    const category = req.query.category as string;
    const sortBy = req.query.sortBy as string || 'timestamp';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Validate category if provided
    const validCategories = ['health', 'infrastructure', 'safety', 'other', 'all'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid category',
        details: [`category must be one of: ${validCategories.join(', ')}`]
      });
    }

    // Validate sort parameters
    const validSortFields = ['timestamp', 'category', 'sentiment'];
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid sort field',
        details: [`sortBy must be one of: ${validSortFields.join(', ')}`]
      });
    }

    const validSortOrders = ['asc', 'desc'];
    if (!validSortOrders.includes(sortOrder.toLowerCase())) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid sort order',
        details: [`sortOrder must be one of: ${validSortOrders.join(', ')}`]
      });
    }

    // Build order by clause
    const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

    // Get paginated feedback
    const result = await feedbackRepository.getPaginated(
      page,
      limit,
      category === 'all' ? undefined : category,
      orderBy
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(result.total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Return formatted response
    res.status(200).json({
      status: 'success',
      data: result.feedback,
      metadata: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      filters: {
        category: category || 'all',
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Error retrieving feedback:', error);
    
    // Handle database errors
    if (error instanceof Error && (
      error.message.includes('connection') || 
      error.message.includes('database') ||
      error.message.includes('timeout')
    )) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database connection error. Please try again later.'
      });
    }

    // Pass other errors to global error handler
    next(error);
  }
});

// GET /api/feedback/stats - Get processing statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await feedbackService.getProcessingStats();
    
    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error retrieving processing stats:', error);
    next(error);
  }
});

// POST /api/feedback/reprocess - Reprocess failed feedback
router.post('/reprocess', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.body.limit as string) || 10;
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Limit must be between 1 and 100',
        details: ['limit must be between 1 and 100']
      });
    }
    
    const reprocessedCount = await feedbackService.reprocessFailedFeedback(limit);
    
    res.status(200).json({
      status: 'success',
      message: `Reprocessed ${reprocessedCount} feedback items`,
      data: {
        reprocessedCount
      }
    });
  } catch (error) {
    console.error('Error reprocessing feedback:', error);
    next(error);
  }
});

export default router;