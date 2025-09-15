import { CategorizerAgent, AgentError } from '../agents/CategorizerAgent.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { AgentLogRepository } from '../repositories/AgentLogRepository.js';
import { Feedback, FeedbackCreateInput } from '../types/database.js';

export class FeedbackService {
  private feedbackRepository: FeedbackRepository;
  private agentLogRepository: AgentLogRepository;
  private categorizerAgent: CategorizerAgent | null = null;

  constructor() {
    this.feedbackRepository = new FeedbackRepository();
    this.agentLogRepository = new AgentLogRepository();
    
    // Initialize categorizer agent if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.categorizerAgent = new CategorizerAgent(apiKey);
    }
  }

  /**
   * Creates feedback and triggers asynchronous categorization
   */
  async createFeedback(feedbackInput: FeedbackCreateInput): Promise<Feedback> {
    // Create feedback in database first
    const feedback = await this.feedbackRepository.create(feedbackInput);

    // Trigger asynchronous categorization (don't await to avoid blocking)
    this.processFeedbackAsync(feedback.id, feedback.text).catch(error => {
      console.error(`Failed to process feedback ${feedback.id}:`, error);
    });

    return feedback;
  }

  /**
   * Processes feedback asynchronously with categorization
   */
  private async processFeedbackAsync(feedbackId: string, text: string): Promise<void> {
    // Create agent log entry
    const log = await this.agentLogRepository.create({
      agent_type: 'categorizer',
      feedback_id: feedbackId,
      status: 'pending'
    });
    const logId = log.id;

    const startTime = Date.now();

    try {
      // Update log to processing
      await this.agentLogRepository.updateStatus(logId, 'processing');

      // Attempt categorization
      const result = await this.categorizeWithFallback(text);

      // Update feedback with categorization results
      await this.feedbackRepository.markAsProcessed(
        feedbackId,
        result.category,
        result.sentiment,
        result.confidence
      );

      // Update log to completed
      const processingTime = Date.now() - startTime;
      await this.agentLogRepository.updateStatus(logId, 'completed', undefined, processingTime);

      console.log(`Successfully processed feedback ${feedbackId} in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update log to failed
      await this.agentLogRepository.updateStatus(logId, 'failed', errorMessage, processingTime);

      // Apply fallback categorization
      await this.applyFallbackCategorization(feedbackId);

      console.error(`Failed to process feedback ${feedbackId}:`, errorMessage);
    }
  }

  /**
   * Attempts categorization with the AI agent, with fallback handling
   */
  private async categorizeWithFallback(text: string) {
    if (!this.categorizerAgent) {
      throw new Error('Categorizer agent not available - OpenAI API key not configured');
    }

    try {
      return await this.categorizerAgent.categorize(text);
    } catch (error) {
      if (error instanceof AgentError) {
        throw error;
      }
      throw new AgentError(`Categorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Applies fallback categorization when AI processing fails
   */
  private async applyFallbackCategorization(feedbackId: string): Promise<void> {
    try {
      // Apply default values as fallback
      await this.feedbackRepository.markAsProcessed(
        feedbackId,
        'other', // Default category
        0,       // Neutral sentiment
        0.1      // Low confidence
      );

      console.log(`Applied fallback categorization for feedback ${feedbackId}`);
    } catch (error) {
      console.error(`Failed to apply fallback categorization for feedback ${feedbackId}:`, error);
    }
  }

  /**
   * Reprocesses failed feedback items
   */
  async reprocessFailedFeedback(limit: number = 10): Promise<number> {
    try {
      // Get failed agent logs
      const failedLogs = await this.agentLogRepository.getFailedLogs('categorizer', limit);
      let reprocessedCount = 0;

      for (const log of failedLogs) {
        if (log.feedback_id) {
          try {
            // Get the feedback text
            const feedback = await this.feedbackRepository.getById(log.feedback_id);
            if (feedback && !feedback.processed) {
              // Retry processing
              await this.processFeedbackAsync(feedback.id, feedback.text);
              reprocessedCount++;
            }
          } catch (error) {
            console.error(`Failed to reprocess feedback ${log.feedback_id}:`, error);
          }
        }
      }

      return reprocessedCount;
    } catch (error) {
      console.error('Failed to reprocess failed feedback:', error);
      return 0;
    }
  }

  /**
   * Gets processing statistics
   */
  async getProcessingStats() {
    try {
      const [totalFeedback, processedFeedback, pendingLogs, failedLogs] = await Promise.all([
        this.feedbackRepository.count(),
        this.feedbackRepository.count('processed = TRUE'),
        this.agentLogRepository.count('agent_type = ? AND status = ?', ['categorizer', 'pending']),
        this.agentLogRepository.count('agent_type = ? AND status = ?', ['categorizer', 'failed'])
      ]);

      return {
        total: totalFeedback,
        processed: processedFeedback,
        unprocessed: totalFeedback - processedFeedback,
        pending: pendingLogs,
        failed: failedLogs,
        processingRate: totalFeedback > 0 ? (processedFeedback / totalFeedback) * 100 : 0
      };
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        total: 0,
        processed: 0,
        unprocessed: 0,
        pending: 0,
        failed: 0,
        processingRate: 0
      };
    }
  }
}