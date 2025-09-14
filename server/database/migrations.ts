import fs from 'fs/promises';
import path from 'path';
import { executeQuery, testConnection } from '../config/database.js';

// Migration interface
interface Migration {
  id: string;
  description: string;
  sql: string;
}

// Create migrations table to track applied migrations
const createMigrationsTable = async (): Promise<void> => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      description TEXT,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  await executeQuery(createTableSQL);
  console.log('✅ Migrations table created/verified');
};

// Check if migration has been applied
const isMigrationApplied = async (migrationId: string): Promise<boolean> => {
  try {
    const result = await executeQuery(
      'SELECT id FROM migrations WHERE id = ?',
      [migrationId]
    );
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

// Record migration as applied
const recordMigration = async (migration: Migration): Promise<void> => {
  await executeQuery(
    'INSERT INTO migrations (id, description) VALUES (?, ?)',
    [migration.id, migration.description]
  );
};

// Execute a single migration
const executeMigration = async (migration: Migration): Promise<void> => {
  try {
    console.log(`🔄 Applying migration: ${migration.id} - ${migration.description}`);
    
    // Split SQL by semicolons and execute each statement
    const statements = migration.sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      await executeQuery(statement);
    }
    
    await recordMigration(migration);
    console.log(`✅ Migration applied: ${migration.id}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migration.id}`, error);
    throw error;
  }
};

// Load schema SQL file
const loadSchemaSQL = async (): Promise<string> => {
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    return await fs.readFile(schemaPath, 'utf-8');
  } catch (error) {
    console.error('Error loading schema.sql:', error);
    throw error;
  }
};

// Run all migrations
export const runMigrations = async (): Promise<void> => {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Test database connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    
    // Create migrations table
    await createMigrationsTable();
    
    // Load schema SQL
    const schemaSQL = await loadSchemaSQL();
    
    // Define migrations
    const migrations: Migration[] = [
      {
        id: '001_initial_schema',
        description: 'Create initial database schema with feedback, summary_cache, and agent_logs tables',
        sql: schemaSQL
      }
    ];
    
    // Apply migrations
    for (const migration of migrations) {
      const isApplied = await isMigrationApplied(migration.id);
      if (!isApplied) {
        await executeMigration(migration);
      } else {
        console.log(`⏭️  Migration already applied: ${migration.id}`);
      }
    }
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    throw error;
  }
};

// Reset database (for development only)
export const resetDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }
  
  console.log('🔄 Resetting database...');
  
  try {
    // Drop tables in reverse order due to foreign key constraints
    await executeQuery('DROP TABLE IF EXISTS agent_logs');
    await executeQuery('DROP TABLE IF EXISTS summary_cache');
    await executeQuery('DROP TABLE IF EXISTS feedback');
    await executeQuery('DROP TABLE IF EXISTS migrations');
    
    console.log('✅ Database reset completed');
    
    // Re-run migrations
    await runMigrations();
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
};

// Verify database schema
export const verifySchema = async (): Promise<boolean> => {
  try {
    console.log('🔍 Verifying database schema...');
    
    // Check if all required tables exist
    const tables = ['feedback', 'summary_cache', 'agent_logs', 'migrations'];
    
    for (const table of tables) {
      const result = await executeQuery(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
        [table]
      );
      
      if (!result || result[0]?.count === 0) {
        console.error(`❌ Table '${table}' does not exist`);
        return false;
      }
    }
    
    console.log('✅ Database schema verification passed');
    return true;
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    return false;
  }
};