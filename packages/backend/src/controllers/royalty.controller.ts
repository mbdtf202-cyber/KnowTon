import { Request, Response } from 'express';
import { RoyaltyService } from '../services/royalty.service';
import { logger } from '../utils/logger';

const royaltyService = new RoyaltyService();

export class RoyaltyController {
  async withdraw(req: Request, res: Response) {
    try {
      const { address, amount } = req.body;

      if (!address || !amount) {
        return res.status(400).json({ error: 'Address and amount are required' });
      }

      // Verify user owns this address
      const userAddress = (req as any).user?.address;
      if (userAddress?.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get user earnings
      const earnings = await royaltyService.getUserEarnings(address);
      const availableBalance = BigInt(earnings.totalEarnings);
      const withdrawAmount = BigInt(amount);

      if (withdrawAmount > availableBalance) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Check minimum withdrawal threshold
      const minWithdrawal = BigInt(process.env.MIN_WITHDRAWAL_AMOUNT || '1000000000000000'); // 0.001 ETH
      if (withdrawAmount < minWithdrawal) {
        return res.status(400).json({ error: 'Amount below minimum withdrawal threshold' });
      }

      // TODO: Implement actual withdrawal logic
      // This would involve:
      // 1. Creating a withdrawal request
      // 2. Processing the withdrawal transaction
      // 3. Updating the database

      logger.info(`Withdrawal requested: ${address}, amount: ${amount}`);

      res.json({
        success: true,
        message: 'Withdrawal request submitted',
        address,
        amount: amount.toString(),
        status: 'pending',
      });
    } catch (error) {
      logger.error('Error processing withdrawal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getEarnings(req: Request, res: Response) {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const earnings = await royaltyService.getUserEarnings(address);

      res.json({
        address,
        totalEarnings: earnings.totalEarnings,
        distributionCount: earnings.distributions.length,
        distributions: earnings.distributions.map((d) => ({
          tokenId: d.tokenId,
          salePrice: d.salePrice,
          seller: d.seller,
          buyer: d.buyer,
          txHash: d.txHash,
          createdAt: d.createdAt,
          distributions: d.distributions,
        })),
      });
    } catch (error) {
      logger.error('Error getting earnings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDistributionHistory(req: Request, res: Response) {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      const history = await royaltyService.getDistributionHistory(tokenId);

      res.json({
        tokenId,
        distributionCount: history.length,
        distributions: history.map((d) => ({
          salePrice: d.salePrice,
          seller: d.seller,
          buyer: d.buyer,
          txHash: d.txHash,
          originalTxHash: d.originalTxHash,
          status: d.status,
          createdAt: d.createdAt,
          distributions: d.distributions,
        })),
      });
    } catch (error) {
      logger.error('Error getting distribution history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getWithdrawalStatus(req: Request, res: Response) {
    try {
      const { txHash } = req.params;

      if (!txHash) {
        return res.status(400).json({ error: 'Transaction hash is required' });
      }

      // TODO: Implement withdrawal status tracking
      // This would query the database for withdrawal records

      res.json({
        txHash,
        status: 'pending',
        message: 'Withdrawal status tracking not yet implemented',
      });
    } catch (error) {
      logger.error('Error getting withdrawal status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
