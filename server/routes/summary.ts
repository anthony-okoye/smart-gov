import { Router, Request, Response, NextFunction } from 'express';
import { SummaryService } from '../services/SummaryService.js';

const router = Router();

// Lazy initialization of summary service to handle missing API keys gracefully
let summaryService: SummaryService | null = null;

const getSummaryService = (): SummaryService => {
  if (!summaryService) {
    summaryService = new SummaryService();
  }
  return summaryService;
};

// GET /api/summary - Get cached insights or generate fresh summary
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse query parameters
    const limitParam = req.query.limit as string;
    const refreshParam = req.query.refresh as string;
    
    let limit = 100; // Default limit
    const forceRefresh = refreshParam === 'true';
    
    // Validate limit parameter
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 10 || parsedLimit > 500) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Limit must be between 10 and 500',
          details: ['limit must be between 10 and 500']
        });
      }
      limit = parsedLimit;
    }

    // Get summary (fresh or cached)
    const service = getSummaryService();
    const summary = forceRefresh 
      ? await service.refreshSummary(limit)
      : await service.getSummary(limit);

    // Check if we have any data
    const hasData = summary.categoryInsights.length > 0 || 
                   summary.emergingTrends.length > 0 || 
                   summary.keyComplaints.length > 0;

    if (!hasData) {
      return res.status(200).json({
        status: 'success',
        message: 'No feedback data available for analysis',
        data: {
          categoryInsights: [],
          emergingTrends: [],
          keyComplaints: [],
          recommendations: [],
          metadata: {
            feedbackAnalyzed: 0,
            lastUpdated: new Date().toISOString(),
            cacheUsed: false
          }
        }
      });
    }

    // Get cache status for metadata
    const isStale = await service.isCacheStale(limit);
    const cacheUsed = !forceRefresh && !isStale;

    // Return successful response with summary data
    res.status(200).json({
      status: 'success',
      data: {
        categoryInsights: summary.categoryInsights,
        emergingTrends: summary.emergingTrends,
        keyComplaints: summary.keyComplaints,
        recommendations: summary.recommendations,
        metadata: {
          feedbackAnalyzed: limit,
          lastUpdated: new Date().toISOString(),
          cacheUsed,
          totalCategories: summary.categoryInsights.length,
          totalTrends: summary.emergingTrends.length,
          totalComplaints: summary.keyComplaints.length,
          totalRecommendations: summary.recommendations.length
        }
      }
    });

  } catch (error) {
    console.error('Error in summary endpoint:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Handle Hugging Face API errors
      if (error.message.includes('Hugging Face') || error.message.includes('inference')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'AI service is currently unavailable. Please try again later.'
        });
      }
      
      // Handle database errors
      if (error.message.includes('connection') || 
          error.message.includes('database') ||
          error.message.includes('timeout')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Database connection error. Please try again later.'
        });
      }
    }

    // Pass other errors to global error handler
    next(error);
  }
});

// GET /api/summary/stats - Get summary statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getSummaryService().getSummaryStats();
    
    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error getting summary stats:', error);
    next(error);
  }
});

// POST /api/summary/refresh - Force refresh summary cache
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limitParam = req.body.limit as string;
    let limit = 100;
    
    // Validate limit parameter
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 10 || parsedLimit > 500) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Limit must be between 10 and 500',
          details: ['limit must be between 10 and 500']
        });
      }
      limit = parsedLimit;
    }

    // Force refresh summary
    const summary = await getSummaryService().refreshSummary(limit);
    
    res.status(200).json({
      status: 'success',
      message: 'Summary refreshed successfully',
      data: {
        categoryInsights: summary.categoryInsights,
        emergingTrends: summary.emergingTrends,
        keyComplaints: summary.keyComplaints,
        recommendations: summary.recommendations,
        metadata: {
          feedbackAnalyzed: limit,
          refreshedAt: new Date().toISOString(),
          totalCategories: summary.categoryInsights.length,
          totalTrends: summary.emergingTrends.length,
          totalComplaints: summary.keyComplaints.length,
          totalRecommendations: summary.recommendations.length
        }
      }
    });
  } catch (error) {
    console.error('Error refreshing summary:', error);
    next(error);
  }
});

// DELETE /api/summary/cache - Clean up old cache entries
router.delete('/cache', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const daysParam = req.query.days as string;
    let days = 7; // Default to 7 days
    
    if (daysParam) {
      const parsedDays = parseInt(daysParam);
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Days must be between 1 and 365',
          details: ['days must be between 1 and 365']
        });
      }
      days = parsedDays;
    }

    const deletedCount = await getSummaryService().cleanupCache(days);
    
    res.status(200).json({
      status: 'success',
      message: `Cleaned up ${deletedCount} old cache entries`,
      data: {
        deletedCount,
        olderThanDays: days
      }
    });
  } catch (error) {
    console.error('Error cleaning up cache:', error);
    next(error);
  }
});

export default router;