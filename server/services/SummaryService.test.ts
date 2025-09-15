import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SummaryService } from './SummaryService.js';
import { SummarizerAgent } from '../agents/SummarizerAgent.js';
import { SummaryCacheRepository } from '../repositories/SummaryCacheRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { SummarizationResult } from '../agents/types.js';

// Mock the dependencies
vi.mock('../agents/SummarizerAgent.js');
vi.mock('../repositories/SummaryCacheRepository.js');
vi.mock('../repositories/FeedbackRepository.js');

describe('SummaryService', () => {
  let summaryService: SummaryService;
  let mockSummarizerAgent: Mock;
  let mockCacheRepo: Mock;
  let mockFeedbackRepo: Mock;

  const mockSummaryResult: SummarizationResult = {
    categoryInsights: [
      {
        category: 'health',
        count: 10,
        averageSentiment: -0.3,
        keyIssues: ['Long wait times', 'Staff shortages'],
        trends: ['Increasing complaints about emergency services']
      }
    ],
    emergingTrends: [
      {
        topic: 'Hospital wait times',
        frequency: 8,
        sentimentChange: -0.2,
        timeframe: 'recent'
      }
    ],
    keyComplaints: [
      'Emergency room wait times exceed 4 hours',
      'Insufficient medical staff during peak hours'
    ],
    recommendations: [
      'Increase emergency department staffing',
      'Implement triage system improvements'
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variable mock (optional for Hugging Face)
    process.env.HUGGINGFACE_API_KEY = 'test-api-key';

    // Mock SummarizerAgent
    mockSummarizerAgent = vi.fn().mockImplementation(() => ({
      summarize: vi.fn().mockResolvedValue(mockSummaryResult)
    }));
    (SummarizerAgent as any).mockImplementation(mockSummarizerAgent);

    // Mock SummaryCacheRepository
    mockCacheRepo = vi.fn().mockImplementation(() => ({
      getValid: vi.fn().mockResolvedValue(null),
      getByCacheKey: vi.fn().mockResolvedValue(null),
      deleteByCacheKey: vi.fn().mockResolvedValue(true),
      getStats: vi.fn().mockResolvedValue({
        total: 5,
        valid: 3,
        expired: 2,
        byCategory: { health: 2, infrastructure: 1 }
      }),
      findMany: vi.fn().mockResolvedValue([]),
      cleanup: vi.fn().mockResolvedValue(2)
    }));
    (SummaryCacheRepository as any).mockImplementation(mockCacheRepo);

    // Mock FeedbackRepository
    mockFeedbackRepo = vi.fn().mockImplementation(() => ({
      count: vi.fn().mockResolvedValue(50)
    }));
    (FeedbackRepository as any).mockImplementation(mockFeedbackRepo);

    summaryService = new SummaryService();
  });

  describe('constructor', () => {
    it('should work without HUGGINGFACE_API_KEY (optional)', () => {
      delete process.env.HUGGINGFACE_API_KEY;
      
      expect(() => new SummaryService()).not.toThrow();
    });

    it('should initialize with correct configuration', () => {
      expect(mockSummarizerAgent).toHaveBeenCalledWith('test-api-key', {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
      });
    });
  });

  describe('getSummary', () => {
    it('should return empty summary when no feedback exists', async () => {
      const mockFeedbackRepoInstance = mockFeedbackRepo.mock.results[0].value;
      mockFeedbackRepoInstance.count.mockResolvedValue(0);

      const result = await summaryService.getSummary();

      expect(result).toEqual({
        categoryInsights: [],
        emergingTrends: [],
        keyComplaints: [],
        recommendations: []
      });
    });

    it('should return cached summary when available', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      const cachedData = {
        summary_data: JSON.stringify(mockSummaryResult)
      };
      mockCacheRepoInstance.getValid.mockResolvedValue(cachedData);

      const result = await summaryService.getSummary(100);

      expect(result).toEqual(mockSummaryResult);
      expect(mockCacheRepoInstance.getValid).toHaveBeenCalledWith('summary_100');
    });

    it('should generate fresh summary when cache is not available', async () => {
      const mockSummarizerAgentInstance = mockSummarizerAgent.mock.results[0].value;
      
      const result = await summaryService.getSummary(100);

      expect(result).toEqual(mockSummaryResult);
      expect(mockSummarizerAgentInstance.summarize).toHaveBeenCalledWith(100);
    });

    it('should return fallback cached summary on error', async () => {
      const mockSummarizerAgentInstance = mockSummarizerAgent.mock.results[0].value;
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      
      // Mock summarizer to throw error
      mockSummarizerAgentInstance.summarize.mockRejectedValue(new Error('AI service error'));
      
      // Mock fallback cache
      const fallbackData = {
        summary_data: JSON.stringify(mockSummaryResult)
      };
      mockCacheRepoInstance.getByCacheKey.mockResolvedValue(fallbackData);

      const result = await summaryService.getSummary(100);

      expect(result).toEqual(mockSummaryResult);
      expect(mockCacheRepoInstance.getByCacheKey).toHaveBeenCalledWith('summary_100');
    });

    it('should return empty summary when all else fails', async () => {
      const mockSummarizerAgentInstance = mockSummarizerAgent.mock.results[0].value;
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      
      // Mock summarizer to throw error
      mockSummarizerAgentInstance.summarize.mockRejectedValue(new Error('AI service error'));
      
      // Mock no fallback cache
      mockCacheRepoInstance.getByCacheKey.mockResolvedValue(null);

      const result = await summaryService.getSummary(100);

      expect(result).toEqual({
        categoryInsights: [],
        emergingTrends: [],
        keyComplaints: [],
        recommendations: []
      });
    });
  });

  describe('refreshSummary', () => {
    it('should invalidate cache and generate fresh summary', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      const mockSummarizerAgentInstance = mockSummarizerAgent.mock.results[0].value;

      const result = await summaryService.refreshSummary(100);

      expect(mockCacheRepoInstance.deleteByCacheKey).toHaveBeenCalledWith('summary_100');
      expect(mockSummarizerAgentInstance.summarize).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockSummaryResult);
    });

    it('should throw error when refresh fails', async () => {
      const mockSummarizerAgentInstance = mockSummarizerAgent.mock.results[0].value;
      mockSummarizerAgentInstance.summarize.mockRejectedValue(new Error('AI service error'));

      await expect(summaryService.refreshSummary(100)).rejects.toThrow('AI service error');
    });
  });

  describe('getSummaryStats', () => {
    it('should return comprehensive statistics', async () => {
      const mockFeedbackRepoInstance = mockFeedbackRepo.mock.results[0].value;
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      
      mockFeedbackRepoInstance.count
        .mockResolvedValueOnce(100) // total feedback
        .mockResolvedValueOnce(85); // processed feedback

      const mockCacheEntry = {
        created_at: new Date('2023-01-01T10:00:00Z')
      };
      mockCacheRepoInstance.findMany.mockResolvedValue([mockCacheEntry]);

      const result = await summaryService.getSummaryStats();

      expect(result).toEqual({
        totalFeedback: 100,
        processedFeedback: 85,
        cacheStats: {
          total: 5,
          valid: 3,
          expired: 2,
          byCategory: { health: 2, infrastructure: 1 }
        },
        lastSummaryUpdate: mockCacheEntry.created_at
      });
    });

    it('should handle no cache entries', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      mockCacheRepoInstance.findMany.mockResolvedValue([]);

      const result = await summaryService.getSummaryStats();

      expect(result.lastSummaryUpdate).toBeUndefined();
    });
  });

  describe('isCacheStale', () => {
    it('should return true when no cache exists', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      mockCacheRepoInstance.getByCacheKey.mockResolvedValue(null);

      const result = await summaryService.isCacheStale(100);

      expect(result).toBe(true);
    });

    it('should return true when cache is older than max age', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago
      
      const cacheEntry = {
        created_at: oldDate
      };
      mockCacheRepoInstance.getByCacheKey.mockResolvedValue(cacheEntry);

      const result = await summaryService.isCacheStale(100, 24);

      expect(result).toBe(true);
    });

    it('should return false when cache is fresh', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 1); // 1 hour ago
      
      const cacheEntry = {
        created_at: recentDate
      };
      mockCacheRepoInstance.getByCacheKey.mockResolvedValue(cacheEntry);

      const result = await summaryService.isCacheStale(100, 24);

      expect(result).toBe(false);
    });

    it('should return true on error', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      mockCacheRepoInstance.getByCacheKey.mockRejectedValue(new Error('Database error'));

      const result = await summaryService.isCacheStale(100);

      expect(result).toBe(true);
    });
  });

  describe('cleanupCache', () => {
    it('should clean up old cache entries', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;

      const result = await summaryService.cleanupCache(7);

      expect(mockCacheRepoInstance.cleanup).toHaveBeenCalledWith(7);
      expect(result).toBe(2);
    });

    it('should return 0 on error', async () => {
      const mockCacheRepoInstance = mockCacheRepo.mock.results[0].value;
      mockCacheRepoInstance.cleanup.mockRejectedValue(new Error('Database error'));

      const result = await summaryService.cleanupCache(7);

      expect(result).toBe(0);
    });
  });
});