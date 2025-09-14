import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
  connectionLimit: number;
}

// TiDB Serverless connection configuration
const dbConfig: DatabaseConfig = {
  host: process.env.TIDB_HOST || 'localhost',
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER || 'root',
  password: process.env.TIDB_PASSWORD || '',
  database: process.env.TIDB_DATABASE || 'smartgov',
  ssl: {
    rejectUnauthorized: false // TiDB Serverless requires SSL
  },
  connectionLimit: 10
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Execute query with error handling
export const executeQuery = async (query: string, params?: any[]): Promise<any> => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get connection from pool
export const getConnection = async () => {
  return await pool.getConnection();
};

// Close all connections
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('Database connection pool closed');
};

export default pool;