import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { testConnection, closePool } from '../config/database.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import searchRoutes from './search.js';

// Integration tests for search functionality
// Note: These tests require actual database connection and API keys
describe('Search Integration Tests', () => {
  let app: express.Application;
  let feedbackRepository: FeedbackRepository;
  let testFeedbackIds: string[] = [];

  beforeAll(async () => {
    // Check if we can connect to the database
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('Database not available, skipping integration tests');
      return;
    }

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/search', searchRoutes);

    feedbackRepository = new FeedbackRepository();
  });

  afterAll(async () => {
    // Clean up test data
    if (testFeedbackIds.length > 0) {
      try {
        for (const id of testFeedbackIds) {
          await feedbackRepository.deleteById(id);
        }
      } catch (error) {
        console.warn('Error cleaning up test data:', error);
      }
    }

    await closePool();
  });

  beforeEach(() => {
    // Skip tests if required environment variables are not set
    if (!process.env.HUGGINGFACE_API_KEY && !process.env.OPENAI_API_KEY) {
      console.warn('No API keys available, skipping vector search tests');
      return;
    }
  });

  describe('Search Functionality', () => {
    it('should create test feedback and perform search', async () => {
      // Skip if no database connection
      const dbConnected = await testConnection();
      if (!dbConnected) {
        console.warn('Skipping test - no database connection');
        return;
      }

      // Skip if no API keys
      if (!process.env.HUGGINGFACE_API_KEY && !process.env.OPENAI_API_KEY) {
        console.warn('Skipping test - no API keys');
        return;
      }

      try {
        // Create test feedback
        const testFeedback = [
          {
            text: 'The road near the hospital needs urgent repair due to potholes',
            category: 'infrastructure' as const,
            sentiment: -0.6,
            confidence: 0.8
          },
          {
            text: 'Hospital staff are very helpful and professional',
            category: 'health' as const,
            sentiment: 0.7,
            confidence: 0.9
          },
          {
            text: 'Street lighting is insufficient making it unsafe at night',
            category: 'safety' as const,
            sentiment: -0.5,
            confidence: 0.7
          }
        ];

        // Insert test feedback
        for (const feedback of testFeedback) {
          const created = await feedbackRepository.create(feedback);
          testFeedbackIds.push(created.id);
          
          // Mark as processed so it appears in search
          await feedbackRepository.markAsProcessed(
            created.id,
            feedback.category,
            feedback.sentiment,
            feedback.confidence
          );
        }

        // Generate embeddings for the test feedback
        const generateResponse = await request(app)
          .post('/api/search/generate-embeddings')
          .send({ batchSize: 10 });

        expect(generateResponse.status).toBe(200);
        expect(generateResponse.body.success).toBe(true);

        // Wait a moment for embeddings to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test search functionality
        const searchResponse = await request(app)
          .post('/api/search')
          .send({ 
            query: 'hospital road repair',
            limit: 10,
            useHybrid: true
          });

        expect(searchResponse.status).toBe(200);
        expect(searchResponse.body.success).toBe(true);
        expect(searchResponse.body.data.results).toBeDefined();
        expect(searchResponse.body.data.totalResults).toBeGreaterThanOrEqual(0);
        expect(searchResponse.body.data.processingTimeMs).toBeGreaterThan(0);

        // Test search analytics
        const analyticsResponse = await request(app)
          .get('/api/search/analytics');

        expect(analyticsResponse.status).toBe(200);
        expect(analyticsResponse.body.success).toBe(true);
        expect(analyticsResponse.body.data.totalFeedbackWithEmbeddings).toBeGreaterThanOrEqual(0);
        expect(analyticsResponse.body.data.embeddingCoverage).toBeGreaterThanOrEqual(0);

        // Test search suggestions
        const suggestionsResponse = await request(app)
          .get('/api/search/suggestions')
          .query({ q: 'hospital', limit: 5 });

        expect(suggestionsResponse.status).toBe(200);
        expect(suggestionsResponse.body.success).toBe(true);
        expect(Array.isArray(suggestionsResponse.body.data.suggestions)).toBe(true);

        console.log('✅ Search integration test completed successfully');
      } catch (error) {
        console.error('Search integration test failed:', error);
        throw error;
      }
    }, 30000); // 30 second timeout for API calls

    it('should handle similar feedback search', async () => {
      // Skip if no database connection or API keys
      const dbConnected = await testConnection();
      if (!dbConnected || (!process.env.HUGGINGFACE_API_KEY && !process.env.OPENAI_API_KEY)) {
        console.warn('Skipping similar feedback test');
        return;
      }

      try {
        // Use the first test feedback ID if available
        if (testFeedbackIds.length > 0) {
          const similarResponse = await request(app)
            .get(`/api/search/similar/${testFeedbackIds[0]}`)
            .query({ limit: 5 });

          expect(similarResponse.status).toBe(200);
          expect(similarResponse.body.success).toBe(true);
          expect(similarResponse.body.data.feedbackId).toBe(testFeedbackIds[0]);
          expect(Array.isArray(similarResponse.body.data.similar)).toBe(true);
        }
      } catch (error) {
        console.error('Similar feedback test failed:', error);
        throw error;
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle search with invalid parameters', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: '', limit: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should handle similar search with non-existent feedback', async () => {
      const response = await request(app)
        .get('/api/search/similar/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Feedback not found');
    });

    it('should handle suggestions with invalid parameters', async () => {
      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ limit: 100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});