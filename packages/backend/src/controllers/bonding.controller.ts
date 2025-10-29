import { Request, Response } from 'express';
import { BondingService } from '../services/bonding.service';

const bondingService = new BondingService();

export class BondingController {
  async issueBond(req: Request, res: Response): Promise<void> {
    try {
      const { ipnftId, totalValue, maturityDate, tranches } = req.body;

      if (!ipnftId || !totalValue || !maturityDate || !tranches) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await bondingService.issueBond({
        ipnftId,
        totalValue,
        maturityDate,
        tranches,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error in issueBond:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async invest(req: Request, res: Response): Promise<void> {
    try {
      const { bondId, trancheId, amount, investor } = req.body;

      if (!bondId || trancheId === undefined || !amount || !investor) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await bondingService.invest({
        bondId: parseInt(bondId),
        trancheId: parseInt(trancheId),
        amount,
        investor,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error in invest:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async distributeRevenue(req: Request, res: Response): Promise<void> {
    try {
      const { bondId } = req.params;
      const { amount } = req.body;

      if (!amount) {
        res.status(400).json({ error: 'Missing amount' });
        return;
      }

      const result = await bondingService.distributeRevenue(
        parseInt(bondId),
        amount
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error in distributeRevenue:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async redeem(req: Request, res: Response): Promise<void> {
    try {
      const { bondId, trancheId } = req.params;
      const { investor } = req.body;

      if (!investor) {
        res.status(400).json({ error: 'Missing investor address' });
        return;
      }

      const result = await bondingService.redeem(
        parseInt(bondId),
        parseInt(trancheId),
        investor
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error in redeem:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getBondInfo(req: Request, res: Response): Promise<void> {
    try {
      const { bondId } = req.params;
      const result = await bondingService.getBondInfo(parseInt(bondId));
      res.json(result);
    } catch (error: any) {
      console.error('Error in getBondInfo:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getInvestorBonds(req: Request, res: Response): Promise<void> {
    try {
      const { investor } = req.params;
      const result = await bondingService.getInvestorBonds(investor);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getInvestorBonds:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
