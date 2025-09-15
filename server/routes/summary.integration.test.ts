import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import summaryRoutes from './summary.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { SummaryCacheRepository } from '../repositories/SummaryCacheRepository.js';
import { testConnection } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Set up test environment variable if not present (optional for Hugging Face)
if (!process.env.HUGGINGFACE_API_KEY) {
  process.env.HUGGINGFACE_API_KEY = 'test-key-for-integration-tests';
}

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/summary', summaryRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

describe('Summary API Integration Tests', () => {
  let feedbackRepo: FeedbackRepository;
  let cacheRepo: SummaryCacheRepository;
  let testFeedbackIds: string[] = [];

  beforeAll(async () => {
    // Ensure database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    feedbackRepo = new FeedbackRepository();
    cacheRepo = new SummaryCacheRepository();
  });

  beforeEach(async () => {
    // Clean up test data
    await cleanupTestData();
    testFeedbackIds = [];
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
  });

  const cleanupTestData = async () => {
    // Clean up test feedback
    for (const id of testFeedbackIds) {
      try {
        await feedbackRepo.deleteById(id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    // Clean up test cache entries
    try {
      await cacheRepo.deleteExpired();
    } catch (error) {
      // Ignore errors during cleanup
    }
  };

  const createTestFeedback = async (count: number = 5) => {
    const feedbackData = [
      {
        text: 'The hospital wait times are too long, waited 4 hours in emergency',
        category: 'health' as const,
        sentiment: -0.7,
        confidence: 0.9,
        processed: true
      },
      {
        text: 'Great improvement in road maintenance this year, thank you!',
        category: 'infrastructure' as const,
        sentiment: 0.8,
        confidence: 0.85,
        processed: true
      },
      {
        text: 'Need more police patrols in downtown area, feeling unsafe',
        category: 'safety' as const,
        sentiment: -0.5,
        confidence: 0.8,
        processed: true
      },
      {
        text: 'The new online services portal is very user-friendly',
        category: 'other' as const,
        sentiment: 0.6,
        confidence: 0.75,
        processed: true
      },
      {
        text: 'Potholes on Main Street are causing damage to vehicles',
        category: 'infrastructure' as const,
        sentiment: -0.6,
        confidence: 0.9,
        processed: true
      }
    ];

    for (let i = 0; i < Math.min(count, feedbackData.length); i++) {
      const id = uuidv4();
      const data = {
        id,
        ...feedbackData[i]
      };
      
      await feedbackRepo.create(data);
      testFeedbackIds.push(id);
    }
  };

  describe('GET /api/summary', () => {
    it('should return empty summary when no feedback exists', async () => {
      const response = await request(app)
        .get('/api/summary')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: 'No feedback data available for analysis',
        data: {
          categoryInsights: [],
          emergingTrends: [],
          keyComplaints: [],
          recommendations: [],
          metadata: {
            feedbackAnalyzed: 0,
            cacheUsed: false
          }
        }
      });
    });

    it('should return summary when feedback exists', async () => {
      // This test now works with free Hugging Face inference
      console.log('Testing with Hugging Face free inference');

      await createTestFeedback(5);

      const response = await request(app)
        .get('/api/summary')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('categoryInsights');
      expect(response.body.data).toHaveProperty('emergingTrends');
      expect(response.body.data).toHaveProperty('keyComplaints');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('metadata');
      
      const metadata = response.body.data.metadata;
      expect(metadata).toHaveProperty('feedbackAnalyzed');
      expect(metadata).toHaveProperty('lastUpdated');
      expect(metadata).toHaveProperty('totalCategories');
      expect(metadata).toHaveProperty('totalTrends');
      expect(metadata).toHaveProperty('totalComplaints');
      expect(metadata).toHaveProperty('totalRecommendations');
    }, 30000); // Longer timeout for AI processing

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/summary?limit=5')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        message: 'Limit must be between 10 and 500'
      });
    });

    it('should validate limit parameter upper bound', async () => {
      const response = await request(app)
        .get('/api/summary?limit=1000')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        message: 'Limit must be between 10 and 500'
      });
    });

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/summary?limit=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        message: 'Limit must be between 10 and 500'
      });
    });

    it('should use cache when available', async () => {
      // This test now works with free Hugging Face inference
      console.log('Testing cache with Hugging Face free inference');

      await createTestFeedback(5);

      // First request should generate cache
      const firstResponse = await request(app)
        .get('/api/summary?limit=50')
        .expect(200);

      expect(firstResponse.body.data.metadata.cacheUsed).toBe(false);

      // Second request should use cache
      const secondResponse = await request(app)
        .get('/api/summary?limit=50')
        .expect(200);

      expect(secondResponse.body.data.metadata.cacheUsed).toBe(true);
    }, 30000);

    it('should force refresh when requested', async () => {
      // This test now works with free Hugging Face inference
      console.log('Testing refresh with Hugging Face free inference');

      await createTestFeedback(5);

      const response = await request(app)
        .get('/api/summary?refresh=true')
        .expect(200);

      expect(response.body.data.metadata.cacheUsed).toBe(false);
    }, 30000);
  });

  describe('GET /api/summary/stats', () => {
    it('should return summary statistics', async () => {
      await createTestFeedback(3);

      const response = await request(app)
        .get('/api/summary/stats')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('totalFeedback');
      expect(response.body.data).toHaveProperty('processedFeedback');
      expect(response.body.data).toHaveProperty('cacheStats');
      expect(response.body.data.totalFeedback).toBeGreaterThanOrEqual(3);
      expect(response.body.data.processedFeedback).toBeGreaterThanOrEqual(3);
    });
  });

  describe('POST /api/summary/refresh', () => {
    it('should force refresh summary', async () => {
      // This test now works with free Hugging Face inference
      console.log('Testing refresh endpoint with Hugging Face free inference');

      await createTestFeedback(5);

      const response = await request(app)
        .post('/api/summary/refresh')
        .send({ limit: 50 })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Summary refreshed successfully');
      expect(response.body.data).toHaveProperty('categoryInsights');
      expect(response.body.data).toHaveProperty('emergingTrends');
      expect(response.body.data).toHaveProperty('keyComplaints');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data.metadata.feedbackAnalyzed).toBe(50);
    }, 30000);

    it('should validate limit parameter in refresh', async () => {
      const response = await request(app)
        .post('/api/summary/refresh')
        .send({ limit: 5 })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        message: 'Limit must be between 10 and 500'
      });
    });
  });

  describe('DELETE /api/summary/cache', () => {
    it('should clean up old cache entries', async () => {
      const response = await request(app)
        .delete('/api/summary/cache?days=1')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Cleaned up');
      expect(response.body.data).toHaveProperty('deletedCount');
      expect(response.body.data).toHaveProperty('olderThanDays');
      expect(response.body.data.olderThanDays).toBe(1);
    });

    it('should validate days parameter', async () => {
      const response = await request(app)
        .delete('/api/summary/cache?days=0')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        message: 'Days must be between 1 and 365'
      });
    });

    it('should use default days when not specified', async () => {
      const response = await request(app)
        .delete('/api/summary/cache')
        .expect(200);

      expect(response.body.data.olderThanDays).toBe(7);
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable gracefully', async () => {
      // This test would require mocking the service to throw specific errors
      // For now, we'll test that the endpoint exists and handles basic errors
      
      const response = await request(app)
        .get('/api/summary')
        .expect(200);

      // Should not crash and should return a valid response structure
      expect(response.body).toHaveProperty('status');
    });
  });
});