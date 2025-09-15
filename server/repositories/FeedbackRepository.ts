import { BaseRepository } from './BaseRepository.js';
import { Feedback, FeedbackQueryResult, FeedbackCreateInput, FeedbackUpdateInput } from '../types/database.js';
import { validateFeedbackInput, normalizeFeedbackInput } from '../validation/index.js';
import { SearchResult, VectorEmbedding } from '../services/VectorService.js';
import { v4 as uuidv4 } from 'uuid';

export class FeedbackRepository extends BaseRepository {
  constructor() {
    super('feedback');
  }

  // Create new feedback with validation
  async create(feedbackInput: FeedbackCreateInput): Promise<Feedback> {
    // Normalize and validate input
    const { normalized, validation } = normalizeFeedbackInput(feedbackInput);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const id = uuidv4();
    const now = new Date();
    const data = {
      id,
      text: normalized.text,
      category: normalized.category || 'other',
      sentiment: normalized.sentiment || 0,
      confidence: normalized.confidence || 0,
      timestamp: now,
      processed: false,
      created_at: now,
      updated_at: now
    };

    await this.insert(data);
    const created = await this.findById<Feedback>(id);
    
    if (!created) {
      throw new Error('Failed to create feedback');
    }
    
    return created;
  }

  // Get feedback by ID
  async getById(id: string): Promise<Feedback | null> {
    return await this.findById<Feedback>(id);
  }

  // Get paginated feedback with optional filtering
  async getPaginated(
    page: number = 1,
    limit: number = 50,
    category?: string,
    orderBy: string = 'timestamp DESC'
  ): Promise<FeedbackQueryResult> {
    const offset = (page - 1) * limit;
    let conditions = '';
    const params: any[] = [];

    if (category && category !== 'all') {
      conditions = 'category = ?';
      params.push(category);
    }

    const [feedback, total] = await Promise.all([
      this.findMany<Feedback>(conditions, params, orderBy, limit, offset),
      this.count(conditions, params)
    ]);

    return {
      feedback,
      total,
      page,
      limit
    };
  }

