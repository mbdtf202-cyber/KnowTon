import { SimilarityService } from '../../services/similarity.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SimilarityService', () => {
  let similarityService: SimilarityService;

  beforeEach(() => {
    similarityService = new SimilarityService();
    jest.clearAllMocks();
  });

  describe('searchSimilarContent', () => {
    it('should search for similar content successfully', async () => {
      const mockResponse = {
        data: {
          query_fingerprint: 'abc123',
          total_results: 5,
          results: [
            {
              content_id: 'content1',
              similarity_score: 0.92,
              content_type: 'image',
              metadata_uri: 'ipfs://...',
              timestamp: 1234567890,
              metadata: {},
            },
            {
              content_id: 'content2',
              similarity_score: 0.88,
              content_type: 'image',
              metadata_uri: 'ipfs://...',
              timestamp: 1234567891,
              metadata: {},
            },
          ],
          threshold_used: 0.85,
          processing_time_ms: 1500,
          pagination: {
            offset: 0,
            limit: 10,
            has_next: false,
            has_prev: false,
            next_offset: null,
            prev_offset: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await similarityService.searchSimilarContent(
        'data:image/png;base64,...',
        'image',
        { threshold: 0.85, limit: 10, offset: 0 }
      );

      expect(result.total_results).toBe(5);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].similarity_score).toBe(0.92);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/oracle/similarity/search'),
        expect.objectContaining({
          content_url: 'data:image/png;base64,...',
          content_type: 'image',
          threshold: 0.85,
          limit: 10,
          offset: 0,
        }),
        expect.any(Object)
      );
    });

    it('should handle pagination correctly', async () => {
      const mockResponse = {
        data: {
          query_fingerprint: 'abc123',
          total_results: 25,
          results: Array(10).fill({
            content_id: 'content',
            similarity_score: 0.9,
            content_type: 'image',
          }),
          threshold_used: 0.85,
          processing_time_ms: 1500,
          pagination: {
            offset: 10,
            limit: 10,
            has_next: true,
            has_prev: true,
            next_offset: 20,
            prev_offset: 0,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await similarityService.searchSimilarContent(
        'data:image/png;base64,...',
        'image',
        { threshold: 0.85, limit: 10, offset: 10 }
      );

      expect(result.pagination.has_next).toBe(true);
      expect(result.pagination.has_prev).toBe(true);
      expect(result.pagination.next_offset).toBe(20);
      expect(result.pagination.prev_offset).toBe(0);
    });

    it('should throw error when oracle adapter is not responding', async () => {
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        request: {},
      });

      await expect(
        similarityService.searchSimilarContent('data:image/png;base64,...', 'image')
      ).rejects.toThrow('Oracle adapter is not responding');
    });
  });

  describe('detectPlagiarism', () => {
    it('should detect plagiarism when similarity is high', async () => {
      const mockResponse = {
        data: {
          query_fingerprint: 'abc123',
          total_results: 2,
          results: [
            {
              content_id: 'content1',
              similarity_score: 0.97,
              content_type: 'text',
            },
            {
              content_id: 'content2',
              similarity_score: 0.96,
              content_type: 'text',
            },
          ],
          threshold_used: 0.95,
          processing_time_ms: 1200,
          pagination: {
            offset: 0,
            limit: 5,
            has_next: false,
            has_prev: false,
            next_offset: null,
            prev_offset: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await similarityService.detectPlagiarism(
        'data:text/plain;base64,...',
        'text'
      );

      expect(result.is_plagiarism).toBe(true);
      expect(result.confidence).toBe(0.97);
      expect(result.analysis.max_similarity).toBe(0.97);
      expect(result.analysis.threshold_used).toBe(0.95);
      expect(result.similar_content).toHaveLength(2);
    });

    it('should not detect plagiarism when similarity is low', async () => {
      const mockResponse = {
        data: {
          query_fingerprint: 'abc123',
          total_results: 0,
          results: [],
          threshold_used: 0.95,
          processing_time_ms: 1200,
          pagination: {
            offset: 0,
            limit: 5,
            has_next: false,
            has_prev: false,
            next_offset: null,
            prev_offset: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await similarityService.detectPlagiarism(
        'data:text/plain;base64,...',
        'text'
      );

      expect(result.is_plagiarism).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.similar_content).toHaveLength(0);
    });
  });

  describe('compareTwoContent', () => {
    it('should compare two fingerprints successfully', async () => {
      const mockResponse = {
        data: {
          similarity_score: 0.92,
          is_infringement: false,
          confidence: 0.95,
          matched_features: ['high_similarity', 'similar_content'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await similarityService.compareTwoContent(
        'fingerprint1',
        'fingerprint2'
      );

      expect(result.similarity_score).toBe(0.92);
      expect(result.is_infringement).toBe(false);
      expect(result.matched_features).toContain('high_similarity');
    });
  });

  describe('generateFingerprint', () => {
    it('should generate fingerprint successfully', async () => {
      const mockResponse = {
        data: {
          fingerprint: 'abc123def456',
          features: {
            perceptual_hash: 'phash123',
            feature_vector: Array(128).fill(0.5),
            metadata: { width: 1920, height: 1080 },
          },
          confidence_score: 0.95,
          processing_time_ms: 2500,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await similarityService.generateFingerprint(
        'data:image/png;base64,...',
        'image',
        { title: 'Test Image' }
      );

      expect(result.fingerprint).toBe('abc123def456');
      expect(result.features.feature_vector).toHaveLength(128);
      expect(result.confidence_score).toBe(0.95);
    });
  });

  describe('checkHealth', () => {
    it('should return true when service is healthy', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          version: '1.0.0',
          models_loaded: {
            fingerprint: true,
            valuation: true,
            recommendation: true,
          },
          uptime_seconds: 12345,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await similarityService.checkHealth();

      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await similarityService.checkHealth();

      expect(result).toBe(false);
    });
  });
});
