import { BaseRepository } from './BaseRepository.js';
import { AgentLog } from '../types/database.js';
import { v4 as uuidv4 } from 'uuid';

export class AgentLogRepository extends BaseRepository {
  constructor() {
    super('agent_logs');
  }

  // Create new agent log entry
  async create(logData: Omit<AgentLog, 'id' | 'created_at' | 'updated_at'>): Promise<AgentLog> {
    const id = uuidv4();
    const data = {
      id,
      ...logData
    };

    await this.insert(data);
    const created = await this.findById<AgentLog>(id);
    
    if (!created) {
      throw new Error('Failed to create agent log');
    }
    
    return created;
  }

  // Get log by ID
  async getById(id: string): Promise<AgentLog | null> {
    return await this.findById<AgentLog>(id);
  }

  // Update log status
  async updateStatus(
    id: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string,
    processingTimeMs?: number
  ): Promise<boolean> {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date()
    };

    if (errorMessage) updateData.error_message = errorMessage;
    if (processingTimeMs !== undefined) updateData.processing_time_ms = processingTimeMs;

    return await this.updateById(id, updateData);
  }

  // Get logs by agent type
  async getByAgentType(
    agentType: 'categorizer' | 'summarizer',
    limit: number = 100,
    status?: string
  ): Promise<AgentLog[]> {
    let conditions = 'agent_type = ?';
    const params = [agentType];

    if (status) {
      conditions += ' AND status = ?';
      params.push(status);
    }

    return await this.findMany<AgentLog>(
      conditions,
      params,
      'created_at DESC',
      limit
    );
  }

  // Get logs by feedback ID
  async getByFeedbackId(feedbackId: string): Promise<AgentLog[]> {
    return await this.findMany<AgentLog>(
      'feedback_id = ?',
      [feedbackId],
      'created_at DESC'
    );
  }

  // Get logs by status
  async getByStatus(
    status: 'pending' | 'processing' | 'completed' | 'failed',
    limit?: number
  ): Promise<AgentLog[]> {
    return await this.findMany<AgentLog>(
      'status = ?',
      [status],
      'created_at DESC',
      limit
    );
  }

  // Get recent logs with pagination
  async getPaginated(
    page: number = 1,
    limit: number = 50,
    agentType?: string,
    status?: string
  ): Promise<{ logs: AgentLog[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    let conditions = '';
    const params: any[] = [];

    if (agentType) {
      conditions = 'agent_type = ?';
      params.push(agentType);
    }

    if (status) {
      conditions += conditions ? ' AND status = ?' : 'status = ?';
      params.push(status);
    }

    const [logs, total] = await Promise.all([
      this.findMany<AgentLog>(conditions || undefined, params.length > 0 ? params : undefined, 'created_at DESC', limit, offset),
      this.count(conditions || undefined, params.length > 0 ? params : undefined)
    ]);

    return {
      logs,
      total,
      page,
      limit
    };
  }

  // Get processing statistics
  async getProcessingStats(agentType?: 'categorizer' | 'summarizer'): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    averageProcessingTime: number;
  }> {
    const baseCondition = agentType ? 'WHERE agent_type = ?' : '';
    const params = agentType ? [agentType] : [];

    const [statusStats, avgTimeResult] = await Promise.all([
      this.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM ${this.tableName}
        ${baseCondition}
        GROUP BY status
      `, params),
      this.query(`
        SELECT AVG(processing_time_ms) as avg_time
        FROM ${this.tableName}
        ${baseCondition ? baseCondition + ' AND' : 'WHERE'} processing_time_ms IS NOT NULL
      `, params)
    ]);

    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      averageProcessingTime: avgTimeResult[0]?.avg_time || 0
    };

    statusStats.forEach((row: any) => {
      stats[row.status as keyof typeof stats] = row.count;
      stats.total += row.count;
    });

    return stats;
  }

  // Get failed logs for retry
  async getFailedLogs(
    agentType?: 'categorizer' | 'summarizer',
    limit: number = 50
  ): Promise<AgentLog[]> {
    let conditions = 'status = ?';
    const params = ['failed'];

    if (agentType) {
      conditions += ' AND agent_type = ?';
      params.push(agentType);
    }

    return await this.findMany<AgentLog>(
      conditions,
      params,
      'created_at ASC',
      limit
    );
  }

  // Get processing time statistics
  async getProcessingTimeStats(agentType?: 'categorizer' | 'summarizer'): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
  }> {
    const baseCondition = agentType ? 'WHERE agent_type = ?' : '';
    const params = agentType ? [agentType] : [];

    const result = await this.query(`
      SELECT 
        MIN(processing_time_ms) as min_time,
        MAX(processing_time_ms) as max_time,
        AVG(processing_time_ms) as avg_time,
        COUNT(*) as count
      FROM ${this.tableName}
      ${baseCondition ? baseCondition + ' AND' : 'WHERE'} processing_time_ms IS NOT NULL
    `, params);

    const stats = result[0] || {};
    return {
      min: stats.min_time || 0,
      max: stats.max_time || 0,
      avg: stats.avg_time || 0,
      count: stats.count || 0
    };
  }

  // Delete old logs (for cleanup)
  async deleteOlderThan(days: number): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
    const result = await this.query(sql, [days]);
    return result.affectedRows || 0;
  }

  // Delete logs by feedback ID (when feedback is deleted)
  async deleteByFeedbackId(feedbackId: string): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE feedback_id = ?`;
    const result = await this.query(sql, [feedbackId]);
    return result.affectedRows || 0;
  }
}