import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Mock bond data
const bonds: any[] = [];
let nextBondId = 1;

// Get all bonds
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: bonds,
      total: bonds.length
    });
  } catch (error) {
    logger.error('Get bonds error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bonds' });
  }
});

// Get bond by ID
router.get('/:bondId', (req, res) => {
  try {
    const { bondId } = req.params;
    const bond = bonds.find(b => b.bondId === Number(bondId));
    
    if (!bond) {
      return res.status(404).json({ success: false, error: 'Bond not found' });
    }
    
    res.json({ success: true, data: bond });
  } catch (error) {
    logger.error('Get bond error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bond' });
  }
});

// Create bond (record on-chain bond)
router.post('/', (req, res) => {
  try {
    const { txHash, bondId, issuer, principal, interestRate, duration } = req.body;
    
    const bond = {
      bondId: bondId || nextBondId++,
      issuer,
      principal,
      interestRate,
      duration,
      maturityDate: Date.now() + duration * 1000,
      status: 'active',
      totalInvested: '0',
      totalRedeemed: '0',
      txHash,
      createdAt: new Date().toISOString()
    };
    
    bonds.push(bond);
    
    logger.info(`Bond created: ${bond.bondId}`);
    res.json({ success: true, data: bond });
  } catch (error) {
    logger.error('Create bond error:', error);
    res.status(500).json({ success: false, error: 'Failed to create bond' });
  }
});

// Record investment
router.post('/:bondId/invest', (req, res) => {
  try {
    const { bondId } = req.params;
    const { investor, amount, txHash } = req.body;
    
    const bond = bonds.find(b => b.bondId === Number(bondId));
    if (!bond) {
      return res.status(404).json({ success: false, error: 'Bond not found' });
    }
    
    // Update total invested
    bond.totalInvested = (BigInt(bond.totalInvested) + BigInt(amount)).toString();
    
    // Record investment
    if (!bond.investments) {
      bond.investments = [];
    }
    
    bond.investments.push({
      investor,
      amount,
      txHash,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`Investment recorded for bond ${bondId}: ${amount}`);
    res.json({ success: true, data: bond });
  } catch (error) {
    logger.error('Record investment error:', error);
    res.status(500).json({ success: false, error: 'Failed to record investment' });
  }
});

// Record redemption
router.post('/:bondId/redeem', (req, res) => {
  try {
    const { bondId } = req.params;
    const { investor, amount, txHash } = req.body;
    
    const bond = bonds.find(b => b.bondId === Number(bondId));
    if (!bond) {
      return res.status(404).json({ success: false, error: 'Bond not found' });
    }
    
    // Update total redeemed
    bond.totalRedeemed = (BigInt(bond.totalRedeemed) + BigInt(amount)).toString();
    
    // Record redemption
    if (!bond.redemptions) {
      bond.redemptions = [];
    }
    
    bond.redemptions.push({
      investor,
      amount,
      txHash,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`Redemption recorded for bond ${bondId}: ${amount}`);
    res.json({ success: true, data: bond });
  } catch (error) {
    logger.error('Record redemption error:', error);
    res.status(500).json({ success: false, error: 'Failed to record redemption' });
  }
});

// Get bond statistics
router.get('/:bondId/stats', (req, res) => {
  try {
    const { bondId } = req.params;
    const bond = bonds.find(b => b.bondId === Number(bondId));
    
    if (!bond) {
      return res.status(404).json({ success: false, error: 'Bond not found' });
    }
    
    const stats = {
      bondId: bond.bondId,
      totalInvested: bond.totalInvested,
      totalRedeemed: bond.totalRedeemed,
      investorCount: bond.investments?.length || 0,
      redemptionCount: bond.redemptions?.length || 0,
      utilizationRate: bond.principal > 0 
        ? (Number(bond.totalInvested) / Number(bond.principal) * 100).toFixed(2) + '%'
        : '0%',
      status: bond.status,
      daysToMaturity: Math.max(0, Math.floor((bond.maturityDate - Date.now()) / (1000 * 60 * 60 * 24)))
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Get bond stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bond stats' });
  }
});

export default router;
