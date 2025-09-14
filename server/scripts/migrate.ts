#!/usr/bin/env tsx

import { runMigrations, resetDatabase, verifySchema } from '../database/migrations.js';
import { closePool } from '../config/database.js';

// Parse command line arguments
const command = process.argv[2];

const showHelp = () => {
  console.log(`
SmartGov Assistant Database Migration Tool

Usage:
  npm run migrate [command]

Commands:
  up       Run all pending migrations (default)
  reset    Reset database and re-run all migrations (development only)
  verify   Verify database schema integrity
  help     Show this help message

Examples:
  npm run migrate
  npm run migrate up
  npm run migrate reset
  npm run migrate verify
  `);
};

const main = async () => {
  try {
    switch (command) {
      case 'reset':
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Database reset is not allowed in production');
          process.exit(1);
        }
        await resetDatabase();
        break;
        
      case 'verify':
        const isValid = await verifySchema();
        if (!isValid) {
          process.exit(1);
        }
        break;
        
      case 'help':
        showHelp();
        break;
        
      case 'up':
      case undefined:
        await runMigrations();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    // Close database connections
    await closePool();
  }
};

// Run the script
main();