import { useState } from 'react';
import type { VaultInfo } from '../hooks/useFractionalization';
import { formatAddress } from '../utils/format';

interface FractionDistributionProps {
  vaultId: string;
  vaultInfo: VaultInfo | null;
}

export default function FractionDistribution({
  vaultInfo,
}: FractionDistributionProps) {
  const [sortBy, setSortBy] = useState<'balance' | 'percentage'>('percentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const holders = vaultInfo?.holders || [];

  const sortedHolders = [...holders].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'balance') {
      return multiplier * (parseFloat(a.balance) - parseFloat(b.balance));
    } else {
      return multiplier * (a.percentage - b.percentage);
    }
  });

  const handleSort = (field: 'balance' | 'percentage') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const totalHolders = holders.length;
  const top10Percentage = holders
    .slice(0, 10)
    .reduce((sum, holder) => sum + holder.percentage, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Fraction Distribution
        </h2>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium mb-1">Total Holders</p>
            <p className="text-3xl font-bold text-blue-900">{totalHolders}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium mb-1">Top 10 Holdings</p>
            <p className="text-3xl font-bold text-purple-900">{top10Percentage.toFixed(2)}%</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium mb-1">Total Supply</p>
            <p className="text-3xl font-bold text-green-900">
              {vaultInfo?.totalSupply || '0'}
            </p>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ownership Distribution
          </h3>
          <div className="space-y-3">
            {sortedHolders.slice(0, 10).map((holder, index) => (
              <div key={holder.address} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 text-center">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => window.open(`/profile/${holder.address}`, '_blank')}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {formatAddress(holder.address)}
                    </button>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {holder.percentage.toFixed(2)}%
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({parseFloat(holder.balance).toLocaleString()} tokens)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${holder.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Holder List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              All Holders ({totalHolders})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort('percentage')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  sortBy === 'percentage'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By %
                {sortBy === 'percentage' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                onClick={() => handleSort('balance')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  sortBy === 'balance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Balance
                {sortBy === 'balance' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedHolders.map((holder, index) => (
                    <tr key={holder.address} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => window.open(`/profile/${holder.address}`, '_blank')}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {formatAddress(holder.address)}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {parseFloat(holder.balance).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(holder.percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                            {holder.percentage.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => navigator.clipboard.writeText(holder.address)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy address"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
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
              <p className="font-medium mb-1">About Fraction Distribution</p>
              <p>
                Token holders can vote on proposals to redeem the underlying NFT. 
                A successful vote requires more than 50% of tokens to vote in favor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
