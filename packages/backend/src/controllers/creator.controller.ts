import { Request, Response, NextFunction } from 'express';
import { CreatorService } from '../services/creator.service';
import { logger } from '../utils/logger';

export class CreatorController {
  private creatorService: CreatorService;

  constructor() {
    this.creatorService = new CreatorService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress, signature, message, profile } = req.body;

      if (!walletAddress || !signature || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const creator = await this.creatorService.registerCreator({
        walletAddress,
        signature,
        message,
        profile,
      });

      logger.info(`Creator registered: ${walletAddress}`);
      res.status(201).json(creator);
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;

      const profile = await this.creatorService.getCreatorProfile(address);

      if (!profile) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      const updates = req.body;

      // Verify the authenticated user matches the address
      if (req.user?.address !== address) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedProfile = await this.creatorService.updateCreatorProfile(
        address,
        updates
      );

      res.json(updatedProfile);
    } catch (error) {
      next(error);
    }
  };

  getPortfolio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;

      const portfolio = await this.creatorService.getCreatorPortfolio(address);

      res.json(portfolio);
    } catch (error) {
      next(error);
    }
  };
}
