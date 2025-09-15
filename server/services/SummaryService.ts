import { SummarizerAgent } from '../agents/SummarizerAgent.js';
import { SummaryCacheRepository } from '../repositories/SummaryCacheRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { SummarizationResult } from '../agents/types.js';

export class SummaryService {
  private summarizerAgent: SummarizerAgent;
  private cacheRepo: SummaryCacheRepository;
  private feedbackRepo: FeedbackRepository;

  constructor() {
    // Hugging Face API key is optional for free inference
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    this.summarizerAgent = new SummarizerAgent(apiKey, {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000 // Shorter timeout for free inference
    });
    
    this.cacheRepo = new SummaryCacheRepository();
    this.feedbackRepo = new FeedbackRepository();
  }

  /**
   * Gets summary insights, using cache when available or generating fresh insights
   */
  async getSummary(feedbackLimit: number = 100): Promise<SummarizationResult> {
    try {
      // Check if we have recent feedback to analyze
      const recentFeedbackCount = await this.feedbackRepo.count('processed = true');
      
      if (recentFeedbackCount === 0) {
        return {
          categoryInsights: [],
          emergingTrends: [],
          keyComplaints: [],
          recommendations: []
        };
      }

      // Try to get cached summary first
      const cacheKey = `summary_${feedbackLimit}`;
      const cachedSummary = await this.cacheRepo.getValid(cacheKey);
      
      if (cachedSummary) {
        return JSON.parse(cachedSummary.summary_data);
      }

      // Generate fresh summary if cache is stale or missing
      const summary = await this.summarizerAgent.summarize(feedbackLimit);
      
      return summary;
    } catch (error) {
      console.error('Error getting summary:', error);
      
      // Try to return last valid cached summary as fallback
      const fallbackCache = await this.cacheRepo.getByCacheKey(`summary_${feedbackLimit}`);
      if (fallbackCache) {
        console.log('Using fallback cached summary due to error');
        return JSON.parse(fallbackCache.summary_data);
      }
      
      // Return empty summary if all else fails
      return {
        categoryInsights: [],
        emergingTrends: [],
        keyComplaints: [],
        recommendations: []
      };
    }
  }

  /**
   * Forces a fresh summary generation, bypassing cache
   */
  async refreshSummary(feedbackLimit: number = 100): Promise<SummarizationResult> {
    try {
      // Invalidate existing cache
      const cacheKey = `summary_${feedbackLimit}`;
      await this.cacheRepo.deleteByCacheKey(cacheKey);
      
      // Generate fresh summary
      const summary = await this.summarizerAgent.summarize(feedbackLimit);
      
      return summary;
    } catch (error) {
      console.error('Error refreshing summary:', error);
      throw error;
    }
  }

  /**
   * Gets summary statistics
   */
  async getSummaryStats(): Promise<{
    totalFeedback: number;
    processedFeedback: number;
    cacheStats: any;
    lastSummaryUpdate?: Date;
  }> {
    try {
      const [totalFeedback, processedFeedback, cacheStats] = await Promise.all([
        this.feedbackRepo.count(),
        this.feedbackRepo.count('processed = true'),
        this.cacheRepo.getStats()
      ]);

      // Get last summary update time
      const recentCache = await this.cacheRepo.findMany(
        undefined,
        [],
        'created_at DESC',
        1
      );

      return {
        totalFeedback,
        processedFeedback,
        cacheStats,
        lastSummaryUpdate: recentCache.length > 0 ? recentCache[0].created_at : undefined
      };
    } catch (error) {
      console.error('Error getting summary stats:', error);
      throw error;
    }
  }

  /**
   * Checks if summary cache is stale and needs refresh
   */
  async isCacheStale(feedbackLimit: number = 100, maxAgeHours: number = 24): Promise<boolean> {
    try {
      const cacheKey = `summary_${feedbackLimit}`;
      const cachedSummary = await this.cacheRepo.getByCacheKey(cacheKey);
      
      if (!cachedSummary) {
        return true; // No cache exists
      }

      const now = new Date();
      const cacheAge = now.getTime() - cachedSummary.created_at.getTime();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      
      return cacheAge > maxAgeMs;
    } catch (error) {
      console.error('Error checking cache staleness:', error);
      return true; // Assume stale on error
    }
  }

  /**
   * Cleans up old cache entries
   */
  async cleanupCache(olderThanDays: number = 7): Promise<number> {
    try {
      return await this.cacheRepo.cleanup(olderThanDays);
    } catch (error) {
      console.error('Error cleaning up cache:', error);
      return 0;
    }
  }
}