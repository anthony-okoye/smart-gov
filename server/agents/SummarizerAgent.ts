import { HfInference } from '@huggingface/inference';
import { SummarizationResult, CategoryInsight, Trend, AgentConfig } from './types.js';
import { Feedback } from '../types/database.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { SummaryCacheRepository } from '../repositories/SummaryCacheRepository.js';

// Custom error class for agent-specific errors
export class AgentError extends Error {
  public code: string;
  public retryable: boolean;

  constructor(message: string, code: string = 'AGENT_ERROR', retryable: boolean = true) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class SummarizerAgent {
  private hf: HfInference;
  private config: AgentConfig;
  private feedbackRepo: FeedbackRepository;
  private cacheRepo: SummaryCacheRepository;

  constructor(apiKey?: string, config: Partial<AgentConfig> = {}) {
    // Hugging Face API key is optional for free inference
    this.hf = new HfInference(apiKey);

    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 30000, // Shorter timeout for free inference
      ...config,
    };

    this.feedbackRepo = new FeedbackRepository();
    this.cacheRepo = new SummaryCacheRepository();
  }

  /**
   * Summarizes recent feedback and returns insights
   */
  async summarize(feedbackLimit: number = 100): Promise<SummarizationResult> {
    // Check cache first
    const cacheKey = `summary_${feedbackLimit}`;
    const cachedResult = await this.cacheRepo.getValid(cacheKey);
    
    if (cachedResult) {
      return JSON.parse(cachedResult.summary_data);
    }

    // Get recent processed feedback
    const recentFeedback = await this.feedbackRepo.getRecent(feedbackLimit);
    
    if (recentFeedback.length === 0) {
      const emptyResult: SummarizationResult = {
        categoryInsights: [],
        emergingTrends: [],
        keyComplaints: [],
        recommendations: []
      };
      
      // Cache empty result for shorter time
      await this.cacheRepo.set(cacheKey, emptyResult, undefined, 1);
      return emptyResult;
    }

    // Group feedback by category
    const groupedFeedback = this.groupFeedbackByCategory(recentFeedback);
    
    // Generate insights for each category
    const categoryInsights = await this.generateCategoryInsights(groupedFeedback);
    
    // Identify emerging trends across all feedback
    const emergingTrends = await this.identifyTrends(recentFeedback);
    
    // Extract key complaints
    const keyComplaints = await this.extractKeyComplaints(recentFeedback);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(categoryInsights, emergingTrends);

    const result: SummarizationResult = {
      categoryInsights,
      emergingTrends,
      keyComplaints,
      recommendations
    };

    // Cache the result for 24 hours
    await this.cacheRepo.set(cacheKey, result, undefined, 24);
    
    return result;
  }

  /**
   * Groups feedback by category
   */
  private groupFeedbackByCategory(feedback: Feedback[]): Record<string, Feedback[]> {
    return feedback.reduce((groups, item) => {
      const category = item.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, Feedback[]>);
  }

  /**
   * Generates insights for each category
   */
  private async generateCategoryInsights(groupedFeedback: Record<string, Feedback[]>): Promise<CategoryInsight[]> {
    const insights: CategoryInsight[] = [];

    for (const [category, feedbackItems] of Object.entries(groupedFeedback)) {
      if (feedbackItems.length === 0) continue;

      const averageSentiment = feedbackItems.reduce((sum, item) => sum + item.sentiment, 0) / feedbackItems.length;
      
      // Use AI to extract key issues and trends for this category
      const aiInsights = await this.executeWithRetry(async () => {
        const prompt = this.buildCategoryAnalysisPrompt(category, feedbackItems);
        
        const response = await this.hf.textGeneration({
          model: 'gpt2',
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.3,
            return_full_text: false,
          },
        });

        const content = response.generated_text;
        if (!content) {
          throw new AgentError('No response received from Hugging Face');
        }

        return this.parseCategoryInsightsResponse(content);
      });

      insights.push({
        category,
        count: feedbackItems.length,
        averageSentiment: Math.round(averageSentiment * 100) / 100,
        keyIssues: aiInsights.keyIssues || [],
        trends: aiInsights.trends || []
      });
    }

    return insights;
  }

