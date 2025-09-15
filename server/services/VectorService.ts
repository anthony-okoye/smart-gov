import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

export interface VectorEmbedding {
  vector: number[];
  model: string;
  dimensions: number;
}

export interface SearchResult {
  feedback_id: string;
  text: string;
  category: string;
  sentiment: number;
  timestamp: Date;
  relevance_score: number;
}

export class VectorService {
  private hf: HfInference;
  private openai: OpenAI | null = null;
  private readonly defaultModel = 'sentence-transformers/all-MiniLM-L6-v2';

  constructor() {
    // Initialize Hugging Face client
    const hfToken = process.env.HUGGINGFACE_API_KEY;
    if (!hfToken) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is required');
    }
    this.hf = new HfInference(hfToken);

    // Initialize OpenAI client if API key is available
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  /**
   * Generate vector embedding for text using Hugging Face
   */
  async generateEmbedding(text: string, model?: string): Promise<VectorEmbedding> {
    try {
      const preprocessedText = this.preprocessText(text);
      const modelName = model || this.defaultModel;
      
      const response = await this.hf.featureExtraction({
        model: modelName,
        inputs: preprocessedText
      });

      // Handle different response formats
      let vector: number[];
      if (Array.isArray(response) && Array.isArray(response[0])) {
        // 2D array - take the first embedding
        vector = response[0] as number[];
      } else if (Array.isArray(response)) {
        // 1D array
        vector = response as number[];
      } else {
        throw new Error('Unexpected response format from embedding model');
      }

      return {
        vector,
        model: modelName,
        dimensions: vector.length
      };
    } catch (error) {
      console.error('Error generating embedding with Hugging Face:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate vector embedding using OpenAI (fallback option)
   */
  async generateEmbeddingOpenAI(text: string): Promise<VectorEmbedding> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    try {
      const preprocessedText = this.preprocessText(text);
      
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: preprocessedText
      });

      const vector = response.data[0].embedding;
      
      return {
        vector,
        model: 'text-embedding-3-small',
        dimensions: vector.length
      };
    } catch (error) {
      console.error('Error generating embedding with OpenAI:', error);
      throw new Error(`Failed to generate OpenAI embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preprocess text for better embedding quality
   */
  private preprocessText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .substring(0, 512); // Limit length for embedding models
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Calculate relevance score (0-1 scale) from cosine similarity
   */
  calculateRelevanceScore(similarity: number): number {
    // Convert cosine similarity (-1 to 1) to relevance score (0 to 1)
    return Math.max(0, (similarity + 1) / 2);
  }

  /**
   * Batch generate embeddings for multiple texts
   */
  async generateBatchEmbeddings(texts: string[], model?: string): Promise<VectorEmbedding[]> {
    const embeddings: VectorEmbedding[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text, model));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        embeddings.push(...batchResults);
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        // Add empty embeddings for failed batch
        for (let j = 0; j < batch.length; j++) {
          embeddings.push({
            vector: [],
            model: model || this.defaultModel,
            dimensions: 0
          });
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return embeddings;
  }
}