import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the FeedbackRepository before importing the route
const mockCreate = vi.fn();
vi.mock('../repositories/FeedbackRepository.js', () => {
  return {
    FeedbackRepository: vi.fn().mockImplementation(() => ({
      create: mockCreate
    }))
  };
});

// Import after mocking
const feedbackRoutes = await import('./feedback.js');

const app = express();
app.use(express.json());
app.use('/api/feedback', feedbackRoutes.default);

// Add error handling middleware for tests
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully submit valid feedback', async () => {
    const mockFeedback = {
      id: 'test-id-123',
      text: 'This is a test feedback about road conditions',
      category: 'infrastructure',
      sentiment: 0,
      confidence: 0,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      processed: false,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z')
    };

    mockCreate.mockResolvedValue(mockFeedback);

    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'This is a test feedback about road conditions',
        category: 'infrastructure'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 'test-id-123',
      status: 'success',
      message: 'Feedback submitted successfully',
      data: {
        id: 'test-id-123',
        text: 'This is a test feedback about road conditions',
        category: 'infrastructure',
        timestamp: '2024-01-01T00:00:00.000Z',
        processed: false
      }
    });

    expect(mockCreate).toHaveBeenCalledWith({
      text: 'This is a test feedback about road conditions',
      category: 'infrastructure',
      sentiment: 0,
      confidence: 0
    });
  });

  it('should use default category when not provided', async () => {
    const mockFeedback = {
      id: 'test-id-456',
      text: 'This is feedback without category',
      category: 'other',
      sentiment: 0,
      confidence: 0,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      processed: false,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z')
    };

    mockCreate.mockResolvedValue(mockFeedback);

    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'This is feedback without category'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.category).toBe('other');
    expect(mockCreate).toHaveBeenCalledWith({
      text: 'This is feedback without category',
      category: 'other',
      sentiment: 0,
      confidence: 0
    });
  });

  it('should return 400 when text is missing', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({
        category: 'health'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Validation failed',
      message: 'Feedback text is required',
      details: ['text field is required']
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return 400 when text is empty string', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: '',
        category: 'health'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toContain('text field is required');
  });

  it('should return 400 when text is too short', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'short',
        category: 'health'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toContain('Feedback text must be at least 10 characters long');
  });

  it('should return 400 when text is too long', async () => {
    const longText = 'a'.repeat(5001);
    
    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: longText,
        category: 'health'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toContain('Feedback text cannot exceed 5000 characters');
  });

  it('should return 400 when category is invalid', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'This is a valid feedback text with invalid category',
        category: 'invalid-category'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toContain('Category must be one of: health, infrastructure, safety, other');
  });

  it('should sanitize HTML from feedback text', async () => {
    const mockFeedback = {
      id: 'test-id-789',
      text: 'This is feedback with script content',
      category: 'other',
      sentiment: 0,
      confidence: 0,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      processed: false,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z')
    };

    mockCreate.mockResolvedValue(mockFeedback);

    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'This is feedback with <script>alert("xss")</script> content'
      });

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      text: 'This is feedback with alert("xss") content',
      category: 'other',
      sentiment: 0,
      confidence: 0
    });
  });

  it('should handle database connection errors', async () => {
    mockCreate.mockRejectedValue(
      new Error('Database connection failed')
    );

    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'This is a valid feedback text'
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Service unavailable',
      message: 'Database connection error. Please try again later.'
    });
  });

  it('should handle validation errors from repository', async () => {
    mockCreate.mockRejectedValue(
      new Error('Validation failed: Text is too short')
    );

    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'This is a valid feedback text'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.message).toBe('Validation failed: Text is too short');
  });

  it('should handle unexpected errors', async () => {
    mockCreate.mockRejectedValue(
      new Error('Unexpected error occurred')
    );

    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 'This is a valid feedback text'
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');
  });

  it('should handle non-string text input', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: 123,
        category: 'health'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('should trim whitespace from feedback text', async () => {
    const mockFeedback = {
      id: 'test-id-whitespace',
      text: 'This feedback has trimmed whitespace',
      category: 'other',
      sentiment: 0,
      confidence: 0,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      processed: false,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z')
    };

    mockCreate.mockResolvedValue(mockFeedback);

    const response = await request(app)
      .post('/api/feedback')
      .send({
        text: '   This feedback has trimmed whitespace   '
      });

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      text: 'This feedback has trimmed whitespace',
      category: 'other',
      sentiment: 0,
      confidence: 0
    });
  });
});