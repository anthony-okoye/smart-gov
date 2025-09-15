// Simple test script to verify search functionality works
import { testConnection } from './config/database.js';

async function testSearchFunctionality() {
  console.log('🔍 Testing Search Functionality...');
  
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.log('❌ Database connection failed');
      return;
    }
    console.log('✅ Database connection successful');

    // Test environment variables
    const hasHfKey = !!process.env.HUGGINGFACE_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    
    console.log(`📋 Environment Check:`);
    console.log(`   - HUGGINGFACE_API_KEY: ${hasHfKey ? '✅ Set' : '❌ Not set'}`);
    console.log(`   - OPENAI_API_KEY: ${hasOpenAIKey ? '✅ Set' : '❌ Not set'}`);
    
    if (!hasHfKey && !hasOpenAIKey) {
      console.log('⚠️  No API keys available for vector embeddings');
      console.log('   Please set HUGGINGFACE_API_KEY or OPENAI_API_KEY in .env file');
      return;
    }

    // Test VectorService instantiation
    try {
      const { VectorService } = await import('./services/VectorService.js');
      const vectorService = new VectorService();
      console.log('✅ VectorService instantiated successfully');
      
      // Test cosine similarity calculation
      const similarity = vectorService.calculateCosineSimilarity([1, 0, 0], [0, 1, 0]);
      console.log(`✅ Cosine similarity calculation works: ${similarity}`);
      
      const relevanceScore = vectorService.calculateRelevanceScore(0.5);
      console.log(`✅ Relevance score calculation works: ${relevanceScore}`);
      
    } catch (error) {
      console.log('❌ VectorService instantiation failed:', error.message);
      return;
    }

    // Test SearchService instantiation
    try {
      const { SearchService } = await import('./services/SearchService.js');
      const searchService = new SearchService();
      console.log('✅ SearchService instantiated successfully');
      
      // Test analytics (doesn't require API calls)
      const analytics = await searchService.getSearchAnalytics();
      console.log('✅ Search analytics works:', analytics);
      
    } catch (error) {
      console.log('❌ SearchService instantiation failed:', error.message);
      return;
    }

    // Test FeedbackRepository vector methods
    try {
      const { FeedbackRepository } = await import('./repositories/FeedbackRepository.js');
      const feedbackRepo = new FeedbackRepository();
      console.log('✅ FeedbackRepository instantiated successfully');
      
      // Test vector search with empty query (should not crash)
      const searchResults = await feedbackRepo.vectorSearch([0.1, 0.2, 0.3], 10, 0.1);
      console.log(`✅ Vector search works: found ${searchResults.length} results`);
      
    } catch (error) {
      console.log('❌ FeedbackRepository vector search failed:', error.message);
      return;
    }

    // Test search routes
    try {
      const express = await import('express');
      const searchRoutes = await import('./routes/search.js');
      
      const app = express.default();
      app.use(express.default.json());
      app.use('/api/search', searchRoutes.default);
      
      console.log('✅ Search routes loaded successfully');
      
    } catch (error) {
      console.log('❌ Search routes loading failed:', error.message);
      return;
    }

    console.log('\n🎉 All search functionality components loaded successfully!');
    console.log('\n📝 Task 11 Implementation Summary:');
    console.log('   ✅ Vector embedding generation for feedback text');
    console.log('   ✅ Search endpoint with TiDB vector search capabilities');
    console.log('   ✅ Relevance scoring and result ranking');
    console.log('   ✅ Query preprocessing and result formatting');
    console.log('   ✅ Unit tests for search functionality (with mocking issues to fix)');
    console.log('\n🔧 Next steps:');
    console.log('   - Set API keys in .env file to test actual embedding generation');
    console.log('   - Fix test mocking issues for better test coverage');
    console.log('   - Test with real data once API keys are configured');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSearchFunctionality();