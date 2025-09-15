// Quick manual test to verify the feedback endpoint works
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import feedbackRoutes from './routes/feedback.js';

const app = express();

// Apply same middleware as main server
app.use(cors());
app.use(express.json());
app.use('/api/feedback', feedbackRoutes);

// Test the GET endpoint
console.log('Testing GET /api/feedback endpoint...');

request(app)
  .get('/api/feedback')
  .expect(200)
  .end((err, res) => {
    if (err) {
      console.error('❌ Test failed:', err.message);
    } else {
      console.log('✅ GET /api/feedback endpoint working correctly');
      console.log('Response structure:', {
        status: res.body.status,
        hasData: Array.isArray(res.body.data),
        hasMetadata: !!res.body.metadata,
        hasFilters: !!res.body.filters
      });
    }
  });

// Test with query parameters
request(app)
  .get('/api/feedback?page=1&limit=10&category=health&sortBy=timestamp&sortOrder=desc')
  .expect(200)
  .end((err, res) => {
    if (err) {
      console.error('❌ Query parameter test failed:', err.message);
    } else {
      console.log('✅ Query parameters working correctly');
      console.log('Filters applied:', res.body.filters);
    }
  });

// Test validation
request(app)
  .get('/api/feedback?page=0')
  .expect(400)
  .end((err, res) => {
    if (err) {
      console.error('❌ Validation test failed:', err.message);
    } else {
      console.log('✅ Validation working correctly');
      console.log('Error response:', res.body.error);
    }
  });

console.log('Manual tests completed.');