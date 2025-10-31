import { Request, Response } from 'express';
import { LendingService } from '../services/lending.service';

const lendingService = new LendingService();

export class LendingController {
  async supplyCollateral(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, tokenId } = req.body;

      if (!userAddress || !tokenId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await lendingService.supplyCollateral({
        userAddress,
        tokenId,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error in supplyCollateral:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async borrow(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, amount, asset, collateralTokenId } = req.body;

      if (!userAddress || !amount || !asset || !collateralTokenId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await lendingService.borrow({
        userAddress,
        amount,
        asset,
        collateralTokenId,
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

      const result = await lendingService.withdrawCollateral({
        userAddress,
        tokenId,
      });
      res.json(result);
    } catch (error: any) {
      console.error('Error in withdrawCollateral:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getHealthFactor(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      const result = await lendingService.getHealthFactorWithValuation(userAddress);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getHealthFactor:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getUserPosition(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      const result = await lendingService.getUserPositions(userAddress);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getUserPosition:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getNFTValuation(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.params;
      
      if (!tokenId) {
        res.status(400).json({ error: 'Token ID is required' });
        return;
      }

      const valuation = await lendingService.getNFTValuation(tokenId);
      res.json({ tokenId, valuation });
    } catch (error: any) {
      console.error('Error in getNFTValuation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getMaxBorrowAmount(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.params;
      
      if (!tokenId) {
        res.status(400).json({ error: 'Token ID is required' });
        return;
      }

      const result = await lendingService.getMaxBorrowAmount(tokenId);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getMaxBorrowAmount:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getHealthFactorWithValuation(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      
      if (!userAddress) {
        res.status(400).json({ error: 'User address is required' });
        return;
      }

      const result = await lendingService.getHealthFactorWithValuation(userAddress);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getHealthFactorWithValuation:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