  /**
   * Identifies emerging trends across all feedback
   */
  private async identifyTrends(feedback: Feedback[]): Promise<Trend[]> {
    if (feedback.length < 10) {
      return []; // Not enough data for trend analysis
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildTrendAnalysisPrompt(feedback);
      
      const response = await this.hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 600,
          temperature: 0.3,
          return_full_text: false,
        },
      });

      const content = response.generated_text;
      if (!content) {
        throw new AgentError('No response received from Hugging Face');
      }

      return this.parseTrendsResponse(content);
    });
  }

  /**
   * Extracts key complaints from feedback
   */
  private async extractKeyComplaints(feedback: Feedback[]): Promise<string[]> {
    // Focus on negative feedback for complaints
    const negativeFeedback = feedback.filter(item => item.sentiment < -0.3);
    
    if (negativeFeedback.length === 0) {
      return [];
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildComplaintsExtractionPrompt(negativeFeedback);
      
      const response = await this.hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.2,
          return_full_text: false,
        },
      });

      const content = response.generated_text;
      if (!content) {
        throw new AgentError('No response received from Hugging Face');
      }

      return this.parseComplaintsResponse(content);
    });
  }

  /**
   * Generates recommendations based on insights and trends
   */
  private async generateRecommendations(insights: CategoryInsight[], trends: Trend[]): Promise<string[]> {
    if (insights.length === 0 && trends.length === 0) {
      return [];
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildRecommendationsPrompt(insights, trends);
      
      const response = await this.hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.4,
          return_full_text: false,
        },
      });

      const content = response.generated_text;
      if (!content) {
        throw new AgentError('No response received from Hugging Face');
      }

      return this.parseRecommendationsResponse(content);
    });
  }

  /**
   * Builds prompt for category analysis
   */
  private buildCategoryAnalysisPrompt(category: string, feedback: Feedback[]): string {
    const feedbackTexts = feedback.slice(0, 15).map(item => `"${item.text}"`).join('\n');
    
    return `<|system|>You are an AI assistant that analyzes citizen feedback for government services. You must respond with valid JSON only.<|endoftext|>
<|user|>Analyze the following ${category} feedback and identify key issues and trends.

Category: ${category}
Number of feedback items: ${feedback.length}
Sample feedback:
${feedbackTexts}

Identify:
1. Key issues (3-5 main problems mentioned)
2. Trends (2-3 patterns or recurring themes)

Respond with JSON in this exact format:
{
  "keyIssues": ["issue1", "issue2", "issue3"],
  "trends": ["trend1", "trend2"]
}<|endoftext|>
<|assistant|>`;
  }

  /**
   * Builds prompt for trend analysis
   */
  private buildTrendAnalysisPrompt(feedback: Feedback[]): string {
    // Group feedback by time periods and analyze changes
    const recentFeedback = feedback.slice(0, 20);
    const olderFeedback = feedback.slice(20, 40);
    
    const recentTexts = recentFeedback.map(item => item.text).join(' ');
    const olderTexts = olderFeedback.map(item => item.text).join(' ');
    
    return `<|system|>You are an AI assistant that identifies trends in citizen feedback. You must respond with valid JSON only.<|endoftext|>
<|user|>Identify emerging trends by comparing recent vs older feedback.

Recent feedback (${recentFeedback.length} items):
${recentTexts.substring(0, 800)}

Older feedback (${olderFeedback.length} items):
${olderTexts.substring(0, 800)}

Respond with JSON in this exact format:
{
  "trends": [
    {
      "topic": "topic name",
      "frequency": 5,
      "sentimentChange": -0.2,
      "timeframe": "recent"
    }
  ]
}<|endoftext|>
<|assistant|>`;
  }

  /**
   * Builds prompt for complaints extraction
   */
  private buildComplaintsExtractionPrompt(feedback: Feedback[]): string {
    const complaintsText = feedback.slice(0, 15).map(item => item.text).join('\n');
    
    return `<|system|>You are an AI assistant that extracts key complaints from citizen feedback. You must respond with valid JSON only.<|endoftext|>
<|user|>Extract the top 5 key complaints from this negative feedback.

Negative feedback:
${complaintsText}

Extract specific, actionable complaints that government officials should address.

Respond with JSON in this exact format:
{
  "complaints": [
    "complaint1",
    "complaint2",
    "complaint3"
  ]
}<|endoftext|>
<|assistant|>`;
  }

  /**
   * Builds prompt for recommendations
   */
  private buildRecommendationsPrompt(insights: CategoryInsight[], trends: Trend[]): string {
    const insightsText = insights.map(insight => 
      `${insight.category}: ${insight.keyIssues.join(', ')}`
    ).join('\n');
    
    const trendsText = trends.map(trend => 
      `${trend.topic} (frequency: ${trend.frequency})`
    ).join('\n');
    
    return `<|system|>You are an AI assistant that generates actionable recommendations for government officials based on citizen feedback analysis. You must respond with valid JSON only.<|endoftext|>
<|user|>Generate actionable recommendations for government officials based on this analysis.

Category Insights:
${insightsText}

Emerging Trends:
${trendsText}

Generate 3-5 specific, actionable recommendations that address the most critical issues.

Respond with JSON in this exact format:
{
  "recommendations": [
    "recommendation1",
    "recommendation2",
    "recommendation3"
  ]
}<|endoftext|>
<|assistant|>`;
  }

  /**
   * Parses category insights response
   */
  private parseCategoryInsightsResponse(content: string): { keyIssues: string[]; trends: string[] } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues.slice(0, 5) : [],
        trends: Array.isArray(parsed.trends) ? parsed.trends.slice(0, 3) : []
      };
    } catch (error) {
      return { keyIssues: [], trends: [] };
    }
  }

  /**
   * Parses trends response
   */
  private parseTrendsResponse(content: string): Trend[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed.trends)) {
        return [];
      }

      return parsed.trends.slice(0, 5).map((trend: any) => ({
        topic: trend.topic || 'Unknown',
        frequency: Math.max(1, Math.min(10, trend.frequency || 1)),
        sentimentChange: Math.max(-1, Math.min(1, trend.sentimentChange || 0)),
        timeframe: trend.timeframe || 'recent'
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Parses complaints response
   */
  private parseComplaintsResponse(content: string): string[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return Array.isArray(parsed.complaints) ? parsed.complaints.slice(0, 5) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Parses recommendations response
   */
  private parseRecommendationsResponse(content: string): string[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Executes a function with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
          )
        ]);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof AgentError && !error.retryable) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new AgentError(`Failed after ${this.config.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Invalidates cache for fresh analysis
   */
  async invalidateCache(): Promise<void> {
    // Delete cache entries that start with 'summary_'
    // Since we don't have a direct method, we'll use deleteByCacheKey for known keys
    // or implement a more specific method
    const cacheKeys = ['summary_50', 'summary_100', 'summary_200'];
    for (const key of cacheKeys) {
      await this.cacheRepo.deleteByCacheKey(key);
    }
  }

  /**
   * Gets cache statistics
   */
  async getCacheStats(): Promise<any> {
    return await this.cacheRepo.getStats();
  }
}