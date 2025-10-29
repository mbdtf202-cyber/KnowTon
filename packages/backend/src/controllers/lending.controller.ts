import { Request, Response } from 'express';
import { LendingService } from '../services/lending.service';

const lendingService = new LendingService();

export class LendingController {
  async supplyCollateral(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, tokenId, protocol } = req.body;

      if (!userAddress || !tokenId || !protocol) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await lendingService.supplyCollateral({
        userAddress,
        tokenId,
        protocol,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error in supplyCollateral:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async borrow(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, amount, asset } = req.body;

      if (!userAddress || !amount || !asset) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await lendingService.borrow({
        userAddress,
        amount,
        asset,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error in borrow:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async repay(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, amount, asset } = req.body;

      if (!userAddress || !amount || !asset) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await lendingService.repay({
        userAddress,
        amount,
        asset,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error in repay:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async withdrawCollateral(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, tokenId } = req.body;

      if (!userAddress || !tokenId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await lendingService.withdrawCollateral(userAddress, tokenId);
      res.json(result);
    } catch (error: any) {
      console.error('Error in withdrawCollateral:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getHealthFactor(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      const result = await lendingService.getHealthFactor(userAddress);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getHealthFactor:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getUserPosition(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      const result = await lendingService.getUserPosition(userAddress);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getUserPosition:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
