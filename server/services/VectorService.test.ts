import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorService } from './VectorService.js';

// Mock the external dependencies
const mockFeatureExtraction = vi.fn();
const mockEmbeddingsCreate = vi.fn();

vi.mock('@huggingface/inference', () => ({
  HfInference: vi.fn().mockImplementation(() => ({
    featureExtraction: mockFeatureExtraction
  }))
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: mockEmbeddingsCreate
    }
  }))
}));

describe('VectorService', () => {
  let vectorService: VectorService;

  beforeEach(() => {
    // Set up environment variables
    process.env.HUGGINGFACE_API_KEY = 'test-hf-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    // Clear all mocks
    vi.clearAllMocks();
    mockFeatureExtraction.mockClear();
    mockEmbeddingsCreate.mockClear();

    vectorService = new VectorService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding using Hugging Face', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockFeatureExtraction.mockResolvedValue(mockEmbedding);

      const result = await vectorService.generateEmbedding('test text');

      expect(result).toEqual({
        vector: mockEmbedding,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        dimensions: 5
      });
      expect(mockFeatureExtraction).toHaveBeenCalledWith({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: 'test text'
      });
    });

    it('should handle 2D array response from Hugging Face', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3, 0.4, 0.5]];
      mockFeatureExtraction.mockResolvedValue(mockEmbedding);

      const result = await vectorService.generateEmbedding('test text');

      expect(result.vector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(result.dimensions).toBe(5);
    });

    it('should preprocess text before generating embedding', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockFeatureExtraction.mockResolvedValue(mockEmbedding);

      await vectorService.generateEmbedding('  Test TEXT with Special!@# Characters  ');

      expect(mockFeatureExtraction).toHaveBeenCalledWith({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: 'test text with special    characters'
      });
    });

    it('should use custom model when specified', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockFeatureExtraction.mockResolvedValue(mockEmbedding);

      await vectorService.generateEmbedding('test text', 'custom-model');

      expect(mockFeatureExtraction).toHaveBeenCalledWith({
        model: 'custom-model',
        inputs: 'test text'
      });
    });

    it('should throw error when Hugging Face API fails', async () => {
      mockFeatureExtraction.mockRejectedValue(new Error('API Error'));

      await expect(vectorService.generateEmbedding('test text')).rejects.toThrow(
        'Failed to generate embedding: API Error'
      );
    });

    it('should throw error for unexpected response format', async () => {
      mockFeatureExtraction.mockResolvedValue('invalid response');

      await expect(vectorService.generateEmbedding('test text')).rejects.toThrow(
        'Failed to generate embedding: Unexpected response format from embedding model'
      );
    });
  });

  describe('generateEmbeddingOpenAI', () => {
    it('should generate embedding using OpenAI', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      const result = await vectorService.generateEmbeddingOpenAI('test text');

      expect(result).toEqual({
        vector: mockEmbedding,
        model: 'text-embedding-3-small',
        dimensions: 5
      });
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text'
      });
    });

    it('should throw error when OpenAI client is not initialized', async () => {
      // Create service without OpenAI key
      delete process.env.OPENAI_API_KEY;
      const serviceWithoutOpenAI = new VectorService();

      await expect(serviceWithoutOpenAI.generateEmbeddingOpenAI('test text')).rejects.toThrow(
        'OpenAI client not initialized'
      );
    });

    it('should throw error when OpenAI API fails', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('OpenAI API Error'));

      await expect(vectorService.generateEmbeddingOpenAI('test text')).rejects.toThrow(
        'Failed to generate OpenAI embedding: OpenAI API Error'
      );
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      
      const similarity = vectorService.calculateCosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    it('should return 1 for identical vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2, 3];
      
      const similarity = vectorService.calculateCosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(1);
    });

    it('should return 0 for zero vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 2, 3];
      
      const similarity = vectorService.calculateCosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    it('should throw error for vectors with different dimensions', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2];
      
      expect(() => vectorService.calculateCosineSimilarity(vectorA, vectorB)).toThrow(
        'Vectors must have the same dimensions'
      );
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should convert cosine similarity to relevance score', () => {
      expect(vectorService.calculateRelevanceScore(1)).toBe(1);
      expect(vectorService.calculateRelevanceScore(0)).toBe(0.5);
      expect(vectorService.calculateRelevanceScore(-1)).toBe(0);
    });

    it('should handle negative similarities', () => {
      expect(vectorService.calculateRelevanceScore(-0.5)).toBe(0.25);
    });

    it('should not return negative scores', () => {
      expect(vectorService.calculateRelevanceScore(-2)).toBe(0);
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbedding1 = [0.1, 0.2, 0.3];
      const mockEmbedding2 = [0.4, 0.5, 0.6];
      
      mockFeatureExtraction
        .mockResolvedValueOnce(mockEmbedding1)
        .mockResolvedValueOnce(mockEmbedding2);

      const texts = ['text 1', 'text 2'];
      const results = await vectorService.generateBatchEmbeddings(texts);

      expect(results).toHaveLength(2);
      expect(results[0].vector).toEqual(mockEmbedding1);
      expect(results[1].vector).toEqual(mockEmbedding2);
    });

    it('should handle errors in batch processing', async () => {
      mockFeatureExtraction
        .mockResolvedValueOnce([0.1, 0.2, 0.3])
        .mockRejectedValueOnce(new Error('API Error'));

      const texts = ['text 1', 'text 2'];
      const results = await vectorService.generateBatchEmbeddings(texts);

      expect(results).toHaveLength(2);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
      expect(results[1].vector).toEqual([]); // Empty vector for failed embedding
      expect(results[1].dimensions).toBe(0);
    });

    it('should process texts in batches', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockFeatureExtraction.mockResolvedValue(mockEmbedding);

      // Create 15 texts to test batching (batch size is 10)
      const texts = Array.from({ length: 15 }, (_, i) => `text ${i}`);
      
      await vectorService.generateBatchEmbeddings(texts);

      // Should be called 15 times (once for each text)
      expect(mockFeatureExtraction).toHaveBeenCalledTimes(15);
    });
  });

  describe('constructor', () => {
    it('should throw error when HUGGINGFACE_API_KEY is not set', () => {
      delete process.env.HUGGINGFACE_API_KEY;
      
      expect(() => new VectorService()).toThrow(
        'HUGGINGFACE_API_KEY environment variable is required'
      );
    });

    it('should initialize without OpenAI when key is not provided', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => new VectorService()).not.toThrow();
    });
  });
});