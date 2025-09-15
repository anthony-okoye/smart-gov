import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FeedbackRepository } from './FeedbackRepository.js';
import type { FeedbackCreateInput, FeedbackUpdateInput, Feedback } from '../types/database.js';

// Mock the database module
vi.mock('../config/database.js', () => ({
  executeQuery: vi.fn(),
  getConnection: vi.fn()
}));

// Mock UUID
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}));

describe('FeedbackRepository', () => {
  let repository: FeedbackRepository;
  let mockQuery: any;

  beforeEach(() => {
    repository = new FeedbackRepository();
    mockQuery = vi.fn();
    // Mock the protected query method
    (repository as any).query = mockQuery;
    (repository as any).insert = vi.fn().mockResolvedValue('test-uuid-123');
    (repository as any).findById = vi.fn();
    (repository as any).updateById = vi.fn();
    (repository as any).findMany = vi.fn();
    (repository as any).count = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create feedback with valid input', async () => {
      const input: FeedbackCreateInput = {
        text: 'This is a valid feedback message',
        category: 'health'
      };

      const mockCreatedFeedback: Feedback = {
        id: 'test-uuid-123',
        text: 'This is a valid feedback message',
        category: 'health',
        sentiment: 0,
        confidence: 0,
        timestamp: new Date(),
        processed: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (repository as any).findById.mockResolvedValue(mockCreatedFeedback);

      const result = await repository.create(input);

      expect(result).toEqual(mockCreatedFeedback);
      expect((repository as any).insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-123',
          text: 'This is a valid feedback message',
          category: 'health',
          sentiment: 0,
          confidence: 0,
          processed: false
        })
      );
    });

    it('should apply default values for optional fields', async () => {
      const input: FeedbackCreateInput = {
        text: 'This is a valid feedback message'
      };

      const mockCreatedFeedback: Feedback = {
        id: 'test-uuid-123',
        text: 'This is a valid feedback message',
        category: 'other',
        sentiment: 0,
        confidence: 0,
        timestamp: new Date(),
        processed: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (repository as any).findById.mockResolvedValue(mockCreatedFeedback);

      const result = await repository.create(input);

      expect(result.category).toBe('other');
      expect(result.sentiment).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should reject invalid input', async () => {
      const input: FeedbackCreateInput = {
        text: 'short', // Too short
        category: 'health'
      };

      await expect(repository.create(input)).rejects.toThrow('Validation failed');
    });

    it('should sanitize input text', async () => {
      const input: FeedbackCreateInput = {
        text: '  <script>alert("xss")</script>This is a feedback message  '
      };

      const mockCreatedFeedback: Feedback = {
        id: 'test-uuid-123',
        text: 'This is a feedback message',
        category: 'other',
        sentiment: 0,
        confidence: 0,
        timestamp: new Date(),
        processed: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (repository as any).findById.mockResolvedValue(mockCreatedFeedback);

      const result = await repository.create(input);

      expect((repository as any).insert).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'alert("xss")This is a feedback message'
        })
      );
    });

    it('should throw error if creation fails', async () => {
      const input: FeedbackCreateInput = {
        text: 'This is a valid feedback message'
      };

      (repository as any).findById.mockResolvedValue(null);

      await expect(repository.create(input)).rejects.toThrow('Failed to create feedback');
    });
  });

  describe('update', () => {
    it('should update feedback with valid input', async () => {
      const updateInput: FeedbackUpdateInput = {
        text: 'Updated feedback message',
        category: 'infrastructure'
      };

      const mockUpdatedFeedback: Feedback = {
        id: 'test-uuid-123',
        text: 'Updated feedback message',
        category: 'infrastructure',
        sentiment: 0,
        confidence: 0,
        timestamp: new Date(),
        processed: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (repository as any).updateById.mockResolvedValue(true);
      (repository as any).findById.mockResolvedValue(mockUpdatedFeedback);

      const result = await repository.update('test-uuid-123', updateInput);

      expect(result).toEqual(mockUpdatedFeedback);
      expect((repository as any).updateById).toHaveBeenCalledWith(
        'test-uuid-123',
        expect.objectContaining({
          text: 'Updated feedback message',
          category: 'infrastructure'
        })
      );
    });

    it('should validate text when updating', async () => {
      const updateInput: FeedbackUpdateInput = {
        text: 'short' // Too short
      };

      await expect(repository.update('test-uuid-123', updateInput)).rejects.toThrow('Text validation failed');
    });

    it('should return null if update fails', async () => {
      const updateInput: FeedbackUpdateInput = {
        category: 'health'
      };

      (repository as any).updateById.mockResolvedValue(false);

      const result = await repository.update('test-uuid-123', updateInput);

      expect(result).toBeNull();
    });

    it('should handle partial updates', async () => {
      const updateInput: FeedbackUpdateInput = {
        processed: true
      };

      const mockUpdatedFeedback: Feedback = {
        id: 'test-uuid-123',
        text: 'Original text',
        category: 'other',
        sentiment: 0,
        confidence: 0,
        timestamp: new Date(),
        processed: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (repository as any).updateById.mockResolvedValue(true);
      (repository as any).findById.mockResolvedValue(mockUpdatedFeedback);

      const result = await repository.update('test-uuid-123', updateInput);

      expect(result?.processed).toBe(true);
    });
  });

  describe('getPaginated', () => {
    it('should return paginated results', async () => {
      const mockFeedback: Feedback[] = [
        {
          id: '1',
          text: 'Feedback 1',
          category: 'health',
          sentiment: 0.5,
          confidence: 0.8,
          timestamp: new Date(),
          processed: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (repository as any).findMany.mockResolvedValue(mockFeedback);
      (repository as any).count.mockResolvedValue(1);

      const result = await repository.getPaginated(1, 10);

      expect(result.feedback).toEqual(mockFeedback);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle category filtering', async () => {
      const mockFeedback: Feedback[] = [];
      (repository as any).findMany.mockResolvedValue(mockFeedback);
      (repository as any).count.mockResolvedValue(0);

      await repository.getPaginated(1, 10, 'health');

      expect((repository as any).findMany).toHaveBeenCalledWith(
        'category = ?',
        ['health'],
        'timestamp DESC',
        10,
        0
      );
    });
  });

  describe('markAsProcessed', () => {
    it('should mark feedback as processed', async () => {
      (repository as any).updateById.mockResolvedValue(true);

      const result = await repository.markAsProcessed('test-id', 'health', 0.5, 0.8);

      expect(result).toBe(true);
      expect((repository as any).updateById).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          processed: true,
          category: 'health',
          sentiment: 0.5,
          confidence: 0.8
        })
      );
    });

    it('should handle minimal parameters', async () => {
      (repository as any).updateById.mockResolvedValue(true);

      const result = await repository.markAsProcessed('test-id');

      expect(result).toBe(true);
      expect((repository as any).updateById).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          processed: true
        })
      );
    });
  });

  describe('getUnprocessed', () => {
    it('should return unprocessed feedback', async () => {
      const mockFeedback: Feedback[] = [
        {
          id: '1',
          text: 'Unprocessed feedback',
          category: 'other',
          sentiment: 0,
          confidence: 0,
          timestamp: new Date(),
          processed: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (repository as any).findMany.mockResolvedValue(mockFeedback);

      const result = await repository.getUnprocessed(50);

      expect(result).toEqual(mockFeedback);
      expect((repository as any).findMany).toHaveBeenCalledWith(
        'processed = FALSE',
        [],
        'created_at ASC',
        50
      );
    });
  });

  describe('getSentimentStats', () => {
    it('should return sentiment statistics', async () => {
      const mockStats = {
        positive: 10,
        neutral: 5,
        negative: 3
      };

      mockQuery.mockResolvedValue([mockStats]);

      const result = await repository.getSentimentStats();

      expect(result).toEqual(mockStats);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SUM(CASE WHEN sentiment')
      );
    });

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await repository.getSentimentStats();

      expect(result).toEqual({ positive: 0, neutral: 0, negative: 0 });
    });
  });

  describe('getCategoryStats', () => {
    it('should return category statistics', async () => {
      const mockResults = [
        { category: 'health', count: 5 },
        { category: 'infrastructure', count: 3 }
      ];

      mockQuery.mockResolvedValue(mockResults);

      const result = await repository.getCategoryStats();

      expect(result).toEqual({
        health: 5,
        infrastructure: 3,
        safety: 0,
        other: 0
      });
    });

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await repository.getCategoryStats();

      expect(result).toEqual({
        health: 0,
        infrastructure: 0,
        safety: 0,
        other: 0
      });
    });
  });
});