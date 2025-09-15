import { Router, Request, Response, NextFunction } from 'express';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { FeedbackCreateInput } from '../types/database.js';
import { validateFeedbackInput, normalizeFeedbackInput } from '../validation/feedback.js';

const router = Router();
const feedbackRepository = new FeedbackRepository();

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

    // Create feedback in database
    const feedback = await feedbackRepository.create(normalized);

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

export default router;