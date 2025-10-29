import { Request, Response, NextFunction } from 'express';
import { ContentService } from '../services/content.service';
import { logger } from '../utils/logger';

export class ContentController {
  private contentService: ContentService;

  constructor() {
    this.contentService = new ContentService();
  }

  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { file, metadata } = req.body;
      const creatorAddress = req.user?.address;

      if (!creatorAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!file || !metadata) {
        return res.status(400).json({ error: 'Missing file or metadata' });
      }

      const content = await this.contentService.uploadContent({
        creatorAddress,
        file,
        metadata,
      });

      logger.info(`Content uploaded: ${content.id}`);
      res.status(201).json(content);
    } catch (error) {
      next(error);
    }
  };

  updateMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const metadata = req.body;
      const creatorAddress = req.user?.address;

      const content = await this.contentService.updateMetadata(
        id,
        creatorAddress!,
        metadata
      );

      res.json(content);
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const status = await this.contentService.getContentStatus(id);

      res.json(status);
    } catch (error) {
      next(error);
    }
  };

  deleteContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const creatorAddress = req.user?.address;

      await this.contentService.deleteContent(id, creatorAddress!);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
