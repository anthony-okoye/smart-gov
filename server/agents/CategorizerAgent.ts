import OpenAI from 'openai';
import { CategorizationResult, AgentError, AgentConfig } from './types.js';

export class CategorizerAgent {
  private openai: OpenAI;
  private config: AgentConfig;

  constructor(apiKey: string, config: Partial<AgentConfig> = {}) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });

    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 30000,
      ...config,
    };
  }

  /**
   * Categorizes feedback text and analyzes sentiment
   */
  async categorize(text: string): Promise<CategorizationResult> {
    if (!text || text.trim().length === 0) {
      throw new AgentError('Text input is required for categorization');
    }

    const preprocessedText = this.preprocessText(text);
    
    return this.executeWithRetry(async () => {
      const prompt = this.buildCategorizationPrompt(preprocessedText);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that categorizes citizen feedback for government services. You must respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AgentError('No response received from OpenAI');
      }

      return this.parseCategorizationResponse(content);
    });
  }

  /**
   * Preprocesses text by cleaning and normalizing it
   */
  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
      .substring(0, 1000); // Limit length to prevent token overflow
  }

  /**
   * Builds the categorization prompt with examples
   */
  private buildCategorizationPrompt(text: string): string {
    return `
Analyze the following citizen feedback and categorize it. Respond with valid JSON only.

Categories:
- health: Healthcare services, medical facilities, public health issues
- infrastructure: Roads, bridges, utilities, public transportation, buildings
- safety: Crime, emergency services, public safety concerns
- other: All other topics not covered above

Sentiment scale: -1.0 (very negative) to 1.0 (very positive)
Confidence scale: 0.0 (not confident) to 1.0 (very confident)

Examples:
Input: "The hospital wait times are terrible, I waited 6 hours in emergency"
Output: {"category": "health", "sentiment": -0.8, "confidence": 0.9}

Input: "The new bike lanes are great for commuting downtown"
Output: {"category": "infrastructure", "sentiment": 0.7, "confidence": 0.8}

Input: "There have been several break-ins in our neighborhood lately"
Output: {"category": "safety", "sentiment": -0.6, "confidence": 0.8}

Now analyze this feedback:
"${text}"

Respond with JSON only:`;
  }

  /**
   * Parses and validates the OpenAI response
   */
  private parseCategorizationResponse(content: string): CategorizationResult {
    try {
      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[^}]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.category || typeof parsed.sentiment !== 'number' || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format');
      }

      // Validate category
      const validCategories = ['health', 'infrastructure', 'safety', 'other'];
      if (!validCategories.includes(parsed.category)) {
        parsed.category = 'other';
      }

      // Validate and clamp sentiment (-1 to 1)
      parsed.sentiment = Math.max(-1, Math.min(1, parsed.sentiment));

      // Validate and clamp confidence (0 to 1)
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

      return {
        category: parsed.category,
        sentiment: parsed.sentiment,
        confidence: parsed.confidence,
      };
    } catch (error) {
      // Fallback to default values if parsing fails
      return {
        category: 'other',
        sentiment: 0,
        confidence: 0.1,
      };
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
}

// Custom error class for agent-specific errors
class AgentError extends Error {
  public code: string;
  public retryable: boolean;

  constructor(message: string, code: string = 'AGENT_ERROR', retryable: boolean = true) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.retryable = retryable;
  }
}

export { AgentError };