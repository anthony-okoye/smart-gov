import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import feedbackRouter from './feedback.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { AgentLogRepository } from '../repositories/AgentLogRepository.js';
import { CategorizerAgent } from '../agents/CategorizerAgent.js';

// Mock the CategorizerAgent
vi.mock('../agents/CategorizerAgent.js', () => ({
  CategorizerAgent: vi.fn().mockImplementation(() => ({
    categorize: vi.fn()
  })),
  AgentError: class AgentError extends Error {
    constructor(message: string, public code: string = 'AGENT_ERROR', public retryable: boolean = true) {
      super(message);
      this.name = 'AgentError';
    }
  }
}));

describe('Feedback Integration Tests', () => {
  let app: express.Application;
  let feedbackRepository: FeedbackRepository;
  let agentLogRepository: AgentLogRepository;
  let mockCategorizer: any;

  beforeEach(async () => {
    // Set up test app
    app = express();
    app.use(express.json());
    app.use('/api/feedback', feedbackRouter);

    // Initialize repositories
    feedbackRepository = new FeedbackRepository();
    agentLogRepository = new AgentLogRepository();

    // Set up mock categorizer
    mockCategorizer = {
      categorize: vi.fn()
    };
    
    // Mock the CategorizerAgent constructor to return our mock
    (CategorizerAgent as any).mockImplementation(() => mockCategorizer);

    // Set environment variable for testing
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(async () => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('POST /api/feedback - End-to-End Processing', () => {
    it('should create feedback and trigger categorization successfully', async () => {
      // Mock successful categorization
      mockCategorizer.categorize.mockResolvedValue({
        category: 'health',
        sentiment: -0.7,
        confidence: 0.9
      });

      const feedbackText = 'The hospital wait times are terrible, I waited 6 hours in emergency';

      const response = await request(app)
        .post('/api/feedback')
        .send({ text: feedbackText })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'success',
        message: 'Feedback submitted successfully',
        data: {
          text: feedbackText,
          category: 'other', // Initially set to default
          processed: 0   // Initially unprocessed (0 = false in MySQL)
        }
      });

      const feedbackId = response.body.data.id;

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that feedback was updated with categorization results
      const updatedFeedback = await feedbackRepository.getById(feedbackId);
      expect(updatedFeedback).toBeTruthy();
      expect(updatedFeedback!.processed).toBeTruthy(); // 1 = true in MySQL
      expect(updatedFeedback!.category).toBe('health');
      expect(updatedFeedback!.sentiment).toBe(-0.7);
      expect(updatedFeedback!.confidence).toBe(0.9);

      // Check that agent log was created
      const logs = await agentLogRepository.getByFeedbackId(feedbackId);
      expect(logs).toHaveLength(1);
      expect(logs[0].agent_type).toBe('categorizer');
      expect(logs[0].status).toBe('completed');
      expect(logs[0].processing_time_ms).toBeGreaterThan(0);
    });

    it('should apply fallback categorization when AI processing fails', async () => {
      // Mock categorization failure
      mockCategorizer.categorize.mockRejectedValue(new Error('API rate limit exceeded'));

      const feedbackText = 'Test feedback for failure scenario';

      const response = await request(app)
        .post('/api/feedback')
        .send({ text: feedbackText })
        .expect(201);

      const feedbackId = response.body.data.id;

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that feedback was updated with fallback values
      const updatedFeedback = await feedbackRepository.getById(feedbackId);
      expect(updatedFeedback).toBeTruthy();
      expect(updatedFeedback!.processed).toBeTruthy(); // 1 = true in MySQL
      expect(updatedFeedback!.category).toBe('other');    // Fallback category
      expect(updatedFeedback!.sentiment).toBe(0);         // Neutral sentiment
      expect(updatedFeedback!.confidence).toBe(0.1);      // Low confidence

      // Check that agent log shows failure
      const logs = await agentLogRepository.getByFeedbackId(feedbackId);
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('failed');
      expect(logs[0].error_message).toContain('API rate limit exceeded');
    });

    it('should handle categorization when OpenAI API key is not configured', async () => {
      // Remove API key
      delete process.env.OPENAI_API_KEY;

      const feedbackText = 'Test feedback without API key';

      const response = await request(app)
        .post('/api/feedback')
        .send({ text: feedbackText })
        .expect(201);

      const feedbackId = response.body.data.id;

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that feedback was updated with fallback values
      const updatedFeedback = await feedbackRepository.getById(feedbackId);
      expect(updatedFeedback).toBeTruthy();
      expect(updatedFeedback!.processed).toBeTruthy(); // 1 = true in MySQL
      expect(updatedFeedback!.category).toBe('other');
      expect(updatedFeedback!.sentiment).toBe(0);
      expect(updatedFeedback!.confidence).toBe(0.1);

      // Check that agent log shows failure
      const logs = await agentLogRepository.getByFeedbackId(feedbackId);
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('failed');
      expect(logs[0].error_message).toContain('OpenAI API key not configured');
    });

    it('should not block feedback submission when categorization fails', async () => {
      // Mock categorization to take a long time and fail
      mockCategorizer.categorize.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 200)
        )
      );

      const start = Date.now();
      
      const response = await request(app)
        .post('/api/feedback')
        .send({ text: 'Test feedback for non-blocking behavior' })
        .expect(201);

      const responseTime = Date.now() - start;
      
      // Response should be fast (not waiting for categorization)
      expect(responseTime).toBeLessThan(1000); // More reasonable timeout for CI
      expect(response.body.status).toBe('success');
    });
  });

  describe('GET /api/feedback/stats', () => {
    it('should return processing statistics', async () => {
      const response = await request(app)
        .get('/api/feedback/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          total: expect.any(Number),
          processed: expect.any(Number),
          unprocessed: expect.any(Number),
          pending: expect.any(Number),
          failed: expect.any(Number),
          processingRate: expect.any(Number)
        }
      });
    });
  });

  describe('POST /api/feedback/reprocess', () => {
    it('should reprocess failed feedback items', async () => {
      const response = await request(app)
        .post('/api/feedback/reprocess')
        .send({ limit: 5 })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: expect.stringContaining('Reprocessed'),
        data: {
          reprocessedCount: expect.any(Number)
        }
      });
    });

    it('should validate reprocess limit parameter', async () => {
      const response1 = await request(app)
        .post('/api/feedback/reprocess')
        .send({ limit: 150 });
      expect(response1.status).toBe(400);

      const response2 = await request(app)
        .post('/api/feedback/reprocess')
        .send({ limit: 0 });
      expect(response2.status).toBe(400);
    });
  });

  describe('Async Processing Behavior', () => {
    it('should process multiple feedback items concurrently', async () => {
      // Mock successful categorization with different results
      mockCategorizer.categorize
        .mockResolvedValueOnce({
          category: 'health',
          sentiment: -0.5,
          confidence: 0.8
        })
        .mockResolvedValueOnce({
          category: 'infrastructure',
          sentiment: 0.3,
          confidence: 0.7
        })
        .mockResolvedValueOnce({
          category: 'safety',
          sentiment: -0.8,
          confidence: 0.9
        });

      // Submit multiple feedback items
      const feedbackTexts = [
        'Hospital service is slow',
        'New road construction is good',
        'Crime rate is increasing'
      ];

      const responses = await Promise.all(
        feedbackTexts.map(text =>
          request(app)
            .post('/api/feedback')
            .send({ text })
            .expect(201)
        )
      );

      const feedbackIds = responses.map(r => r.body.data.id);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check all feedback items were processed
      const processedFeedback = await Promise.all(
        feedbackIds.map(id => feedbackRepository.getById(id))
      );

      processedFeedback.forEach((feedback, index) => {
        expect(feedback).toBeTruthy();
        expect(feedback!.processed).toBeTruthy(); // 1 = true in MySQL
        
        // Verify different categorization results
        if (index === 0) expect(feedback!.category).toBe('health');
        if (index === 1) expect(feedback!.category).toBe('infrastructure');
        if (index === 2) expect(feedback!.category).toBe('safety');
      });

      // Verify categorizer was called for each feedback
      expect(mockCategorizer.categorize).toHaveBeenCalledTimes(3);
    });
  });
});