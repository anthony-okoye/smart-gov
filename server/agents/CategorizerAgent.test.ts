import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CategorizerAgent, AgentError } from './CategorizerAgent.js';

// Create mock function
const mockCreate = vi.fn();

// Mock the entire OpenAI module
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate
        }
      };
    }
  };
});

describe('CategorizerAgent', () => {
  let agent: CategorizerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create agent instance
    agent = new CategorizerAgent('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when API key is not provided', () => {
      expect(() => new CategorizerAgent('')).toThrow('OpenAI API key is required');
    });

    it('should create instance with default config', () => {
      const agent = new CategorizerAgent('test-key');
      expect(agent).toBeInstanceOf(CategorizerAgent);
    });

    it('should create instance with custom config', () => {
      const config = { maxRetries: 5, retryDelay: 2000, timeout: 60000 };
      const agent = new CategorizerAgent('test-key', config);
      expect(agent).toBeInstanceOf(CategorizerAgent);
    });
  });

  describe('categorize', () => {
    it('should successfully categorize health-related feedback', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"category": "health", "sentiment": -0.7, "confidence": 0.9}'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await agent.categorize('The hospital wait times are terrible');

      expect(result).toEqual({
        category: 'health',
        sentiment: -0.7,
        confidence: 0.9
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        temperature: 0.1,
        max_tokens: 200
      });
    });

    it('should successfully categorize infrastructure feedback', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"category": "infrastructure", "sentiment": 0.8, "confidence": 0.85}'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await agent.categorize('The new bike lanes are excellent');

      expect(result).toEqual({
        category: 'infrastructure',
        sentiment: 0.8,
        confidence: 0.85
      });
    });

    it('should successfully categorize safety feedback', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"category": "safety", "sentiment": -0.6, "confidence": 0.8}'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await agent.categorize('Crime has increased in our neighborhood');

      expect(result).toEqual({
        category: 'safety',
        sentiment: -0.6,
        confidence: 0.8
      });
    });

    it('should handle invalid category by defaulting to "other"', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"category": "invalid_category", "sentiment": 0.5, "confidence": 0.7}'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await agent.categorize('Some general feedback');

      expect(result.category).toBe('other');
      expect(result.sentiment).toBe(0.5);
      expect(result.confidence).toBe(0.7);
    });

    it('should clamp sentiment values to valid range', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"category": "health", "sentiment": -2.5, "confidence": 1.5}'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await agent.categorize('Test feedback');

      expect(result.sentiment).toBe(-1); // Clamped to -1
      expect(result.confidence).toBe(1); // Clamped to 1
    });

    it('should handle malformed JSON response with fallback', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await agent.categorize('Test feedback');

      expect(result).toEqual({
        category: 'other',
        sentiment: 0,
        confidence: 0.1
      });
    });

    it('should handle empty response with fallback', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(agent.categorize('Test feedback')).rejects.toThrow('No response received from OpenAI');
    });

    it('should throw error for empty input text', async () => {
      await expect(agent.categorize('')).rejects.toThrow('Text input is required for categorization');
      await expect(agent.categorize('   ')).rejects.toThrow('Text input is required for categorization');
    });

    it('should preprocess text correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"category": "other", "sentiment": 0, "confidence": 0.5}'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const longText = 'a'.repeat(2000); // Text longer than 1000 chars
      const textWithSpecialChars = 'Test   text   with   @#$%   special   chars!!!';

      await agent.categorize(longText);
      await agent.categorize(textWithSpecialChars);

      const calls = mockCreate.mock.calls;
      
      // Check that long text was truncated
      expect(calls[0][0].messages[1].content).toContain('a'.repeat(1000));
      expect(calls[0][0].messages[1].content).not.toContain('a'.repeat(1001));
      
      // Check that special characters were cleaned (they should be in the prompt)
      expect(calls[1][0].messages[1].content).toContain('Test text with  special chars!!!');
    });
  });

  describe('retry logic', () => {
    it('should retry on API failures', async () => {
      const agent = new CategorizerAgent('test-key', { maxRetries: 3, retryDelay: 10 });
      
      mockCreate
        .mockRejectedValueOnce(new Error('API Error'))
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '{"category": "other", "sentiment": 0, "confidence": 0.5}'
            }
          }]
        });

      const result = await agent.categorize('Test feedback');

      expect(result.category).toBe('other');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const agent = new CategorizerAgent('test-key', { maxRetries: 2, retryDelay: 10 });
      
      mockCreate.mockRejectedValue(new Error('Persistent API Error'));

      await expect(agent.categorize('Test feedback')).rejects.toThrow('Failed after 2 attempts');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout', async () => {
      const agent = new CategorizerAgent('test-key', { timeout: 100 });
      
      mockCreate.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(agent.categorize('Test feedback')).rejects.toThrow('Failed after 3 attempts');
    });
  });

  describe('error handling', () => {
    it('should handle non-retryable errors', async () => {
      const nonRetryableError = new AgentError('Non-retryable error', 'AUTH_ERROR', false);
      mockCreate.mockRejectedValue(nonRetryableError);

      await expect(agent.categorize('Test feedback')).rejects.toThrow('Non-retryable error');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should create AgentError with correct properties', () => {
      const error = new AgentError('Test message', 'TEST_CODE', false);
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.retryable).toBe(false);
      expect(error.name).toBe('AgentError');
    });
  });
});