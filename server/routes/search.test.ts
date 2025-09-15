import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import searchRoutes from './search.js';
import { SearchService } from '../services/SearchService.js';

// Mock the SearchService
vi.mock('../services/SearchService.js');

describe('Search Routes', () => {
  let app: express.Application;
  let mockSearchService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock SearchService
    mockSearchService = {
      search: vi.fn(),
      getSearchSuggestions: vi.fn(),
      findSimilar: vi.fn(),
      generateMissingEmbeddings: vi.fn(),
      getSearchAnalytics: vi.fn()
    };
    (SearchService as any).mockImplementation(() => mockSearchService);

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/search', searchRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/search', () => {
    const mockSearchResponse = {
      results: [
        {
          feedback_id: '1',
          text: 'Test feedback',
          category: 'health',
          sentiment: 0.5,
          timestamp: new Date(),
          relevance_score: 0.9
        }
      ],
      query: 'test query',
      totalResults: 1,
      processingTimeMs: 150,
      searchType: 'hybrid' as const
    };

    it('should perform search with valid query', async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);

      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test query' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResponse);
      expect(mockSearchService.search).toHaveBeenCalledWith('test query', {});
    });

    it('should accept search options', async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);

      const searchOptions = {
        query: 'test query',
        limit: 20,
        threshold: 0.5,
        useHybrid: false,
        textWeight: 0.4,
        vectorWeight: 0.6
      };

      const response = await request(app)
        .post('/api/search')
        .send(searchOptions);

      expect(response.status).toBe(200);
      expect(mockSearchService.search).toHaveBeenCalledWith('test query', {
        limit: 20,
        threshold: 0.5,
        useHybrid: false,
        textWeight: 0.4,
        vectorWeight: 0.6
      });
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Query parameter is required and must be a string');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Query cannot be empty');
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test', limit: 150 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Limit must be a number between 1 and 100');
    });

    it('should return 400 for invalid threshold', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test', threshold: 1.5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Threshold must be a number between 0 and 1');
    });

    it('should return 400 for invalid useHybrid', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test', useHybrid: 'true' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('useHybrid must be a boolean');
    });

    it('should return 400 for invalid textWeight', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test', textWeight: -0.1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('textWeight must be a number between 0 and 1');
    });

    it('should return 400 for invalid vectorWeight', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test', vectorWeight: 1.1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('vectorWeight must be a number between 0 and 1');
    });

    it('should handle search service errors', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test query' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error during search');
      expect(response.body.message).toBe('Search failed');
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should return search suggestions', async () => {
      const mockSuggestions = ['road repair', 'road conditions', 'road safety'];
      mockSearchService.getSearchSuggestions.mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'road' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toEqual(mockSuggestions);
      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('road', 5);
    });

    it('should accept custom limit', async () => {
      mockSearchService.getSearchSuggestions.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'road', limit: '10' });

      expect(response.status).toBe(200);
      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('road', 10);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .get('/api/search/suggestions');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Query parameter "q" is required and must be a string');
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'road', limit: '25' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Limit must be a number between 1 and 20');
    });

    it('should handle service errors', async () => {
      mockSearchService.getSearchSuggestions.mockRejectedValue(new Error('Suggestions failed'));

      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'road' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error getting search suggestions');
    });
  });

  describe('GET /api/search/similar/:feedbackId', () => {
    const mockSimilarFeedback = [
      {
        feedback_id: '2',
        text: 'Similar feedback',
        category: 'health',
        sentiment: 0.4,
        timestamp: new Date(),
        relevance_score: 0.8
      }
    ];

    it('should find similar feedback', async () => {
      mockSearchService.findSimilar.mockResolvedValue(mockSimilarFeedback);

      const response = await request(app)
        .get('/api/search/similar/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.feedbackId).toBe('123');
      expect(response.body.data.similar).toEqual(mockSimilarFeedback);
      expect(mockSearchService.findSimilar).toHaveBeenCalledWith('123', 10);
    });

    it('should accept custom limit', async () => {
      mockSearchService.findSimilar.mockResolvedValue(mockSimilarFeedback);

      const response = await request(app)
        .get('/api/search/similar/123')
        .query({ limit: '5' });

      expect(response.status).toBe(200);
      expect(mockSearchService.findSimilar).toHaveBeenCalledWith('123', 5);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/search/similar/123')
        .query({ limit: '100' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Limit must be a number between 1 and 50');
    });

    it('should return 404 for feedback not found', async () => {
      mockSearchService.findSimilar.mockRejectedValue(new Error('Feedback not found'));

      const response = await request(app)
        .get('/api/search/similar/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Feedback not found');
    });

    it('should handle other service errors', async () => {
      mockSearchService.findSimilar.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/search/similar/123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error finding similar feedback');
    });
  });

  describe('POST /api/search/generate-embeddings', () => {
    it('should generate embeddings', async () => {
      const mockResult = { processed: 25, errors: 2 };
      mockSearchService.generateMissingEmbeddings.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/search/generate-embeddings')
        .send({ batchSize: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(25);
      expect(response.body.data.errors).toBe(2);
      expect(response.body.data.batchSize).toBe(30);
      expect(mockSearchService.generateMissingEmbeddings).toHaveBeenCalledWith(30);
    });

    it('should use default batch size', async () => {
      const mockResult = { processed: 10, errors: 0 };
      mockSearchService.generateMissingEmbeddings.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/search/generate-embeddings')
        .send({});

      expect(response.status).toBe(200);
      expect(mockSearchService.generateMissingEmbeddings).toHaveBeenCalledWith(50);
    });

    it('should return 400 for invalid batch size', async () => {
      const response = await request(app)
        .post('/api/search/generate-embeddings')
        .send({ batchSize: 300 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Batch size must be between 1 and 200');
    });

    it('should handle service errors', async () => {
      mockSearchService.generateMissingEmbeddings.mockRejectedValue(new Error('Generation failed'));

      const response = await request(app)
        .post('/api/search/generate-embeddings')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error generating embeddings');
    });
  });

  describe('GET /api/search/analytics', () => {
    it('should return search analytics', async () => {
      const mockAnalytics = {
        totalFeedbackWithEmbeddings: 80,
        totalFeedbackWithoutEmbeddings: 20,
        embeddingCoverage: 80
      };
      mockSearchService.getSearchAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/search/analytics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
      expect(mockSearchService.getSearchAnalytics).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockSearchService.getSearchAnalytics.mockRejectedValue(new Error('Analytics failed'));

      const response = await request(app)
        .get('/api/search/analytics');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error getting search analytics');
    });
  });
});