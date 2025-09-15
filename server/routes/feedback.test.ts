import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the FeedbackRepository before importing the route
const mockCreate = vi.fn();
const mockGetPaginated = vi.fn();
vi.mock('../repositories/FeedbackRepository.js', () => {
  return {
    FeedbackRepository: vi.fn().mockImplementation(() => ({
      create: mockCreate,
      getPaginated: mockGetPaginated
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

describe('GET /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFeedbackList = [
    {
      id: 'feedback-1',
      text: 'The road near my house has potholes',
      category: 'infrastructure',
      sentiment: -0.3,
      confidence: 0.8,
      timestamp: new Date('2024-01-02T10:00:00Z'),
      processed: true,
      created_at: new Date('2024-01-02T10:00:00Z'),
      updated_at: new Date('2024-01-02T10:00:00Z')
    },
    {
      id: 'feedback-2',
      text: 'Great job on the new park!',
      category: 'other',
      sentiment: 0.7,
      confidence: 0.9,
      timestamp: new Date('2024-01-01T15:30:00Z'),
      processed: true,
      created_at: new Date('2024-01-01T15:30:00Z'),
      updated_at: new Date('2024-01-01T15:30:00Z')
    }
  ];

  const expectedFeedbackList = [
    {
      id: 'feedback-1',
      text: 'The road near my house has potholes',
      category: 'infrastructure',
      sentiment: -0.3,
      confidence: 0.8,
      timestamp: '2024-01-02T10:00:00.000Z',
      processed: true,
      created_at: '2024-01-02T10:00:00.000Z',
      updated_at: '2024-01-02T10:00:00.000Z'
    },
    {
      id: 'feedback-2',
      text: 'Great job on the new park!',
      category: 'other',
      sentiment: 0.7,
      confidence: 0.9,
      timestamp: '2024-01-01T15:30:00.000Z',
      processed: true,
      created_at: '2024-01-01T15:30:00.000Z',
      updated_at: '2024-01-01T15:30:00.000Z'
    }
  ];

  it('should retrieve feedback with default pagination', async () => {
    const mockResult = {
      feedback: mockFeedbackList,
      total: 2,
      page: 1,
      limit: 50
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: expectedFeedbackList,
      metadata: {
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      },
      filters: {
        category: 'all',
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }
    });

    expect(mockGetPaginated).toHaveBeenCalledWith(1, 50, undefined, 'timestamp DESC');
  });

  it('should retrieve feedback with custom pagination', async () => {
    const mockResult = {
      feedback: [mockFeedbackList[0]],
      total: 10,
      page: 2,
      limit: 5
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback?page=2&limit=5');

    expect(response.status).toBe(200);
    expect(response.body.metadata).toEqual({
      total: 10,
      page: 2,
      limit: 5,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true
    });

    expect(mockGetPaginated).toHaveBeenCalledWith(2, 5, undefined, 'timestamp DESC');
  });

  it('should filter feedback by category', async () => {
    const mockResult = {
      feedback: [mockFeedbackList[0]],
      total: 1,
      page: 1,
      limit: 50
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback?category=infrastructure');

    expect(response.status).toBe(200);
    expect(response.body.filters.category).toBe('infrastructure');
    expect(mockGetPaginated).toHaveBeenCalledWith(1, 50, 'infrastructure', 'timestamp DESC');
  });

  it('should handle category=all as no filter', async () => {
    const mockResult = {
      feedback: mockFeedbackList,
      total: 2,
      page: 1,
      limit: 50
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback?category=all');

    expect(response.status).toBe(200);
    expect(response.body.filters.category).toBe('all');
    expect(mockGetPaginated).toHaveBeenCalledWith(1, 50, undefined, 'timestamp DESC');
  });

  it('should sort feedback by different fields', async () => {
    const mockResult = {
      feedback: mockFeedbackList,
      total: 2,
      page: 1,
      limit: 50
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback?sortBy=sentiment&sortOrder=asc');

    expect(response.status).toBe(200);
    expect(response.body.filters).toEqual({
      category: 'all',
      sortBy: 'sentiment',
      sortOrder: 'asc'
    });
    expect(mockGetPaginated).toHaveBeenCalledWith(1, 50, undefined, 'sentiment ASC');
  });

  it('should return 400 for invalid page number', async () => {
    const response = await request(app)
      .get('/api/feedback?page=0');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Validation failed',
      message: 'Page number must be greater than 0',
      details: ['page must be a positive integer']
    });

    expect(mockGetPaginated).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid limit', async () => {
    const response = await request(app)
      .get('/api/feedback?limit=101');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Validation failed',
      message: 'Limit must be between 1 and 100',
      details: ['limit must be between 1 and 100']
    });

    expect(mockGetPaginated).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid category', async () => {
    const response = await request(app)
      .get('/api/feedback?category=invalid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Validation failed',
      message: 'Invalid category',
      details: ['category must be one of: health, infrastructure, safety, other, all']
    });

    expect(mockGetPaginated).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid sort field', async () => {
    const response = await request(app)
      .get('/api/feedback?sortBy=invalid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Validation failed',
      message: 'Invalid sort field',
      details: ['sortBy must be one of: timestamp, category, sentiment']
    });

    expect(mockGetPaginated).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid sort order', async () => {
    const response = await request(app)
      .get('/api/feedback?sortOrder=invalid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Validation failed',
      message: 'Invalid sort order',
      details: ['sortOrder must be one of: asc, desc']
    });

    expect(mockGetPaginated).not.toHaveBeenCalled();
  });

  it('should handle database connection errors', async () => {
    mockGetPaginated.mockRejectedValue(
      new Error('Database connection failed')
    );

    const response = await request(app)
      .get('/api/feedback');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Service unavailable',
      message: 'Database connection error. Please try again later.'
    });
  });

  it('should handle unexpected errors', async () => {
    mockGetPaginated.mockRejectedValue(
      new Error('Unexpected error occurred')
    );

    const response = await request(app)
      .get('/api/feedback');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');
  });

  it('should handle empty result set', async () => {
    const mockResult = {
      feedback: [],
      total: 0,
      page: 1,
      limit: 50
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.metadata.total).toBe(0);
    expect(response.body.metadata.totalPages).toBe(0);
  });

  it('should calculate pagination metadata correctly for multiple pages', async () => {
    const mockResult = {
      feedback: [mockFeedbackList[0]],
      total: 25,
      page: 2,
      limit: 10
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback?page=2&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.metadata).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  it('should return 400 for non-numeric page and limit parameters', async () => {
    const response = await request(app)
      .get('/api/feedback?page=abc&limit=xyz');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.message).toBe('Page number must be greater than 0');
    expect(mockGetPaginated).not.toHaveBeenCalled();
  });

  it('should handle case insensitive sort order', async () => {
    const mockResult = {
      feedback: mockFeedbackList,
      total: 2,
      page: 1,
      limit: 50
    };

    mockGetPaginated.mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/feedback?sortOrder=ASC');

    expect(response.status).toBe(200);
    expect(response.body.filters.sortOrder).toBe('ASC');
    expect(mockGetPaginated).toHaveBeenCalledWith(1, 50, undefined, 'timestamp ASC');
  });
});