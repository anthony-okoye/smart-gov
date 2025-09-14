import { BaseRepository } from './BaseRepository.js';
import { SummaryCache } from '../types/database.js';
import { v4 as uuidv4 } from 'uuid';

export class SummaryCacheRepository extends BaseRepository {
  constructor() {
    super('summary_cache');
  }

  // Create or update cache entry
  async set(
    cacheKey: string,
    summaryData: any,
    category?: string,
    expirationHours: number = 24
  ): Promise<SummaryCache> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Check if cache entry already exists
    const existing = await this.getByCacheKey(cacheKey);
    
    if (existing) {
      // Update existing entry
      const updateData = {
        summary_data: JSON.stringify(summaryData),
        category,
        expires_at: expiresAt,
        updated_at: new Date()
      };
      
      await this.updateById(existing.id, updateData);
      const updated = await this.findById<SummaryCache>(existing.id);
      
      if (!updated) {
        throw new Error('Failed to update cache entry');
      }
      
      return updated;
    } else {
      // Create new entry
      const id = uuidv4();
      const data = {
        id,
        cache_key: cacheKey,
        category,
        summary_data: JSON.stringify(summaryData),
        expires_at: expiresAt
      };

      await this.insert(data);
      const created = await this.findById<SummaryCache>(id);
      
      if (!created) {
        throw new Error('Failed to create cache entry');
      }
      
      return created;
    }
  }

  // Get cache entry by key
  async getByCacheKey(cacheKey: string): Promise<SummaryCache | null> {
    const results = await this.findMany<SummaryCache>(
      'cache_key = ?',
      [cacheKey],
      undefined,
      1
    );
    
    return results.length > 0 ? results[0] : null;
  }

  // Get valid (non-expired) cache entry
  async getValid(cacheKey: string): Promise<SummaryCache | null> {
    const results = await this.findMany<SummaryCache>(
      'cache_key = ? AND expires_at > NOW()',
      [cacheKey],
      undefined,
      1
    );
    
    return results.length > 0 ? results[0] : null;
  }

  // Get cache entries by category
  async getByCategory(category: string, includeExpired: boolean = false): Promise<SummaryCache[]> {
    const condition = includeExpired 
      ? 'category = ?'
      : 'category = ? AND expires_at > NOW()';
    
    return await this.findMany<SummaryCache>(
      condition,
      [category],
      'created_at DESC'
    );
  }

  // Check if cache entry is valid (not expired)
  async isValid(cacheKey: string): Promise<boolean> {
    const count = await this.count(
      'cache_key = ? AND expires_at > NOW()',
      [cacheKey]
    );
    
    return count > 0;
  }

  // Delete expired cache entries
  async deleteExpired(): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE expires_at <= NOW()`;
    const result = await this.query(sql);
    return result.affectedRows || 0;
  }

  // Delete cache entries by category
  async deleteByCategory(category: string): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE category = ?`;
    const result = await this.query(sql, [category]);
    return result.affectedRows || 0;
  }

  // Delete cache entry by key
  async deleteByCacheKey(cacheKey: string): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE cache_key = ?`;
    const result = await this.query(sql, [cacheKey]);
    return result.affectedRows > 0;
  }

  // Get all cache entries with pagination
  async getPaginated(
    page: number = 1,
    limit: number = 50,
    includeExpired: boolean = false
  ): Promise<{ entries: SummaryCache[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const condition = includeExpired ? undefined : 'expires_at > NOW()';
    
    const [entries, total] = await Promise.all([
      this.findMany<SummaryCache>(condition, [], 'created_at DESC', limit, offset),
      this.count(condition)
    ]);

    return {
      entries,
      total,
      page,
      limit
    };
  }

  // Get cache statistics
  async getStats(): Promise<{
    total: number;
    valid: number;
    expired: number;
    byCategory: Record<string, number>;
  }> {
    const [totalResult, validResult, expiredResult, categoryResult] = await Promise.all([
      this.query(`SELECT COUNT(*) as count FROM ${this.tableName}`),
      this.query(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE expires_at > NOW()`),
      this.query(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE expires_at <= NOW()`),
      this.query(`
        SELECT category, COUNT(*) as count 
        FROM ${this.tableName} 
        WHERE category IS NOT NULL 
        GROUP BY category
      `)
    ]);

    const byCategory: Record<string, number> = {};
    categoryResult.forEach((row: any) => {
      byCategory[row.category] = row.count;
    });

    return {
      total: totalResult[0]?.count || 0,
      valid: validResult[0]?.count || 0,
      expired: expiredResult[0]?.count || 0,
      byCategory
    };
  }

  // Cleanup old cache entries (older than specified days)
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
    const result = await this.query(sql, [olderThanDays]);
    return result.affectedRows || 0;
  }
}