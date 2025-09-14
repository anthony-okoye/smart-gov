// Repository exports for SmartGov Assistant

export { BaseRepository } from './BaseRepository.js';
export { FeedbackRepository } from './FeedbackRepository.js';
export { SummaryCacheRepository } from './SummaryCacheRepository.js';
export { AgentLogRepository } from './AgentLogRepository.js';

// Import classes for singleton instances
import { FeedbackRepository } from './FeedbackRepository.js';
import { SummaryCacheRepository } from './SummaryCacheRepository.js';
import { AgentLogRepository } from './AgentLogRepository.js';

// Create singleton instances for easy access
export const feedbackRepository = new FeedbackRepository();
export const summaryCacheRepository = new SummaryCacheRepository();
export const agentLogRepository = new AgentLogRepository();