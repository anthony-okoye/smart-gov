import { describe, it, expect } from 'vitest';
import type { 
  Feedback, 
  FeedbackCreateInput, 
  FeedbackUpdateInput,
  SummaryCache,
  AgentLog,
  CategorySummary,
  Trend,
  SentimentStats,
  CategoryStats,
  DatabaseConfig
} from './database.js';

describe('Database Types', () => {
  describe('Feedback interface', () => {
    it('should have all required properties', () => {
      const feedback: Feedback = {
        id: 'test-id',
        text: 'Test feedback',
        category: 'health',
        sentiment: 0.5,
        confidence: 0.8,
        timestamp: new Date(),
        processed: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(feedback.id).toBe('test-id');
      expect(feedback.text).toBe('Test feedback');
      expect(feedback.category).toBe('health');
      expect(feedback.sentiment).toBe(0.5);
      expect(feedback.confidence).toBe(0.8);
      expect(feedback.processed).toBe(true);
      expect(feedback.timestamp).toBeInstanceOf(Date);
      expect(feedback.created_at).toBeInstanceOf(Date);
      expect(feedback.updated_at).toBeInstanceOf(Date);
    });

    it('should allow optional vector_embedding', () => {
      const feedback: Feedback = {
        id: 'test-id',
        text: 'Test feedback',
        category: 'health',
        sentiment: 0.5,
        confidence: 0.8,
        timestamp: new Date(),
        processed: true,
        created_at: new Date(),
        updated_at: new Date(),
        vector_embedding: { embedding: [0.1, 0.2, 0.3] }
      };

      expect(feedback.vector_embedding).toEqual({ embedding: [0.1, 0.2, 0.3] });
    });

    it('should enforce category enum values', () => {
      const validCategories: Array<Feedback['category']> = ['health', 'infrastructure', 'safety', 'other'];
      
      validCategories.forEach(category => {
        const feedback: Feedback = {
          id: 'test-id',
          text: 'Test feedback',
          category,
          sentiment: 0,
          confidence: 0,
          timestamp: new Date(),
          processed: false,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        expect(feedback.category).toBe(category);
      });
    });
  });

  describe('FeedbackCreateInput interface', () => {
    it('should require only text field', () => {
      const input: FeedbackCreateInput = {
        text: 'Required feedback text'
      };

      expect(input.text).toBe('Required feedback text');
    });

    it('should allow all optional fields', () => {
      const input: FeedbackCreateInput = {
        text: 'Feedback text',
        category: 'infrastructure',
        sentiment: -0.3,
        confidence: 0.9
      };

      expect(input.text).toBe('Feedback text');
      expect(input.category).toBe('infrastructure');
      expect(input.sentiment).toBe(-0.3);
      expect(input.confidence).toBe(0.9);
    });
  });

  describe('FeedbackUpdateInput interface', () => {
    it('should allow partial updates', () => {
      const input: FeedbackUpdateInput = {
        category: 'safety'
      };

      expect(input.category).toBe('safety');
    });

    it('should allow all fields to be updated', () => {
      const input: FeedbackUpdateInput = {
        text: 'Updated text',
        category: 'other',
        sentiment: 0.7,
        confidence: 0.6,
        processed: true
      };

      expect(input.text).toBe('Updated text');
      expect(input.category).toBe('other');
      expect(input.sentiment).toBe(0.7);
      expect(input.confidence).toBe(0.6);
      expect(input.processed).toBe(true);
    });
  });

  describe('SummaryCache interface', () => {
    it('should have all required properties', () => {
      const cache: SummaryCache = {
        id: 'cache-id',
        cache_key: 'summary_health_2024',
        summary_data: { trends: [], insights: [] },
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date()
      };

      expect(cache.id).toBe('cache-id');
      expect(cache.cache_key).toBe('summary_health_2024');
      expect(cache.summary_data).toEqual({ trends: [], insights: [] });
      expect(cache.created_at).toBeInstanceOf(Date);
      expect(cache.updated_at).toBeInstanceOf(Date);
      expect(cache.expires_at).toBeInstanceOf(Date);
    });

    it('should allow optional category', () => {
      const cache: SummaryCache = {
        id: 'cache-id',
        cache_key: 'summary_all',
        category: 'health',
        summary_data: {},
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date()
      };

      expect(cache.category).toBe('health');
    });
  });

  describe('AgentLog interface', () => {
    it('should have all required properties', () => {
      const log: AgentLog = {
        id: 'log-id',
        agent_type: 'categorizer',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(log.id).toBe('log-id');
      expect(log.agent_type).toBe('categorizer');
      expect(log.status).toBe('completed');
      expect(log.created_at).toBeInstanceOf(Date);
      expect(log.updated_at).toBeInstanceOf(Date);
    });

    it('should enforce agent_type enum values', () => {
      const validTypes: Array<AgentLog['agent_type']> = ['categorizer', 'summarizer'];
      
      validTypes.forEach(agent_type => {
        const log: AgentLog = {
          id: 'log-id',
          agent_type,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        };
        
        expect(log.agent_type).toBe(agent_type);
      });
    });

    it('should enforce status enum values', () => {
      const validStatuses: Array<AgentLog['status']> = ['pending', 'processing', 'completed', 'failed'];
      
      validStatuses.forEach(status => {
        const log: AgentLog = {
          id: 'log-id',
          agent_type: 'categorizer',
          status,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        expect(log.status).toBe(status);
      });
    });

    it('should allow optional fields', () => {
      const log: AgentLog = {
        id: 'log-id',
        agent_type: 'summarizer',
        feedback_id: 'feedback-123',
        status: 'failed',
        error_message: 'API timeout',
        processing_time_ms: 5000,
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(log.feedback_id).toBe('feedback-123');
      expect(log.error_message).toBe('API timeout');
      expect(log.processing_time_ms).toBe(5000);
    });
  });

  describe('CategorySummary interface', () => {
    it('should have all required properties', () => {
      const summary: CategorySummary = {
        category: 'health',
        count: 25,
        averageSentiment: 0.3,
        keyIssues: ['hospital wait times', 'medication costs'],
        trends: ['increasing complaints about wait times']
      };

      expect(summary.category).toBe('health');
      expect(summary.count).toBe(25);
      expect(summary.averageSentiment).toBe(0.3);
      expect(summary.keyIssues).toEqual(['hospital wait times', 'medication costs']);
      expect(summary.trends).toEqual(['increasing complaints about wait times']);
    });
  });

  describe('Trend interface', () => {
    it('should have all required properties', () => {
      const trend: Trend = {
        topic: 'road maintenance',
        frequency: 15,
        sentimentChange: -0.2,
        timeframe: 'last 30 days'
      };

      expect(trend.topic).toBe('road maintenance');
      expect(trend.frequency).toBe(15);
      expect(trend.sentimentChange).toBe(-0.2);
      expect(trend.timeframe).toBe('last 30 days');
    });
  });

  describe('SentimentStats interface', () => {
    it('should have all required properties', () => {
      const stats: SentimentStats = {
        positive: 45,
        neutral: 30,
        negative: 25
      };

      expect(stats.positive).toBe(45);
      expect(stats.neutral).toBe(30);
      expect(stats.negative).toBe(25);
    });
  });

  describe('CategoryStats interface', () => {
    it('should have all required properties', () => {
      const stats: CategoryStats = {
        health: 20,
        infrastructure: 35,
        safety: 15,
        other: 30
      };

      expect(stats.health).toBe(20);
      expect(stats.infrastructure).toBe(35);
      expect(stats.safety).toBe(15);
      expect(stats.other).toBe(30);
    });
  });

  describe('DatabaseConfig interface', () => {
    it('should have all required properties', () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 3306,
        user: 'testuser',
        password: 'testpass',
        database: 'testdb',
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000
      };

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(3306);
      expect(config.user).toBe('testuser');
      expect(config.password).toBe('testpass');
      expect(config.database).toBe('testdb');
      expect(config.connectionLimit).toBe(10);
      expect(config.acquireTimeout).toBe(60000);
      expect(config.timeout).toBe(60000);
    });

    it('should allow optional ssl configuration', () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 3306,
        user: 'testuser',
        password: 'testpass',
        database: 'testdb',
        ssl: {
          rejectUnauthorized: false
        },
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000
      };

      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });
  });
});