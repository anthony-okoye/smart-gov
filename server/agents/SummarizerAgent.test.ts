import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SummarizerAgent, AgentError } from './SummarizerAgent.js';
import { Feedback } from '../types/database.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import { SummaryCacheRepository } from '../repositories/SummaryCacheRepository.js';

// Mock the repositories
vi.mock('../repositories/FeedbackRepository.js');
vi.mock('../repositories/SummaryCacheRepository.js');

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn()
    }
  }
};

vi.mock('openai', () => {
  return {
    default: vi.fn(() => mockOpenAI)
  };
});

describe('SummarizerAgent', () => {
  let agent: SummarizerAgent;
  let mockFeedbackRepo: any;
  let mockCacheRepo: any;

  const mockFeedback: Feedback[] = [
    {
      id: '1',
      text: 'The hospital wait times are terrible, waited 6 hours',
      category: 'health',
      sentiment: -0.8,
      confidence: 0.9,
      timestamp: new Date('2024-01-15T10:00:00Z'),
      processed: true,
      created_at: new Date('2024-01-15T10:00:00Z'),
      updated_at: new Date('2024-01-15T10:00:00Z')
    },
    {
      id: '2',
      text: 'Road has huge potholes causing damage to cars',
      category: 'infrastructure',
      sentiment: -0.6,
      confidence: 0.8,
      timestamp: new Date('2024-01-15T11:00:00Z'),
      processed: true,
      created_at: new Date('2024-01-15T11:00:00Z'),
      updated_at: new Date('2024-01-15T11:00:00Z')
    },
    {
      id: '3',
      text: 'Police response time was very quick, great service',
      category: 'safety',
      sentiment: 0.7,
      confidence: 0.9,
      timestamp: new Date('2024-01-15T12:00:00Z'),
      processed: true,
      created_at: new Date('2024-01-15T12:00:00Z'),
      updated_at: new Date('2024-01-15T12:00:00Z')
    },
    {
      id: '4',
      text: 'Need better lighting in the park area',
      category: 'safety',
      sentiment: -0.3,
      confidence: 0.7,
      timestamp: new Date('2024-01-15T13:00:00Z'),
      processed: true,
      created_at: new Date('2024-01-15T13:00:00Z'),
      updated_at: new Date('2024-01-15T13:00:00Z')
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup repository mocks
    mockFeedbackRepo = {
      getRecent: vi.fn(),
    };
    
    mockCacheRepo = {
      getValid: vi.fn(),
      set: vi.fn(),
      deleteByCategory: vi.fn(),
      deleteByCacheKey: vi.fn(),
      getStats: vi.fn()
    };

    // Mock the repository constructors
    vi.mocked(FeedbackRepository).mockImplementation(() => mockFeedbackRepo);
    vi.mocked(SummaryCacheRepository).mockImplementation(() => mockCacheRepo);

    agent = new SummarizerAgent('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if no API key provided', () => {
      expect(() => new SummarizerAgent('')).toThrow('OpenAI API key is required');
    });

    it('should initialize with default config', () => {
      const testAgent = new SummarizerAgent('test-key');
      expect(testAgent).toBeInstanceOf(SummarizerAgent);
    });

    it('should accept custom config', () => {
      const config = { maxRetries: 5, retryDelay: 2000, timeout: 45000 };
      const testAgent = new SummarizerAgent('test-key', config);
      expect(testAgent).toBeInstanceOf(SummarizerAgent);
    });
  });

  describe('summarize', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        categoryInsights: [{ category: 'health', count: 1, averageSentiment: -0.8, keyIssues: ['wait times'], trends: [] }],
        emergingTrends: [],
        keyComplaints: [],
        recommendations: []
      };

      mockCacheRepo.getValid.mockResolvedValue({
        summary_data: JSON.stringify(cachedResult)
      });

      const result = await agent.summarize(100);

      expect(result).toEqual(cachedResult);
      expect(mockCacheRepo.getValid).toHaveBeenCalledWith('summary_100');
      expect(mockFeedbackRepo.getRecent).not.toHaveBeenCalled();
    });

    it('should return empty result when no feedback available', async () => {
      mockCacheRepo.getValid.mockResolvedValue(null);
      mockFeedbackRepo.getRecent.mockResolvedValue([]);

      const result = await agent.summarize(100);

      expect(result).toEqual({
        categoryInsights: [],
        emergingTrends: [],
        keyComplaints: [],
        recommendations: []
      });

      expect(mockCacheRepo.set).toHaveBeenCalledWith(
        'summary_100',
        expect.any(Object),
        undefined,
        1 // Short cache time for empty results
      );
    });

    it('should process feedback and generate insights', async () => {
      mockCacheRepo.getValid.mockResolvedValue(null);
      
      // Create enough feedback for trend analysis (minimum 10 items)
      const extendedFeedback = [
        ...mockFeedback,
        ...Array(6).fill(null).map((_, i) => ({
          ...mockFeedback[0],
          id: `extra-${i}`,
          text: `Additional feedback ${i}`
        }))
      ];
      
      mockFeedbackRepo.getRecent.mockResolvedValue(extendedFeedback);

      // Mock OpenAI responses
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"keyIssues": ["Long wait times", "Poor service"], "trends": ["Increasing complaints"]}'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"keyIssues": ["Road damage", "Infrastructure decay"], "trends": ["More pothole reports"]}'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"keyIssues": ["Response times", "Lighting issues"], "trends": ["Mixed feedback"]}'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"trends": [{"topic": "Healthcare delays", "frequency": 8, "sentimentChange": -0.4, "timeframe": "recent"}]}'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"complaints": ["Hospital wait times exceed 6 hours", "Road potholes causing vehicle damage"]}'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"recommendations": ["Increase hospital staffing", "Implement road maintenance program"]}'
            }
          }]
        });

      const result = await agent.summarize(100);

      expect(result.categoryInsights).toHaveLength(3); // health, infrastructure, safety
      expect(result.emergingTrends).toHaveLength(1);
      expect(result.keyComplaints).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);

      expect(mockCacheRepo.set).toHaveBeenCalledWith(
        'summary_100',
        result,
        undefined,
        24 // 24 hour cache
      );
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCacheRepo.getValid.mockResolvedValue(null);
      mockFeedbackRepo.getRecent.mockResolvedValue(mockFeedback);

      // Mock OpenAI to throw error
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(agent.summarize(100)).rejects.toThrow('Failed after 3 attempts');
    });

    it('should handle malformed OpenAI responses', async () => {
      mockCacheRepo.getValid.mockResolvedValue(null);
      mockFeedbackRepo.getRecent.mockResolvedValue([mockFeedback[0]]); // Single feedback item

      // Mock OpenAI with malformed response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }]
      });

      const result = await agent.summarize(100);

      // Should still return a result with empty arrays due to fallback handling
      expect(result.categoryInsights).toHaveLength(1);
      expect(result.categoryInsights[0].keyIssues).toEqual([]);
      expect(result.categoryInsights[0].trends).toEqual([]);
    });
  });

  describe('groupFeedbackByCategory', () => {
    it('should group feedback by category correctly', () => {
      // Access private method through any cast for testing
      const groupedFeedback = (agent as any).groupFeedbackByCategory(mockFeedback);

      expect(groupedFeedback.health).toHaveLength(1);
      expect(groupedFeedback.infrastructure).toHaveLength(1);
      expect(groupedFeedback.safety).toHaveLength(2);
      expect(groupedFeedback.other).toBeUndefined();
    });

    it('should handle feedback without category', () => {
      const feedbackWithoutCategory = [{
        ...mockFeedback[0],
        category: undefined as any
      }];

      const groupedFeedback = (agent as any).groupFeedbackByCategory(feedbackWithoutCategory);

      expect(groupedFeedback.other).toHaveLength(1);
    });
  });

  describe('generateCategoryInsights', () => {
    it('should generate insights for each category', async () => {
      const groupedFeedback = {
        health: [mockFeedback[0]],
        infrastructure: [mockFeedback[1]]
      };

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"keyIssues": ["Wait times"], "trends": ["Increasing complaints"]}'
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"keyIssues": ["Road damage"], "trends": ["Infrastructure decay"]}'
            }
          }]
        });

      const insights = await (agent as any).generateCategoryInsights(groupedFeedback);

      expect(insights).toHaveLength(2);
      expect(insights[0].category).toBe('health');
      expect(insights[0].count).toBe(1);
      expect(insights[0].averageSentiment).toBe(-0.8);
      expect(insights[1].category).toBe('infrastructure');
      expect(insights[1].count).toBe(1);
      expect(insights[1].averageSentiment).toBe(-0.6);
    });

    it('should skip empty categories', async () => {
      const groupedFeedback = {
        health: [],
        infrastructure: [mockFeedback[1]]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"keyIssues": ["Road damage"], "trends": ["Infrastructure decay"]}'
          }
        }]
      });

      const insights = await (agent as any).generateCategoryInsights(groupedFeedback);

      expect(insights).toHaveLength(1);
      expect(insights[0].category).toBe('infrastructure');
    });
  });

  describe('identifyTrends', () => {
    it('should return empty array for insufficient data', async () => {
      const smallFeedback = mockFeedback.slice(0, 5); // Less than 10 items

      const trends = await (agent as any).identifyTrends(smallFeedback);

      expect(trends).toEqual([]);
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should identify trends with sufficient data', async () => {
      const largeFeedback = Array(15).fill(null).map((_, i) => ({
        ...mockFeedback[0],
        id: `${i}`,
        text: `Feedback item ${i}`
      }));

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"trends": [{"topic": "Wait times", "frequency": 7, "sentimentChange": -0.3, "timeframe": "recent"}]}'
          }
        }]
      });

      const trends = await (agent as any).identifyTrends(largeFeedback);

      expect(trends).toHaveLength(1);
      expect(trends[0].topic).toBe('Wait times');
      expect(trends[0].frequency).toBe(7);
      expect(trends[0].sentimentChange).toBe(-0.3);
    });
  });

  describe('extractKeyComplaints', () => {
    it('should return empty array when no negative feedback', async () => {
      const positiveFeedback = [mockFeedback[2]]; // Positive sentiment

      const complaints = await (agent as any).extractKeyComplaints(positiveFeedback);

      expect(complaints).toEqual([]);
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should extract complaints from negative feedback', async () => {
      const negativeFeedback = mockFeedback.filter(f => f.sentiment < -0.3);

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"complaints": ["Long hospital wait times", "Road damage from potholes"]}'
          }
        }]
      });

      const complaints = await (agent as any).extractKeyComplaints(negativeFeedback);

      expect(complaints).toHaveLength(2);
      expect(complaints[0]).toBe('Long hospital wait times');
      expect(complaints[1]).toBe('Road damage from potholes');
    });
  });

  describe('generateRecommendations', () => {
    it('should return empty array when no insights or trends', async () => {
      const recommendations = await (agent as any).generateRecommendations([], []);

      expect(recommendations).toEqual([]);
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should generate recommendations from insights and trends', async () => {
      const insights = [{
        category: 'health',
        count: 5,
        averageSentiment: -0.6,
        keyIssues: ['Wait times'],
        trends: ['Increasing complaints']
      }];

      const trends = [{
        topic: 'Healthcare delays',
        frequency: 8,
        sentimentChange: -0.4,
        timeframe: 'recent'
      }];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"recommendations": ["Increase hospital staffing", "Implement appointment system"]}'
          }
        }]
      });

      const recommendations = await (agent as any).generateRecommendations(insights, trends);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0]).toBe('Increase hospital staffing');
      expect(recommendations[1]).toBe('Implement appointment system');
    });
  });

  describe('response parsing methods', () => {
    it('should parse category insights response correctly', () => {
      const content = '{"keyIssues": ["Issue 1", "Issue 2"], "trends": ["Trend 1"]}';
      const result = (agent as any).parseCategoryInsightsResponse(content);

      expect(result.keyIssues).toEqual(['Issue 1', 'Issue 2']);
      expect(result.trends).toEqual(['Trend 1']);
    });

    it('should handle malformed category insights response', () => {
      const content = 'invalid json';
      const result = (agent as any).parseCategoryInsightsResponse(content);

      expect(result.keyIssues).toEqual([]);
      expect(result.trends).toEqual([]);
    });

    it('should parse trends response correctly', () => {
      const content = '{"trends": [{"topic": "Test", "frequency": 5, "sentimentChange": -0.2, "timeframe": "recent"}]}';
      const result = (agent as any).parseTrendsResponse(content);

      expect(result).toHaveLength(1);
      expect(result[0].topic).toBe('Test');
      expect(result[0].frequency).toBe(5);
      expect(result[0].sentimentChange).toBe(-0.2);
    });

    it('should validate and clamp trend values', () => {
      const content = '{"trends": [{"topic": "Test", "frequency": 15, "sentimentChange": -2.5, "timeframe": "recent"}]}';
      const result = (agent as any).parseTrendsResponse(content);

      expect(result[0].frequency).toBe(10); // Clamped to max 10
      expect(result[0].sentimentChange).toBe(-1); // Clamped to min -1
    });

    it('should parse complaints response correctly', () => {
      const content = '{"complaints": ["Complaint 1", "Complaint 2"]}';
      const result = (agent as any).parseComplaintsResponse(content);

      expect(result).toEqual(['Complaint 1', 'Complaint 2']);
    });

    it('should parse recommendations response correctly', () => {
      const content = '{"recommendations": ["Rec 1", "Rec 2"]}';
      const result = (agent as any).parseRecommendationsResponse(content);

      expect(result).toEqual(['Rec 1', 'Rec 2']);
    });
  });

  describe('cache management', () => {
    it('should invalidate cache', async () => {
      await agent.invalidateCache();

      expect(mockCacheRepo.deleteByCacheKey).toHaveBeenCalledWith('summary_50');
      expect(mockCacheRepo.deleteByCacheKey).toHaveBeenCalledWith('summary_100');
      expect(mockCacheRepo.deleteByCacheKey).toHaveBeenCalledWith('summary_200');
    });

    it('should get cache statistics', async () => {
      const mockStats = { total: 5, valid: 3, expired: 2 };
      mockCacheRepo.getStats.mockResolvedValue(mockStats);

      const stats = await agent.getCacheStats();

      expect(stats).toEqual(mockStats);
      expect(mockCacheRepo.getStats).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should retry on transient errors', async () => {
      mockCacheRepo.getValid.mockResolvedValue(null);
      mockFeedbackRepo.getRecent.mockResolvedValue([mockFeedback[0]]);

      // First call fails, second succeeds
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue({
          choices: [{
            message: {
              content: '{"keyIssues": ["Test"], "trends": []}'
            }
          }]
        });

      // Should not throw due to retry logic
      const result = await agent.summarize(100);
      expect(result).toBeDefined();
    });

    it('should throw AgentError after max retries', async () => {
      mockCacheRepo.getValid.mockResolvedValue(null);
      mockFeedbackRepo.getRecent.mockResolvedValue([mockFeedback[0]]);

      // All calls fail
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Persistent error'));

      await expect(agent.summarize(100)).rejects.toThrow('Failed after 3 attempts');
    });

    it('should handle timeout errors', async () => {
      const shortTimeoutAgent = new SummarizerAgent('test-key', { timeout: 100 });
      mockCacheRepo.getValid.mockResolvedValue(null);
      mockFeedbackRepo.getRecent.mockResolvedValue([mockFeedback[0]]);

      // Mock a slow response
      mockOpenAI.chat.completions.create.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(shortTimeoutAgent.summarize(100)).rejects.toThrow('Failed after 3 attempts');
    });
  });
});