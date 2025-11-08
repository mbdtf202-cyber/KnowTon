import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSwap } from '../hooks/useSwap';
import { formatUnits, parseUnits } from 'ethers';

interface SwapInterfaceProps {
  vaultId: string;
  fractionalToken: string;
  fractionalTokenSymbol: string;
}

export const SwapInterface: React.FC<SwapInterfaceProps> = ({
  vaultId,
  fractionalToken,
  fractionalTokenSymbol,
}) => {
  const { address } = useAccount();
  const {
    swapState,
    poolInfo,
    quote,
    executeSwap,
    getQuote,
    loadPoolInfo,
  } = useSwap();

  const [fromToken, setFromToken] = useState<'ETH' | 'FRACTION'>('ETH');
  const [toToken, setToToken] = useState<'ETH' | 'FRACTION'>('FRACTION');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5'); // 0.5% default
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (vaultId) {
      loadPoolInfo(vaultId);
    }
  }, [vaultId, loadPoolInfo]);

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      const timer = setTimeout(() => {
        getQuote(vaultId, fromToken, fromAmount, slippage);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromToken, slippage, vaultId, getQuote]);

  useEffect(() => {
    if (quote) {
      setToAmount(formatUnits(quote.amountOut, 18));
    }
  }, [quote]);

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount('');
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      return;
    }

    try {
      await executeSwap(
        vaultId,
        fromToken === 'ETH' ? 'WETH' : fractionalToken,
        toToken === 'ETH' ? 'WETH' : fractionalToken,
        fromAmount,
        slippage
      );
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  const getTokenSymbol = (token: 'ETH' | 'FRACTION') => {
    return token === 'ETH' ? 'ETH' : fractionalTokenSymbol;
  };

  const priceImpact = quote?.priceImpact || 0;
  const isPriceImpactHigh = priceImpact > 5;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Swap Tokens
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Slippage Tolerance
          </label>
          <div className="flex gap-2">
            {['0.1', '0.5', '1.0'].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  slippage === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
              placeholder="Custom"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
        </div>
      )}

      {/* From Token */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          From
        </label>
        <div className="relative">
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="w-full px-4 py-4 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.0"
            step="0.000001"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {getTokenSymbol(fromToken)}
            </span>
          </div>
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center my-4">
        <button
          onClick={handleSwapDirection}
          className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
        >
          <svg
            className="w-6 h-6 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          To (estimated)
        </label>
        <div className="relative">
          <input
            type="text"
            value={toAmount}
            readOnly
            className="w-full px-4 py-4 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
            placeholder="0.0"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {getTokenSymbol(toToken)}
            </span>
          </div>
        </div>
      </div>

      {/* Swap Details */}
      {quote && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Price</span>
            <span className="text-gray-900 dark:text-white font-medium">
              1 {getTokenSymbol(fromToken)} ≈{' '}
              {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)}{' '}
              {getTokenSymbol(toToken)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Price Impact
            </span>
            <span
              className={`font-medium ${
                isPriceImpactHigh
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Minimum Received
            </span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formatUnits(quote.amountOutMinimum, 18)} {getTokenSymbol(toToken)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Liquidity Provider Fee
            </span>
            <span className="text-gray-900 dark:text-white font-medium">
              {poolInfo?.fee ? (poolInfo.fee / 10000).toFixed(2) : '0.30'}%
            </span>
          </div>
        </div>
      )}

      {isPriceImpactHigh && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            ⚠️ High price impact! Consider reducing your swap amount.
          </p>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={
          !address ||
          !fromAmount ||
          parseFloat(fromAmount) <= 0 ||
          swapState.isSwapping
        }
        className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
          !address || !fromAmount || parseFloat(fromAmount) <= 0 || swapState.isSwapping
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {!address
          ? 'Connect Wallet'
          : swapState.isSwapping
          ? 'Swapping...'
          : 'Swap'}
      </button>

      {/* Transaction Status */}
      {swapState.status !== 'idle' && swapState.status !== 'complete' && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {swapState.status === 'approving' && 'Approving tokens...'}
                {swapState.status === 'swapping' && 'Executing swap...'}
                {swapState.status === 'confirming' && 'Confirming transaction...'}
              </p>
              {swapState.txHash && (
                <a
                  href={`https://arbiscan.io/tx/${swapState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View on Explorer →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {swapState.error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            {swapState.error}
          </p>
        </div>
      )}

      {swapState.status === 'complete' && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            ✓ Swap completed successfully!
          </p>
        </div>
      )}

      {/* Pool Stats */}
      {poolInfo && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Pool Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Total Liquidity</p>
              <p className="text-gray-900 dark:text-white font-medium">
                ${poolInfo.liquidity || '0'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">24h Volume</p>
              <p className="text-gray-900 dark:text-white font-medium">
                ${poolInfo.volume24h || '0'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
