import { Router } from 'express';
import { UniswapService } from '../services/uniswap.service';
import { authMiddleware as authenticate } from '../middleware/auth';

const router = Router();
const uniswapService = new UniswapService();

/**
 * @route GET /api/v1/uniswap/pools/:vaultId
 * @desc Get pool information for a vault
 * @access Public
 */
router.get('/pools/:vaultId', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const poolInfo = await uniswapService.getPoolInfo(vaultId);
    
    res.json({
      success: true,
      data: poolInfo,
    });
  } catch (error) {
    console.error('Get pool info error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pool info',
    });
  }
});

/**
 * @route POST /api/v1/uniswap/pools
 * @desc Create a new Uniswap V3 pool for fractional tokens
 * @access Private
 */
router.post('/pools', authenticate, async (req, res) => {
  try {
    const { vaultId, fractionalToken, fee, initialPrice } = req.body;
    
    if (!vaultId || !fractionalToken || !fee || !initialPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const result = await uniswapService.createPool(
      vaultId,
      fractionalToken,
      fee,
      initialPrice
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Create pool error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create pool',
    });
  }
});

/**
 * @route POST /api/v1/uniswap/quote
 * @desc Get swap quote with slippage protection
 * @access Public
 */
router.post('/quote', async (req, res) => {
  try {
    const { vaultId, tokenIn, amountIn, slippageBps } = req.body;
    
    if (!vaultId || !tokenIn || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const quote = await uniswapService.getSwapQuote(
      vaultId,
      tokenIn,
      amountIn,
      slippageBps || 50 // Default 0.5%
    );
    
    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get quote',
    });
  }
});

/**
 * @route POST /api/v1/uniswap/swap
 * @desc Execute token swap
 * @access Private
 */
router.post('/swap', authenticate, async (req, res) => {
  try {
    const { vaultId, tokenIn, tokenOut, amountIn, slippageBps } = req.body;
    const userAddress = (req as any).user?.address;
    
    if (!vaultId || !tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const result = await uniswapService.executeSwap(
      vaultId,
      tokenIn,
      tokenOut,
      amountIn,
      slippageBps || 50,
      userAddress
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Swap error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Swap failed',
    });
  }
});

/**
 * @route POST /api/v1/uniswap/liquidity/add
 * @desc Add liquidity to pool
 * @access Private
 */
router.post('/liquidity/add', authenticate, async (req, res) => {
  try {
    const { vaultId, amount0Desired, amount1Desired, slippageBps } = req.body;
    const userAddress = (req as any).user?.address;
    
    if (!vaultId || !amount0Desired || !amount1Desired) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const result = await uniswapService.addLiquidity(
      vaultId,
      amount0Desired,
      amount1Desired,
      slippageBps || 50,
      userAddress
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Add liquidity error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add liquidity',
    });
  }
});

/**
 * @route POST /api/v1/uniswap/liquidity/remove
 * @desc Remove liquidity from pool
 * @access Private
 */
router.post('/liquidity/remove', authenticate, async (req, res) => {
  try {
    const { vaultId, positionId, liquidity, slippageBps } = req.body;
    const userAddress = (req as any).user?.address;
    
    if (!vaultId || !positionId || !liquidity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const result = await uniswapService.removeLiquidity(
      vaultId,
      positionId,
      liquidity,
      slippageBps || 50,
      userAddress
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Remove liquidity error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove liquidity',
    });
  }
});

/**
 * @route GET /api/v1/uniswap/positions/:vaultId
 * @desc Get all liquidity positions for a vault
 * @access Public
 */
router.get('/positions/:vaultId', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const positions = await uniswapService.getPositions(vaultId);
    
    res.json({
      success: true,
      data: positions,
    });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get positions',
    });
  }
});

/**
 * @route POST /api/v1/uniswap/approve
 * @desc Approve token for swap router
 * @access Private
 */
router.post('/approve', authenticate, async (req, res) => {
  try {
    const { token, spender, amount } = req.body;
    const userAddress = (req as any).user?.address;
    
    if (!token || !spender || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const result = await uniswapService.approveToken(
      token,
      spender,
      amount,
      userAddress
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Approval failed',
    });
  }
});

export default router;
