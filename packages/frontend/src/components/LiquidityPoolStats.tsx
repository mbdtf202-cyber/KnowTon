import { useEffect, useState } from 'react';
import { useSwap } from '../hooks/useSwap';

interface LiquidityPoolStatsProps {
  vaultId: string;
  poolAddress: string;
  fractionalToken: string;
}

export default function LiquidityPoolStats({
  vaultId,
  poolAddress,
}: LiquidityPoolStatsProps) {
  const { poolInfo, loadPoolInfo } = useSwap();
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  useEffect(() => {
    if (vaultId) {
      loadPoolInfo(vaultId);
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        loadPoolInfo(vaultId);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [vaultId, loadPoolInfo]);

  const handleAddLiquidity = async () => {
    // This would call the actual add liquidity function
    console.log('Adding liquidity:', { amount0, amount1, slippage });
    // Reset form
    setAmount0('');
    setAmount1('');
    setShowAddLiquidity(false);
  };

  const currentPrice = poolInfo?.price ? parseFloat(poolInfo.price) : 0;
  const liquidity = poolInfo?.liquidity ? parseFloat(poolInfo.liquidity) : 0;
  const volume24h = poolInfo?.volume24h ? parseFloat(poolInfo.volume24h) : 0;
  const fee = poolInfo?.fee ? poolInfo.fee / 10000 : 0.3;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Liquidity Pool Statistics
          </h2>
          <button
            onClick={() => setShowAddLiquidity(!showAddLiquidity)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add Liquidity
          </button>
        </div>

        {/* Pool Address */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Pool Address</p>
          <div className="flex items-center gap-2">
            <code className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1 overflow-x-auto">
              {poolAddress}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(poolAddress)}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Copy address"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <a
              href={`https://arbiscan.io/address/${poolAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="View on Explorer"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-600 font-medium">Current Price</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {currentPrice.toFixed(6)} ETH
            </p>
            <p className="text-xs text-blue-600 mt-1">per token</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm text-green-600 font-medium">Total Liquidity</p>
            </div>
            <p className="text-2xl font-bold text-green-900">
              ${liquidity.toLocaleString()}
            </p>
            <p className="text-xs text-green-600 mt-1">TVL</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-sm text-purple-600 font-medium">24h Volume</p>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              ${volume24h.toLocaleString()}
            </p>
            <p className="text-xs text-purple-600 mt-1">trading volume</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-orange-600 font-medium">Fee Tier</p>
            </div>
            <p className="text-2xl font-bold text-orange-900">
              {fee}%
            </p>
            <p className="text-xs text-orange-600 mt-1">per swap</p>
          </div>
        </div>

        {/* Add Liquidity Form */}
        {showAddLiquidity && (
          <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Liquidity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ETH Amount
                </label>
                <input
                  type="number"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  placeholder="0.0"
                  step="0.001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token Amount
                </label>
                <input
                  type="number"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  placeholder="0.0"
                  step="0.001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddLiquidity(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLiquidity}
                  disabled={!amount0 || !amount1}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !amount0 || !amount1
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Add Liquidity
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pool Composition */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Pool Composition
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">ETH</span>
                <span className="text-sm text-gray-500">50%</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {(liquidity / 2 / 2000).toFixed(4)} ETH
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ≈ ${(liquidity / 2).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Fractional Token</span>
                <span className="text-sm text-gray-500">50%</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {(liquidity / 2 / (currentPrice * 2000)).toLocaleString()} tokens
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ≈ ${(liquidity / 2).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tx
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Swap
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      0.1 ETH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      100 tokens
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2 mins ago
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href="#"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        0x1234...5678
                      </a>
                    </td>
                  </tr>
                  {/* More rows would be dynamically loaded */}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Liquidity Pools</p>
              <p>
                Liquidity providers earn {fee}% fees on all trades proportional to their share of the pool. 
                Providing liquidity involves price risk (impermanent loss).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
