import { executeQuery, getConnection } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Base repository class with common database operations
export abstract class BaseRepository {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Execute a query with parameters
  protected async query<T = any>(sql: string, params?: any[]): Promise<T> {
    return await executeQuery(sql, params);
  }

  // Find a single record by ID
  protected async findById<T>(id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const results = await this.query<RowDataPacket[]>(sql, [id]);
    return results.length > 0 ? (results[0] as T) : null;
  }

  // Find multiple records with optional conditions
  protected async findMany<T>(
    conditions?: string,
    params?: any[],
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
    
    if (conditions) {
      sql += ` WHERE ${conditions}`;
    }
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
      if (offset) {
        sql += ` OFFSET ${offset}`;
      }
    }
    
    const results = await this.query<RowDataPacket[]>(sql, params);
    return results as T[];
  }

  // Count records with optional conditions
  protected async count(conditions?: string, params?: any[]): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    
    if (conditions) {
      sql += ` WHERE ${conditions}`;
    }
    
    const results = await this.query<RowDataPacket[]>(sql, params);
    return results[0]?.count || 0;
  }

  // Insert a new record
  protected async insert(data: Record<string, any>): Promise<string> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query<ResultSetHeader>(sql, values);
    
    // Return the inserted ID or generate one if not provided
    return result.insertId?.toString() || data.id;
  }

  // Update a record by ID
  protected async updateById(id: string, data: Record<string, any>): Promise<boolean> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = await this.query<ResultSetHeader>(sql, [...values, id]);
    
    return result.affectedRows > 0;
  }

  // Delete a record by ID
  protected async deleteById(id: string): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.query<ResultSetHeader>(sql, [id]);
    
    return result.affectedRows > 0;
  }

  // Execute a transaction
  protected async transaction<T>(callback: (connection: any) => Promise<T>): Promise<T> {
    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}