  // Update feedback with validation
  async update(id: string, updateInput: FeedbackUpdateInput): Promise<Feedback | null> {
    // Validate the update input
    if (updateInput.text !== undefined) {
      const textValidation = validateFeedbackInput({ text: updateInput.text });
      if (!textValidation.isValid) {
        throw new Error(`Text validation failed: ${textValidation.errors.join(', ')}`);
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (updateInput.text !== undefined) updateData.text = updateInput.text.trim();
    if (updateInput.category !== undefined) updateData.category = updateInput.category;
    if (updateInput.sentiment !== undefined) updateData.sentiment = updateInput.sentiment;
    if (updateInput.confidence !== undefined) updateData.confidence = updateInput.confidence;
    if (updateInput.processed !== undefined) updateData.processed = updateInput.processed;

    const success = await this.updateById(id, updateData);
    if (!success) {
      return null;
    }

    return await this.findById<Feedback>(id);
  }

  // Update feedback processing status
  async markAsProcessed(id: string, category?: string, sentiment?: number, confidence?: number): Promise<boolean> {
    const updateData: Record<string, any> = {
      processed: true,
      updated_at: new Date()
    };

    if (category) updateData.category = category;
    if (sentiment !== undefined) updateData.sentiment = sentiment;
    if (confidence !== undefined) updateData.confidence = confidence;

    return await this.updateById(id, updateData);
  }

  // Get unprocessed feedback
  async getUnprocessed(limit: number = 100): Promise<Feedback[]> {
    return await this.findMany<Feedback>(
      'processed = FALSE',
      [],
      'created_at ASC',
      limit
    );
  }

  // Get feedback by category
  async getByCategory(category: string, limit?: number): Promise<Feedback[]> {
    return await this.findMany<Feedback>(
      'category = ?',
      [category],
      'timestamp DESC',
      limit
    );
  }

  // Get recent feedback for summarization
  async getRecent(limit: number = 100): Promise<Feedback[]> {
    return await this.findMany<Feedback>(
      'processed = TRUE',
      [],
      'timestamp DESC',
      limit
    );
  }

  // Search feedback by text (basic text search)
  async searchByText(searchTerm: string, limit: number = 50): Promise<Feedback[]> {
    return await this.findMany<Feedback>(
      'text LIKE ?',
      [`%${searchTerm}%`],
      'timestamp DESC',
      limit
    );
  }

  // Get sentiment statistics
  async getSentimentStats(): Promise<{ positive: number; neutral: number; negative: number }> {
    const sql = `
      SELECT 
        SUM(CASE WHEN sentiment > 0.1 THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN sentiment >= -0.1 AND sentiment <= 0.1 THEN 1 ELSE 0 END) as neutral,
        SUM(CASE WHEN sentiment < -0.1 THEN 1 ELSE 0 END) as negative
      FROM ${this.tableName}
      WHERE processed = TRUE
    `;
    
    const results = await this.query(sql);
    return results[0] || { positive: 0, neutral: 0, negative: 0 };
  }

  // Get category statistics
  async getCategoryStats(): Promise<Record<string, number>> {
    const sql = `
      SELECT category, COUNT(*) as count
      FROM ${this.tableName}
      WHERE processed = TRUE
      GROUP BY category
    `;
    
    const results = await this.query(sql);
    const stats: Record<string, number> = {
      health: 0,
      infrastructure: 0,
      safety: 0,
      other: 0
    };
    
    results.forEach((row: any) => {
      stats[row.category] = row.count;
    });
    
    return stats;
  }

  // Delete old feedback (for cleanup)
  async deleteOlderThan(days: number): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
    const result = await this.query(sql, [days]);
    return result.affectedRows || 0;
  }

  // Update feedback with vector embedding
  async updateVectorEmbedding(id: string, embedding: VectorEmbedding): Promise<boolean> {
    const embeddingData = {
      vector: embedding.vector,
      model: embedding.model,
      dimensions: embedding.dimensions,
      generated_at: new Date().toISOString()
    };

    return await this.updateById(id, {
      vector_embedding: JSON.stringify(embeddingData),
      updated_at: new Date()
    });
  }

  // Get feedback without vector embeddings
  async getFeedbackWithoutEmbeddings(limit: number = 100): Promise<Feedback[]> {
    return await this.findMany<Feedback>(
      'vector_embedding IS NULL OR vector_embedding = ""',
      [],
      'created_at ASC',
      limit
    );
  }

  // Vector search using cosine similarity (in-memory calculation)
  async vectorSearch(queryEmbedding: number[], limit: number = 50, threshold: number = 0.1): Promise<SearchResult[]> {
    // Get all feedback with embeddings
    const sql = `
      SELECT id, text, category, sentiment, timestamp, vector_embedding
      FROM ${this.tableName}
      WHERE vector_embedding IS NOT NULL 
        AND vector_embedding != ''
        AND processed = TRUE
      ORDER BY timestamp DESC
      LIMIT 1000
    `;
    
    const feedbackRows = await this.query(sql);
    const results: SearchResult[] = [];

    for (const row of feedbackRows) {
      try {
        const embeddingData = JSON.parse(row.vector_embedding);
        if (!embeddingData.vector || !Array.isArray(embeddingData.vector)) {
          continue;
        }

        // Calculate cosine similarity
        const similarity = this.calculateCosineSimilarity(queryEmbedding, embeddingData.vector);
        const relevanceScore = Math.max(0, (similarity + 1) / 2); // Convert to 0-1 scale

        if (relevanceScore >= threshold) {
          results.push({
            feedback_id: row.id,
            text: row.text,
            category: row.category,
            sentiment: row.sentiment,
            timestamp: row.timestamp,
            relevance_score: relevanceScore
          });
        }
      } catch (error) {
        console.error(`Error processing embedding for feedback ${row.id}:`, error);
        continue;
      }
    }

    // Sort by relevance score (highest first) and limit results
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  // Helper method for cosine similarity calculation
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Hybrid search combining text and vector search
  async hybridSearch(
    queryText: string, 
    queryEmbedding: number[], 
    limit: number = 50,
    textWeight: number = 0.3,
    vectorWeight: number = 0.7
  ): Promise<SearchResult[]> {
    // Get text search results
    const textResults = await this.searchByText(queryText, limit * 2);
    
    // Get vector search results
    const vectorResults = await this.vectorSearch(queryEmbedding, limit * 2, 0.1);
    
    // Combine and score results
    const combinedResults = new Map<string, SearchResult>();
    
    // Add text search results with text score
    textResults.forEach((feedback, index) => {
      const textScore = Math.max(0, 1 - (index / textResults.length));
      combinedResults.set(feedback.id, {
        feedback_id: feedback.id,
        text: feedback.text,
        category: feedback.category,
        sentiment: feedback.sentiment,
        timestamp: feedback.timestamp,
        relevance_score: textScore * textWeight
      });
    });
    
    // Add/update with vector search results
    vectorResults.forEach(result => {
      const existing = combinedResults.get(result.feedback_id);
      if (existing) {
        // Combine scores
        existing.relevance_score += result.relevance_score * vectorWeight;
      } else {
        // Add new result with vector score only
        combinedResults.set(result.feedback_id, {
          ...result,
          relevance_score: result.relevance_score * vectorWeight
        });
      }
    });
    
    // Sort by combined relevance score and return top results
    return Array.from(combinedResults.values())
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }
}