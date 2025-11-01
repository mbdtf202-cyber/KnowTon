import axios from 'axios';
import { logger } from '../utils/logger';

const ORACLE_ADAPTER_URL = process.env.ORACLE_ADAPTER_URL || 'http://localhost:8001';

export interface SimilarContentItem {
  content_id: string;
  similarity_score: number;
  content_type?: string;
  metadata_uri?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface SimilaritySearchResult {
  query_fingerprint: string;
  total_results: number;
  results: SimilarContentItem[];
  threshold_used: number;
  processing_time_ms: number;
  pagination: {
    offset: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
    next_offset: number | null;
    prev_offset: number | null;
  };
}

export interface SimilaritySearchOptions {
  threshold?: number;
  limit?: number;
  offset?: number;
}

export class SimilarityService {
  /**
   * Search for similar content using AI fingerprinting
   */
  async searchSimilarContent(
    contentUrl: string,
    contentType: 'image' | 'audio' | 'video' | 'text',
    options: SimilaritySearchOptions = {}
  ): Promise<SimilaritySearchResult> {
    try {
      const {
        threshold = 0.85,
        limit = 10,
        offset = 0,
      } = options;

      logger.info('Searching for similar content', {
        contentType,
        threshold,
        limit,
        offset,
      });

      const response = await axios.post(
        `${ORACLE_ADAPTER_URL}/api/v1/oracle/similarity/search`,
        {
          content_url: contentUrl,
          content_type: contentType,
          threshold,
          limit,
          offset,
        },
        {
          timeout: 60000, // 60 second timeout for AI processing
        }
      );

      logger.info('Similar content search completed', {
        total_results: response.data.total_results,
        processing_time_ms: response.data.processing_time_ms,
      });

      return response.data;
    } catch (error) {
      logger.error('Similar content search failed', { error });
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Oracle adapter error: ${error.response.data?.message || error.message}`);
        } else if (error.request) {
          throw new Error('Oracle adapter is not responding. Please ensure the service is running.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Detect potential plagiarism by searching for highly similar content
   */
  async detectPlagiarism(
    contentUrl: string,
    contentType: 'image' | 'audio' | 'video' | 'text'
  ): Promise<{
    is_plagiarism: boolean;
    confidence: number;
    similar_content: SimilarContentItem[];
    analysis: {
      max_similarity: number;
      threshold_used: number;
      total_matches: number;
    };
  }> {
    try {
      logger.info('Detecting plagiarism', { contentType });

      // Use high threshold for plagiarism detection (95%)
      const result = await this.searchSimilarContent(contentUrl, contentType, {
        threshold: 0.95,
        limit: 5,
        offset: 0,
      });

      const max_similarity = result.results.length > 0
        ? Math.max(...result.results.map(item => item.similarity_score))
        : 0;

      const is_plagiarism = max_similarity >= 0.95;

      return {
        is_plagiarism,
        confidence: max_similarity,
        similar_content: result.results,
        analysis: {
          max_similarity,
          threshold_used: 0.95,
          total_matches: result.total_results,
        },
      };
    } catch (error) {
      logger.error('Plagiarism detection failed', { error });
      throw error;
    }
  }

  /**
   * Compare two content items for similarity
   */
  async compareTwoContent(
    fingerprint1: string,
    fingerprint2: string
  ): Promise<{
    similarity_score: number;
    is_infringement: boolean;
    confidence: number;
    matched_features: string[];
  }> {
    try {
      logger.info('Comparing two content items');

      const response = await axios.post(
        `${ORACLE_ADAPTER_URL}/api/v1/oracle/similarity`,
        {
          fingerprint1,
          fingerprint2,
        },
        {
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Content comparison failed', { error });
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Oracle adapter error: ${error.response.data?.message || error.message}`);
        } else if (error.request) {
          throw new Error('Oracle adapter is not responding. Please ensure the service is running.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate fingerprint for content
   */
  async generateFingerprint(
    contentUrl: string,
    contentType: 'image' | 'audio' | 'video' | 'text',
    metadata?: Record<string, any>
  ): Promise<{
    fingerprint: string;
    features: {
      perceptual_hash: string;
      feature_vector: number[];
      metadata: Record<string, any>;
    };
    confidence_score: number;
    processing_time_ms: number;
  }> {
    try {
      logger.info('Generating fingerprint', { contentType });

      const response = await axios.post(
        `${ORACLE_ADAPTER_URL}/api/v1/oracle/fingerprint`,
        {
          content_url: contentUrl,
          content_type: contentType,
          metadata,
          use_cache: true,
        },
        {
          timeout: 60000,
        }
      );

      logger.info('Fingerprint generated', {
        fingerprint: response.data.fingerprint,
        processing_time_ms: response.data.processing_time_ms,
      });

      return response.data;
    } catch (error) {
      logger.error('Fingerprint generation failed', { error });
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Oracle adapter error: ${error.response.data?.message || error.message}`);
        } else if (error.request) {
          throw new Error('Oracle adapter is not responding. Please ensure the service is running.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Check if oracle adapter service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${ORACLE_ADAPTER_URL}/health`, {
        timeout: 5000,
      });
      
      return response.data.status === 'healthy';
    } catch (error) {
      logger.error('Oracle adapter health check failed', { error });
      return false;
    }
  }
}
