// Validation functions for feedback data

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FeedbackInput {
  text: string;
  category?: 'health' | 'infrastructure' | 'safety' | 'other';
  sentiment?: number;
  confidence?: number;
}

/**
 * Validates feedback text input
 */
export function validateFeedbackText(text: string): ValidationResult {
  const errors: string[] = [];

  if (!text || typeof text !== 'string') {
    errors.push('Feedback text is required and must be a string');
  } else {
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      errors.push('Feedback text cannot be empty');
    } else if (trimmedText.length < 10) {
      errors.push('Feedback text must be at least 10 characters long');
    } else if (trimmedText.length > 5000) {
      errors.push('Feedback text cannot exceed 5000 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates feedback category
 */
export function validateFeedbackCategory(category?: string): ValidationResult {
  const errors: string[] = [];
  const validCategories = ['health', 'infrastructure', 'safety', 'other'];

  if (category !== undefined) {
    if (typeof category !== 'string') {
      errors.push('Category must be a string');
    } else if (!validCategories.includes(category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates sentiment score
 */
export function validateSentiment(sentiment?: number): ValidationResult {
  const errors: string[] = [];

  if (sentiment !== undefined) {
    if (typeof sentiment !== 'number') {
      errors.push('Sentiment must be a number');
    } else if (isNaN(sentiment)) {
      errors.push('Sentiment cannot be NaN');
    } else if (sentiment < -1 || sentiment > 1) {
      errors.push('Sentiment must be between -1 and 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates confidence score
 */
export function validateConfidence(confidence?: number): ValidationResult {
  const errors: string[] = [];

  if (confidence !== undefined) {
    if (typeof confidence !== 'number') {
      errors.push('Confidence must be a number');
    } else if (isNaN(confidence)) {
      errors.push('Confidence cannot be NaN');
    } else if (confidence < 0 || confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates complete feedback input
 */
export function validateFeedbackInput(input: FeedbackInput): ValidationResult {
  const allErrors: string[] = [];

  // Validate text
  const textValidation = validateFeedbackText(input.text);
  allErrors.push(...textValidation.errors);

  // Validate category
  const categoryValidation = validateFeedbackCategory(input.category);
  allErrors.push(...categoryValidation.errors);

  // Validate sentiment
  const sentimentValidation = validateSentiment(input.sentiment);
  allErrors.push(...sentimentValidation.errors);

  // Validate confidence
  const confidenceValidation = validateConfidence(input.confidence);
  allErrors.push(...confidenceValidation.errors);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Sanitizes feedback text by trimming whitespace and removing potentially harmful content
 */
export function sanitizeFeedbackText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    // Remove potential HTML/script tags (basic sanitization)
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    .trim()
    // Remove excessive whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes feedback input by applying validation and sanitization
 */
export function normalizeFeedbackInput(input: FeedbackInput): {
  normalized: FeedbackInput;
  validation: ValidationResult;
} {
  const normalized: FeedbackInput = {
    text: sanitizeFeedbackText(input.text),
    category: input.category || 'other',
    sentiment: input.sentiment || 0,
    confidence: input.confidence || 0
  };

  const validation = validateFeedbackInput(normalized);

  return {
    normalized,
    validation
  };
}