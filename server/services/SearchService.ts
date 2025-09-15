import { VectorService, SearchResult } from './VectorService.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { Feedback } from '../types/database.js';

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  useHybrid?: boolean;
  textWeight?: number;
  vectorWeight?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
  processingTimeMs: number;
  searchType: 'vector' | 'text' | 'hybrid';
}

export class SearchService {
  private vectorService: VectorService;
  private feedbackRepository: FeedbackRepository;

  constructor() {
    this.vectorService = new VectorService();
    this.feedbackRepository = new FeedbackRepository();
  }

  /**
   * Perform semantic search on feedback
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const {
      limit = 50,
      threshold = 0.1,
      useHybrid = true,
      textWeight = 0.3,
      vectorWeight = 0.7
    } = options;

    try {
      // Preprocess query
      const processedQuery = this.preprocessQuery(query);
      
      // Generate embedding for the query
      const queryEmbedding = await this.vectorService.generateEmbedding(processedQuery);
      
      let results: SearchResult[];
      let searchType: 'vector' | 'text' | 'hybrid';

      if (useHybrid) {
        // Perform hybrid search
        results = await this.feedbackRepository.hybridSearch(
          processedQuery,
          queryEmbedding.vector,
          limit,
          textWeight,
          vectorWeight
        );
        searchType = 'hybrid';
      } else {
        // Perform vector-only search
        results = await this.feedbackRepository.vectorSearch(
          queryEmbedding.vector,
          limit,
          threshold
        );
        searchType = 'vector';
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        results,
        query: processedQuery,
        totalResults: results.length,
        processingTimeMs,
        searchType
      };
    } catch (error) {
      console.error('Error performing search:', error);
      
      // Fallback to text search if vector search fails
      const textResults = await this.feedbackRepository.searchByText(query, limit);
      const searchResults: SearchResult[] = textResults.map((feedback, index) => ({
        feedback_id: feedback.id,
        text: feedback.text,
        category: feedback.category,
        sentiment: feedback.sentiment,
        timestamp: feedback.timestamp,
        relevance_score: Math.max(0, 1 - (index / textResults.length))
      }));

      const processingTimeMs = Date.now() - startTime;

      return {
        results: searchResults,
        query,
        totalResults: searchResults.length,
        processingTimeMs,
        searchType: 'text'
      };
    }
  }

  /**
   * Generate and store embeddings for feedback without embeddings
   */
  async generateMissingEmbeddings(batchSize: number = 50): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      // Get feedback without embeddings
      const feedbackList = await this.feedbackRepository.getFeedbackWithoutEmbeddings(batchSize);
      
      if (feedbackList.length === 0) {
        return { processed: 0, errors: 0 };
      }

      console.log(`Processing ${feedbackList.length} feedback items for embedding generation`);

      // Process each feedback item
      for (const feedback of feedbackList) {
        try {
          // Generate embedding
          const embedding = await this.vectorService.generateEmbedding(feedback.text);
          
          // Store embedding in database
          const success = await this.feedbackRepository.updateVectorEmbedding(feedback.id, embedding);
          
          if (success) {
            processed++;
            console.log(`Generated embedding for feedback ${feedback.id}`);
          } else {
            errors++;
            console.error(`Failed to store embedding for feedback ${feedback.id}`);
          }
          
          // Add small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          errors++;
          console.error(`Error processing feedback ${feedback.id}:`, error);
        }
      }

      console.log(`Embedding generation complete. Processed: ${processed}, Errors: ${errors}`);
      return { processed, errors };
    } catch (error) {
      console.error('Error in generateMissingEmbeddings:', error);
      return { processed, errors: errors + 1 };
    }
  }

  /**
   * Find similar feedback to a given feedback item
   */
  async findSimilar(feedbackId: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Get the source feedback
      const sourceFeedback = await this.feedbackRepository.getById(feedbackId);
      if (!sourceFeedback) {
        throw new Error('Feedback not found');
      }

      // Generate embedding for the source feedback if it doesn't exist
      let queryEmbedding: number[];
      if (sourceFeedback.vector_embedding) {
        const embeddingData = JSON.parse(sourceFeedback.vector_embedding as string);
        queryEmbedding = embeddingData.vector;
      } else {
        const embedding = await this.vectorService.generateEmbedding(sourceFeedback.text);
        queryEmbedding = embedding.vector;
        
        // Store the embedding for future use
        await this.feedbackRepository.updateVectorEmbedding(feedbackId, embedding);
      }

      // Find similar feedback (excluding the source)
      const allResults = await this.feedbackRepository.vectorSearch(queryEmbedding, limit + 1, 0.1);
      
      // Filter out the source feedback and return results
      return allResults
        .filter(result => result.feedback_id !== feedbackId)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding similar feedback:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    try {
      if (partialQuery.length < 2) {
        return [];
      }

      // Get recent feedback that contains the partial query
      const suggestions = await this.feedbackRepository.searchByText(partialQuery, limit * 2);
      
      // Extract unique keywords/phrases from the feedback
      const keywords = new Set<string>();
      
      suggestions.forEach(feedback => {
        const words = feedback.text.toLowerCase().split(/\s+/);
        const queryWords = partialQuery.toLowerCase().split(/\s+/);
        
        // Find phrases that start with the query
        for (let i = 0; i < words.length - queryWords.length + 1; i++) {
          const phrase = words.slice(i, i + queryWords.length + 1).join(' ');
          if (phrase.startsWith(partialQuery.toLowerCase()) && phrase.length > partialQuery.length) {
            keywords.add(phrase);
          }
        }
      });

      return Array.from(keywords).slice(0, limit);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Preprocess search query for better results
   */
  private preprocessQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 200); // Limit query length
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(): Promise<{
    totalFeedbackWithEmbeddings: number;
    totalFeedbackWithoutEmbeddings: number;
    embeddingCoverage: number;
  }> {
    try {
      const [withEmbeddings, withoutEmbeddings] = await Promise.all([
        this.feedbackRepository.count('vector_embedding IS NOT NULL AND vector_embedding != ""'),
        this.feedbackRepository.count('vector_embedding IS NULL OR vector_embedding = ""')
      ]);

      const total = withEmbeddings + withoutEmbeddings;
      const coverage = total > 0 ? (withEmbeddings / total) * 100 : 0;

      return {
        totalFeedbackWithEmbeddings: withEmbeddings,
        totalFeedbackWithoutEmbeddings: withoutEmbeddings,
        embeddingCoverage: Math.round(coverage * 100) / 100
      };
    } catch (error) {
      console.error('Error getting search analytics:', error);
      return {
        totalFeedbackWithEmbeddings: 0,
        totalFeedbackWithoutEmbeddings: 0,
        embeddingCoverage: 0
      };
    }
  }
}