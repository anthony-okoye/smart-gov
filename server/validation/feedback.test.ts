import { describe, it, expect } from 'vitest';
import {
  validateFeedbackText,
  validateFeedbackCategory,
  validateSentiment,
  validateConfidence,
  validateFeedbackInput,
  sanitizeFeedbackText,
  normalizeFeedbackInput,
  type FeedbackInput
} from './feedback.js';

describe('validateFeedbackText', () => {
  it('should validate valid feedback text', () => {
    const result = validateFeedbackText('This is a valid feedback message');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty or null text', () => {
    expect(validateFeedbackText('').isValid).toBe(false);
    expect(validateFeedbackText('   ').isValid).toBe(false);
    expect(validateFeedbackText(null as any).isValid).toBe(false);
    expect(validateFeedbackText(undefined as any).isValid).toBe(false);
  });

  it('should reject non-string input', () => {
    const result = validateFeedbackText(123 as any);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be a string');
  });

  it('should reject text that is too short', () => {
    const result = validateFeedbackText('short');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('at least 10 characters');
  });

  it('should reject text that is too long', () => {
    const longText = 'a'.repeat(5001);
    const result = validateFeedbackText(longText);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('cannot exceed 5000 characters');
  });

  it('should accept text at boundary lengths', () => {
    const minText = 'a'.repeat(10);
    const maxText = 'a'.repeat(5000);
    
    expect(validateFeedbackText(minText).isValid).toBe(true);
    expect(validateFeedbackText(maxText).isValid).toBe(true);
  });
});

describe('validateFeedbackCategory', () => {
  it('should validate valid categories', () => {
    const validCategories = ['health', 'infrastructure', 'safety', 'other'];
    
    validCategories.forEach(category => {
      const result = validateFeedbackCategory(category);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should accept undefined category', () => {
    const result = validateFeedbackCategory(undefined);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid categories', () => {
    const result = validateFeedbackCategory('invalid');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be one of');
  });

  it('should reject non-string categories', () => {
    const result = validateFeedbackCategory(123 as any);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be a string');
  });
});

describe('validateSentiment', () => {
  it('should validate valid sentiment scores', () => {
    const validScores = [-1, -0.5, 0, 0.5, 1];
    
    validScores.forEach(score => {
      const result = validateSentiment(score);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should accept undefined sentiment', () => {
    const result = validateSentiment(undefined);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject sentiment outside valid range', () => {
    expect(validateSentiment(-1.1).isValid).toBe(false);
    expect(validateSentiment(1.1).isValid).toBe(false);
  });

  it('should reject non-numeric sentiment', () => {
    const result = validateSentiment('0.5' as any);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be a number');
  });

  it('should reject NaN sentiment', () => {
    const result = validateSentiment(NaN);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('cannot be NaN');
  });
});

describe('validateConfidence', () => {
  it('should validate valid confidence scores', () => {
    const validScores = [0, 0.25, 0.5, 0.75, 1];
    
    validScores.forEach(score => {
      const result = validateConfidence(score);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should accept undefined confidence', () => {
    const result = validateConfidence(undefined);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject confidence outside valid range', () => {
    expect(validateConfidence(-0.1).isValid).toBe(false);
    expect(validateConfidence(1.1).isValid).toBe(false);
  });

  it('should reject non-numeric confidence', () => {
    const result = validateConfidence('0.5' as any);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be a number');
  });

  it('should reject NaN confidence', () => {
    const result = validateConfidence(NaN);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('cannot be NaN');
  });
});

describe('validateFeedbackInput', () => {
  it('should validate complete valid input', () => {
    const input: FeedbackInput = {
      text: 'This is a valid feedback message',
      category: 'health',
      sentiment: 0.5,
      confidence: 0.8
    };
    
    const result = validateFeedbackInput(input);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate minimal valid input', () => {
    const input: FeedbackInput = {
      text: 'This is a valid feedback message'
    };
    
    const result = validateFeedbackInput(input);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect all validation errors', () => {
    const input: FeedbackInput = {
      text: 'short',
      category: 'invalid' as any,
      sentiment: 2,
      confidence: -1
    };
    
    const result = validateFeedbackInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(4);
    expect(result.errors.some(e => e.includes('at least 10 characters'))).toBe(true);
    expect(result.errors.some(e => e.includes('must be one of'))).toBe(true);
    expect(result.errors.some(e => e.includes('between -1 and 1'))).toBe(true);
    expect(result.errors.some(e => e.includes('between 0 and 1'))).toBe(true);
  });
});

describe('sanitizeFeedbackText', () => {
  it('should trim whitespace', () => {
    const result = sanitizeFeedbackText('  hello world  ');
    expect(result).toBe('hello world');
  });

  it('should normalize multiple spaces', () => {
    const result = sanitizeFeedbackText('hello    world');
    expect(result).toBe('hello world');
  });

  it('should remove HTML tags', () => {
    const result = sanitizeFeedbackText('hello <script>alert("xss")</script> world');
    expect(result).toBe('hello alert("xss") world');
  });

  it('should remove null bytes', () => {
    const result = sanitizeFeedbackText('hello\0world');
    expect(result).toBe('helloworld');
  });

  it('should handle non-string input', () => {
    const result = sanitizeFeedbackText(123 as any);
    expect(result).toBe('');
  });

  it('should handle complex whitespace and HTML', () => {
    const input = '  <div>Hello\n\n\nworld</div>  <p>test</p>  ';
    const result = sanitizeFeedbackText(input);
    expect(result).toBe('Hello world test');
  });
});

describe('normalizeFeedbackInput', () => {
  it('should normalize and validate valid input', () => {
    const input: FeedbackInput = {
      text: '  This is a valid feedback message  ',
      category: 'health'
    };
    
    const result = normalizeFeedbackInput(input);
    expect(result.validation.isValid).toBe(true);
    expect(result.normalized.text).toBe('This is a valid feedback message');
    expect(result.normalized.category).toBe('health');
    expect(result.normalized.sentiment).toBe(0);
    expect(result.normalized.confidence).toBe(0);
  });

  it('should apply default values', () => {
    const input: FeedbackInput = {
      text: 'This is a valid feedback message'
    };
    
    const result = normalizeFeedbackInput(input);
    expect(result.normalized.category).toBe('other');
    expect(result.normalized.sentiment).toBe(0);
    expect(result.normalized.confidence).toBe(0);
  });

  it('should sanitize text and validate', () => {
    const input: FeedbackInput = {
      text: '  <script>alert("xss")</script>This is a feedback message  '
    };
    
    const result = normalizeFeedbackInput(input);
    expect(result.validation.isValid).toBe(true);
    expect(result.normalized.text).toBe('alert("xss")This is a feedback message');
  });

  it('should return validation errors for invalid input', () => {
    const input: FeedbackInput = {
      text: 'short',
      sentiment: 2
    };
    
    const result = normalizeFeedbackInput(input);
    expect(result.validation.isValid).toBe(false);
    expect(result.validation.errors.length).toBeGreaterThan(0);
  });
});