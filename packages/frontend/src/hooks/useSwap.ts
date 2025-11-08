import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'ethers';
import { uniswapAPI } from '../services/api';

export interface SwapState {
  isSwapping: boolean;
  status: 'idle' | 'approving' | 'swapping' | 'confirming' | 'complete' | 'error';
  error: string | null;
  txHash: string | null;
}

export interface PoolInfo {
  token0: string;
  token1: string;
  fee: number;
  pool: string;
  isActive: boolean;
  price: string;
  liquidity: string;
  volume24h: string;
}

export interface SwapQuote {
  amountOut: bigint;
  amountOutMinimum: bigint;
  priceImpact: number;
  route: string[];
  fee: number;
}

export function useSwap() {
  const { address } = useAccount();

  const [swapState, setSwapState] = useState<SwapState>({
    isSwapping: false,
    status: 'idle',
    error: null,
    txHash: null,
  });

  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  const loadPoolInfo = useCallback(async (vaultId: string) => {
    try {
      const response = await uniswapAPI.getPoolInfo(vaultId);
      setPoolInfo(response.data);
    } catch (error) {
      console.error('Failed to load pool info:', error);
    }
  }, []);

  const getQuote = useCallback(
    async (
      vaultId: string,
      tokenIn: 'ETH' | 'FRACTION',
      amountIn: string,
      slippageBps: string
    ) => {
      try {
        const response = await uniswapAPI.getSwapQuote({
          vaultId,
          tokenIn,
          amountIn,
          slippageBps: parseFloat(slippageBps) * 100, // Convert to basis points
        });

        setQuote({
          amountOut: BigInt(response.data.amountOut),
          amountOutMinimum: BigInt(response.data.amountOutMinimum),
          priceImpact: response.data.priceImpact,
          route: response.data.route,
          fee: response.data.fee,
        });
      } catch (error) {
        console.error('Failed to get quote:', error);
        setQuote(null);
      }
    },
    []
  );

  const executeSwap = useCallback(
    async (
      vaultId: string,
      tokenIn: string,
      tokenOut: string,
      amountIn: string,
      slippageBps: string
    ) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setSwapState({
        isSwapping: true,
        status: 'approving',
        error: null,
        txHash: null,
      });

      try {
        // Step 1: Approve token (if not ETH)
        if (tokenIn !== 'WETH') {
          setSwapState((prev) => ({ ...prev, status: 'approving' }));

          await uniswapAPI.approveToken({
            token: tokenIn,
            spender: 'SWAP_ROUTER', // Would be actual router address
            amount: amountIn,
          });

          // Wait for approval
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Step 2: Execute swap
        setSwapState((prev) => ({ ...prev, status: 'swapping' }));

        const swapResult = await uniswapAPI.executeSwap({
          vaultId,
          tokenIn,
          tokenOut,
          amountIn,
          slippageBps: parseFloat(slippageBps) * 100,
        });

        const txHash = swapResult.data?.txHash || '';

        // Step 3: Wait for confirmation
        setSwapState((prev) => ({
          ...prev,
          status: 'confirming',
          txHash,
        }));

        // Simulate waiting for confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Step 4: Complete
        setSwapState({
          isSwapping: false,
          status: 'complete',
          error: null,
          txHash,
        });

        // Reload pool info
        await loadPoolInfo(vaultId);

        return {
          txHash,
          amountOut: swapResult.data?.amountOut,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Swap failed';
        setSwapState({
          isSwapping: false,
          status: 'error',
          error: errorMessage,
          txHash: null,
        });
        throw error;
      }
    },
    [address, loadPoolInfo]
  );

  const addLiquidity = useCallback(
    async (
      vaultId: string,
      amount0: string,
      amount1: string,
      slippageBps: string
    ) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      try {
        const result = await uniswapAPI.addLiquidity({
          vaultId,
          amount0Desired: amount0,
          amount1Desired: amount1,
          slippageBps: parseFloat(slippageBps) * 100,
        });

        await loadPoolInfo(vaultId);

        return result.data;
      } catch (error) {
        console.error('Failed to add liquidity:', error);
        throw error;
      }
    },
    [address, loadPoolInfo]
  );

  const removeLiquidity = useCallback(
    async (
      vaultId: string,
      positionId: string,
      liquidity: string,
      slippageBps: string
    ) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      try {
        const result = await uniswapAPI.removeLiquidity({
          vaultId,
          positionId,
          liquidity,
          slippageBps: parseFloat(slippageBps) * 100,
        });

        await loadPoolInfo(vaultId);

        return result.data;
      } catch (error) {
        console.error('Failed to remove liquidity:', error);
        throw error;
      }
    },
    [address, loadPoolInfo]
  );

  const reset = useCallback(() => {
    setSwapState({
      isSwapping: false,
      status: 'idle',
      error: null,
      txHash: null,
    });
    setQuote(null);
  }, []);

  return {
    swapState,
    poolInfo,
    quote,
    executeSwap,
    getQuote,
    loadPoolInfo,
    addLiquidity,
    removeLiquidity,
    reset,
  };
}
