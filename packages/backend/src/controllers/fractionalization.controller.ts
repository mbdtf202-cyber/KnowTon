import { Request, Response } from 'express';
import { FractionalizationService } from '../services/fractionalization.service';
import { logger } from '../utils/logger';

const fractionalizationService = new FractionalizationService();

export class FractionalizationController {
  async fractionalize(req: Request, res: Response) {
    try {
      const { nftContract, tokenId, totalSupply, name, symbol, reservePrice } = req.body;
      const owner = (req as any).user?.address;

      if (!owner) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!nftContract || !tokenId || !totalSupply || !name || !symbol || !reservePrice) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await fractionalizationService.fractionalize({
        nftContract,
        tokenId,
        owner,
        totalSupply,
        name,
        symbol,
        reservePrice,
      });

      res.json({
        success: true,
        vaultId: result.vaultId,
        txHash: result.txHash,
        totalSupply: result.totalSupply,
        name: result.name,
        symbol: result.symbol,
      });
    } catch (error) {
      logger.error('Error fractionalizing NFT:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getVaultInfo(req: Request, res: Response) {
    try {
      const { vaultId } = req.params;

      if (!vaultId) {
        return res.status(400).json({ error: 'Vault ID is required' });
      }

      const vaultInfo = await fractionalizationService.getVaultInfo(vaultId);

      res.json(vaultInfo);
    } catch (error) {
      logger.error('Error getting vault info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async buyout(req: Request, res: Response) {
    try {
      const { vaultId } = req.params;
      const { price } = req.body;
      const buyer = (req as any).user?.address;

      if (!buyer) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!vaultId || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await fractionalizationService.buyout(vaultId, buyer, price);

      res.json({
        success: true,
        txHash: result.txHash,
        vaultId: result.vaultId,
        buyer: result.buyer,
        price: result.price,
      });
    } catch (error) {
      logger.error('Error buying out vault:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async redeem(req: Request, res: Response) {
    try {
      const { vaultId } = req.params;
      const { amount } = req.body;
      const redeemer = (req as any).user?.address;

      if (!redeemer) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!vaultId || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await fractionalizationService.redeem(vaultId, redeemer, amount);

      res.json({
        success: true,
        txHash: result.txHash,
        vaultId: result.vaultId,
        redeemer: result.redeemer,
        amount: result.amount,
      });
    } catch (error) {
      logger.error('Error redeeming from vault:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async updateReservePrice(req: Request, res: Response) {
    try {
      const { vaultId } = req.params;
      const { newPrice } = req.body;
      const curator = (req as any).user?.address;

      if (!curator) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!vaultId || !newPrice) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await fractionalizationService.updateReservePrice(vaultId, curator, newPrice);

      res.json({
        success: true,
        txHash: result.txHash,
        vaultId: result.vaultId,
        newPrice: result.newPrice,
      });
    } catch (error) {
      logger.error('Error updating reserve price:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getUserVaults(req: Request, res: Response) {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const vaults = await fractionalizationService.getUserVaults(address);

      res.json({
        address,
        vaultsCount: vaults.length,
        vaults,
      });
    } catch (error) {
      logger.error('Error getting user vaults:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAllVaults(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await fractionalizationService.getAllVaults(limit, offset);

      res.json(result);
    } catch (error) {
      logger.error('Error getting all vaults:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
