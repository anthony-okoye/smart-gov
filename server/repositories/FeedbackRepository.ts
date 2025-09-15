import { BaseRepository } from './BaseRepository.js';
import { Feedback, FeedbackQueryResult, FeedbackCreateInput, FeedbackUpdateInput } from '../types/database.js';
import { validateFeedbackInput, normalizeFeedbackInput } from '../validation/index.js';
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
}