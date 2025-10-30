import request from 'supertest';
import express from 'express';
import { ContentController } from '../../controllers/content.controller';
import { ContentService } from '../../services/content.service';
import { prisma } from '../setup';

// Mock the ContentService
jest.mock('../../services/content.service');

describe('ContentController', () => {
  let app: express.Application;
  let contentController: ContentController;
  let mockContentService: jest.Mocked<ContentService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    mockContentService = new ContentService() as jest.Mocked<ContentService>;
    contentController = new ContentController();
    
    // Replace the service instance
    (contentController as any).contentService = mockContentService;
    
    // Setup routes
    app.post('/content/upload', contentController.uploadContent.bind(contentController));
    app.get('/content/:id', contentController.getContent.bind(contentController));
    app.get('/content', contentController.listContent.bind(contentController));
    app.delete('/content/:id', contentController.deleteContent.bind(contentController));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /content/upload', () => {
    it('should upload content successfully', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Content',
        description: 'Test Description',
        contentType: 'image',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContentService.uploadContent.mockResolvedValue(mockContent);

      const response = await request(app)
        .post('/content/upload')
        .send({
          title: 'Test Content',
          description: 'Test Description',
          contentType: 'image',
          file: 'base64encodedfile...'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContent);
    });

    it('should handle upload errors', async () => {
      mockContentService.uploadContent.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/content/upload')
        .send({
          title: 'Test Content',
          contentType: 'image',
          file: 'base64encodedfile...'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Upload failed');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/content/upload')
        .send({
          title: 'Test Content'
          // Missing contentType and file
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /content/:id', () => {
    it('should get content by ID', async () => {
      const mockContent = {
        id: '1',
        title: 'Test Content',
        description: 'Test Description',
        contentType: 'image',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContentService.getContentById.mockResolvedValue(mockContent);

      const response = await request(app)
        .get('/content/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContent);
    });

    it('should return 404 for non-existent content', async () => {
      mockContentService.getContentById.mockResolvedValue(null);

      const response = await request(app)
        .get('/content/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Content not found');
    });
  });

  describe('GET /content', () => {
    it('should list content with pagination', async () => {
      const mockContentList = {
        content: [
          {
            id: '1',
            title: 'Content 1',
            contentType: 'image',
            createdAt: new Date()
          },
          {
            id: '2',
            title: 'Content 2',
            contentType: 'video',
            createdAt: new Date()
          }
        ],
        total: 2,
        page: 1,
        limit: 10
      };

      mockContentService.listContent.mockResolvedValue(mockContentList);

      const response = await request(app)
        .get('/content?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContentList);
    });

    it('should filter content by type', async () => {
      const mockFilteredContent = {
        content: [
          {
            id: '1',
            title: 'Image Content',
            contentType: 'image',
            createdAt: new Date()
          }
        ],
        total: 1,
        page: 1,
        limit: 10
      };

      mockContentService.listContent.mockResolvedValue(mockFilteredContent);

      const response = await request(app)
        .get('/content?contentType=image');

      expect(response.status).toBe(200);
      expect(response.body.data.content).toHaveLength(1);
      expect(response.body.data.content[0].contentType).toBe('image');
    });
  });

  describe('DELETE /content/:id', () => {
    it('should delete content successfully', async () => {
      mockContentService.deleteContent.mockResolvedValue(true);

      const response = await request(app)
        .delete('/content/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Content deleted successfully');
    });

    it('should return 404 when deleting non-existent content', async () => {
      mockContentService.deleteContent.mockResolvedValue(false);

      const response = await request(app)
        .delete('/content/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Content not found');
    });
  });
});