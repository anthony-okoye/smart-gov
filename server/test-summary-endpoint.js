// Test script to add sample feedback and test the summary endpoint
import { FeedbackRepository } from './repositories/FeedbackRepository.js';
import { v4 as uuidv4 } from 'uuid';

const feedbackRepo = new FeedbackRepository();

const sampleFeedback = [
  {
    text: 'The hospital wait times are extremely long, waited 5 hours in emergency room',
    category: 'health',
    sentiment: -0.8,
    confidence: 0.9,
    processed: true
  },
  {
    text: 'Great improvement in road maintenance this year, potholes fixed quickly',
    category: 'infrastructure', 
    sentiment: 0.7,
    confidence: 0.85,
    processed: true
  },
  {
    text: 'Need more police patrols in downtown area, crime has increased',
    category: 'safety',
    sentiment: -0.6,
    confidence: 0.8,
    processed: true
  },
  {
    text: 'The new online services portal is very user-friendly and efficient',
    category: 'other',
    sentiment: 0.8,
    confidence: 0.9,
    processed: true
  },
  {
    text: 'Potholes on Main Street are causing damage to vehicles, please fix',
    category: 'infrastructure',
    sentiment: -0.7,
    confidence: 0.9,
    processed: true
  },
  {
    text: 'Hospital staff are very professional but understaffed during peak hours',
    category: 'health',
    sentiment: -0.3,
    confidence: 0.7,
    processed: true
  },
  {
    text: 'Public transportation is reliable and clean, very satisfied',
    category: 'infrastructure',
    sentiment: 0.9,
    confidence: 0.95,
    processed: true
  },
  {
    text: 'Police response time was excellent during the emergency call',
    category: 'safety',
    sentiment: 0.8,
    confidence: 0.9,
    processed: true
  },
  {
    text: 'City website is outdated and difficult to navigate',
    category: 'other',
    sentiment: -0.5,
    confidence: 0.8,
    processed: true
  },
  {
    text: 'Emergency services need better coordination between departments',
    category: 'safety',
    sentiment: -0.4,
    confidence: 0.75,
    processed: true
  }
];

async function addSampleFeedback() {
  console.log('Adding sample feedback...');
  
  for (const feedback of sampleFeedback) {
    const id = uuidv4();
    await feedbackRepo.create({
      id,
      ...feedback
    });
    console.log(`Added feedback: ${feedback.text.substring(0, 50)}...`);
  }
  
  console.log('Sample feedback added successfully!');
}

async function testSummaryEndpoint() {
  console.log('\nTesting summary endpoint...');
  
  try {
    const response = await fetch('http://localhost:3001/api/summary');
    const data = await response.json();
    
    console.log('Summary Response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing summary endpoint:', error);
  }
}

async function main() {
  try {
    await addSampleFeedback();
    await testSummaryEndpoint();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();