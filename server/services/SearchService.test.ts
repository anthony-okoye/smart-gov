import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchService } from './SearchService.js';
import { VectorService } from './VectorService.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';

// Mock the dependencies
vi.mock('./VectorService.js');
vi.mock('../repositories/FeedbackRepository.js');

describe('SearchService', () => {
  let searchService: SearchService;
  let mockVectorService: any;
  let mockFeedbackRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock VectorService
    mockVectorService = {
      generateEmbedding: vi.fn(),
      calculateCosineSimilarity: vi.fn(),
      calculateRelevanceScore: vi.fn()
    };
    (VectorService as any).mockImplementation(() => mockVectorService);

    // Mock FeedbackRepository
    mockFeedbackRepository = {
      hybridSearch: vi.fn(),
      vectorSearch: vi.fn(),
      searchByText: vi.fn(),
      getFeedbackWithoutEmbeddings: vi.fn(),
      updateVectorEmbedding: vi.fn(),
      getById: vi.fn(),
      count: vi.fn()
    };
    (FeedbackRepository as any).mockImplementation(() => mockFeedbackRepository);

    searchService = new SearchService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    const mockEmbedding = {
      vector: [0.1, 0.2, 0.3],
      model: 'test-model',
      dimensions: 3
    };

    const mockSearchResults = [
      {
        feedback_id: '1',
        text: 'Test feedback 1',
        category: 'health',
        sentiment: 0.5,
        timestamp: new Date(),
        relevance_score: 0.9
      },
      {
        feedback_id: '2',
        text: 'Test feedback 2',
        category: 'infrastructure',
        sentiment: -0.2,
        timestamp: new Date(),
        relevance_score: 0.7
      }
    ];

    it('should perform hybrid search by default', async () => {
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.hybridSearch.mockResolvedValue(mockSearchResults);

      const result = await searchService.search('test query');

      expect(mockVectorService.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(mockFeedbackRepository.hybridSearch).toHaveBeenCalledWith(
        'test query',
        mockEmbedding.vector,
        50,
        0.3,
        0.7
      );
      expect(result.searchType).toBe('hybrid');
      expect(result.results).toEqual(mockSearchResults);
      expect(result.totalResults).toBe(2);
    });

    it('should perform vector-only search when useHybrid is false', async () => {
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.vectorSearch.mockResolvedValue(mockSearchResults);

      const result = await searchService.search('test query', { useHybrid: false });

      expect(mockFeedbackRepository.vectorSearch).toHaveBeenCalledWith(
        mockEmbedding.vector,
        50,
        0.1
      );
      expect(result.searchType).toBe('vector');
    });

    it('should use custom search options', async () => {
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.hybridSearch.mockResolvedValue(mockSearchResults);

      const options = {
        limit: 20,
        threshold: 0.5,
        textWeight: 0.4,
        vectorWeight: 0.6
      };

      await searchService.search('test query', options);

      expect(mockFeedbackRepository.hybridSearch).toHaveBeenCalledWith(
        'test query',
        mockEmbedding.vector,
        20,
        0.4,
        0.6
      );
    });

    it('should fallback to text search when vector search fails', async () => {
      mockVectorService.generateEmbedding.mockRejectedValue(new Error('Embedding failed'));
      
      const mockTextResults = [
        {
          id: '1',
          text: 'Test feedback 1',
          category: 'health',
          sentiment: 0.5,
          timestamp: new Date()
        }
      ];
      mockFeedbackRepository.searchByText.mockResolvedValue(mockTextResults);

      const result = await searchService.search('test query');

      expect(mockFeedbackRepository.searchByText).toHaveBeenCalledWith('test query', 50);
      expect(result.searchType).toBe('text');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].feedback_id).toBe('1');
    });

    it('should preprocess query text', async () => {
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.hybridSearch.mockResolvedValue([]);

      await searchService.search('  Test Query!@# With Special Characters  ');

      expect(mockVectorService.generateEmbedding).toHaveBeenCalledWith('test query    with special characters');
    });

    it('should include processing time in response', async () => {
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.hybridSearch.mockResolvedValue([]);

      const result = await searchService.search('test query');

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });
  });

  describe('generateMissingEmbeddings', () => {
    const mockFeedback = [
      {
        id: '1',
        text: 'Test feedback 1',
        category: 'health',
        sentiment: 0.5,
        timestamp: new Date(),
        processed: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '2',
        text: 'Test feedback 2',
        category: 'infrastructure',
        sentiment: -0.2,
        timestamp: new Date(),
        processed: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const mockEmbedding = {
      vector: [0.1, 0.2, 0.3],
      model: 'test-model',
      dimensions: 3
    };

    it('should generate embeddings for feedback without embeddings', async () => {
      mockFeedbackRepository.getFeedbackWithoutEmbeddings.mockResolvedValue(mockFeedback);
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.updateVectorEmbedding.mockResolvedValue(true);

      const result = await searchService.generateMissingEmbeddings(50);

      expect(mockFeedbackRepository.getFeedbackWithoutEmbeddings).toHaveBeenCalledWith(50);
      expect(mockVectorService.generateEmbedding).toHaveBeenCalledTimes(2);
      expect(mockFeedbackRepository.updateVectorEmbedding).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should handle errors during embedding generation', async () => {
      mockFeedbackRepository.getFeedbackWithoutEmbeddings.mockResolvedValue(mockFeedback);
      mockVectorService.generateEmbedding
        .mockResolvedValueOnce(mockEmbedding)
        .mockRejectedValueOnce(new Error('Embedding failed'));
      mockFeedbackRepository.updateVectorEmbedding.mockResolvedValue(true);

      const result = await searchService.generateMissingEmbeddings(50);

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('should handle database update failures', async () => {
      mockFeedbackRepository.getFeedbackWithoutEmbeddings.mockResolvedValue(mockFeedback);
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.updateVectorEmbedding
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await searchService.generateMissingEmbeddings(50);

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('should return early when no feedback needs embeddings', async () => {
      mockFeedbackRepository.getFeedbackWithoutEmbeddings.mockResolvedValue([]);

      const result = await searchService.generateMissingEmbeddings(50);

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockVectorService.generateEmbedding).not.toHaveBeenCalled();
    });
  });

  describe('findSimilar', () => {
    const mockFeedback = {
      id: '1',
      text: 'Test feedback',
      category: 'health',
      sentiment: 0.5,
      timestamp: new Date(),
      processed: true,
      vector_embedding: JSON.stringify({
        vector: [0.1, 0.2, 0.3],
        model: 'test-model',
        dimensions: 3
      }),
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockSimilarResults = [
      {
        feedback_id: '2',
        text: 'Similar feedback',
        category: 'health',
        sentiment: 0.4,
        timestamp: new Date(),
        relevance_score: 0.8
      }
    ];

    it('should find similar feedback using existing embedding', async () => {
      mockFeedbackRepository.getById.mockResolvedValue(mockFeedback);
      mockFeedbackRepository.vectorSearch.mockResolvedValue([
        { feedback_id: '1', relevance_score: 1.0 }, // Source feedback (should be filtered)
        ...mockSimilarResults
      ]);

      const result = await searchService.findSimilar('1', 10);

      expect(mockFeedbackRepository.getById).toHaveBeenCalledWith('1');
      expect(mockFeedbackRepository.vectorSearch).toHaveBeenCalledWith([0.1, 0.2, 0.3], 11, 0.1);
      expect(result).toEqual(mockSimilarResults);
    });

    it('should generate embedding if not exists', async () => {
      const feedbackWithoutEmbedding = { ...mockFeedback, vector_embedding: null };
      const mockEmbedding = {
        vector: [0.1, 0.2, 0.3],
        model: 'test-model',
        dimensions: 3
      };

      mockFeedbackRepository.getById.mockResolvedValue(feedbackWithoutEmbedding);
      mockVectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockFeedbackRepository.updateVectorEmbedding.mockResolvedValue(true);
      mockFeedbackRepository.vectorSearch.mockResolvedValue(mockSimilarResults);

      const result = await searchService.findSimilar('1', 10);

      expect(mockVectorService.generateEmbedding).toHaveBeenCalledWith('Test feedback');
      expect(mockFeedbackRepository.updateVectorEmbedding).toHaveBeenCalledWith('1', mockEmbedding);
      expect(result).toEqual(mockSimilarResults);
    });

    it('should throw error when feedback not found', async () => {
      mockFeedbackRepository.getById.mockResolvedValue(null);

      await expect(searchService.findSimilar('nonexistent', 10)).rejects.toThrow('Feedback not found');
    });
  });

  describe('getSearchSuggestions', () => {
    const mockFeedback = [
      {
        id: '1',
        text: 'The road needs repair urgently',
        category: 'infrastructure',
        sentiment: -0.5,
        timestamp: new Date()
      },
      {
        id: '2',
        text: 'Road conditions are terrible',
        category: 'infrastructure',
        sentiment: -0.7,
        timestamp: new Date()
      }
    ];

    it('should return search suggestions based on partial query', async () => {
      mockFeedbackRepository.searchByText.mockResolvedValue(mockFeedback);

      const result = await searchService.getSearchSuggestions('road', 5);

      expect(mockFeedbackRepository.searchByText).toHaveBeenCalledWith('road', 10);
      expect(result).toContain('road needs repair');
      expect(result).toContain('road conditions are');
    });

    it('should return empty array for short queries', async () => {
      const result = await searchService.getSearchSuggestions('r', 5);

      expect(result).toEqual([]);
      expect(mockFeedbackRepository.searchByText).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockFeedbackRepository.searchByText.mockRejectedValue(new Error('Database error'));

      const result = await searchService.getSearchSuggestions('road', 5);

      expect(result).toEqual([]);
    });

    it('should limit suggestions to specified count', async () => {
      mockFeedbackRepository.searchByText.mockResolvedValue(mockFeedback);

      const result = await searchService.getSearchSuggestions('road', 1);

      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return search analytics', async () => {
      mockFeedbackRepository.count
        .mockResolvedValueOnce(80) // with embeddings
        .mockResolvedValueOnce(20); // without embeddings

      const result = await searchService.getSearchAnalytics();

      expect(result).toEqual({
        totalFeedbackWithEmbeddings: 80,
        totalFeedbackWithoutEmbeddings: 20,
        embeddingCoverage: 80
      });
    });

    it('should handle zero feedback', async () => {
      mockFeedbackRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await searchService.getSearchAnalytics();

      expect(result.embeddingCoverage).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockFeedbackRepository.count.mockRejectedValue(new Error('Database error'));

      const result = await searchService.getSearchAnalytics();

      expect(result).toEqual({
        totalFeedbackWithEmbeddings: 0,
        totalFeedbackWithoutEmbeddings: 0,
        embeddingCoverage: 0
      });
    });
  });
});