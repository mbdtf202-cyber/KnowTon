import { useState, useEffect } from 'react';
import { useRoyaltyDistribution } from '../hooks/useRoyaltyDistribution';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';

export default function DistributionDashboard() {
  const { t } = useTranslation();
  const {
    distributions,
    stats,
    pendingDistributions,
    gasEstimate,
    loading,
    error,
    page,
    totalPages,
    executeDistribution,
    processPending,
    setPage,
  } = useRoyaltyDistribution();

  const [executingId, setExecutingId] = useState<string | null>(null);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [showGasModal, setShowGasModal] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<{
    tokenId: string;
    amount: string;
  } | null>(null);

  // Handle single distribution execution
  const handleExecute = async (tokenId: string, amount: string) => {
    setSelectedDistribution({ tokenId, amount });
    setShowGasModal(true);
  };

  // Confirm and execute distribution
  const confirmExecute = async () => {
    if (!selectedDistribution) return;

    setExecutingId(selectedDistribution.tokenId);
    setShowGasModal(false);

    try {
      await executeDistribution(selectedDistribution.tokenId, selectedDistribution.amount);
      alert(t('distribution.executeSuccess'));
    } catch (err: any) {
      alert(t('distribution.executeError') + ': ' + err.message);
    } finally {
      setExecutingId(null);
      setSelectedDistribution(null);
    }
  };

  // Handle batch processing
  const handleProcessPending = async () => {
    if (pendingDistributions.length === 0) {
      alert(t('distribution.noPending'));
      return;
    }

    if (!confirm(t('distribution.confirmBatch', { count: pendingDistributions.length }))) {
      return;
    }

    setProcessingBatch(true);

    try {
      const result = await processPending();
      alert(
        t('distribution.batchSuccess', {
          successful: result.successful,
          failed: result.failed,
        })
      );
    } catch (err: any) {
      alert(t('distribution.batchError') + ': ' + err.message);
    } finally {
      setProcessingBatch(false);
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  // Format ETH amount
  const formatEth = (amount: string) => {
    return parseFloat(amount).toFixed(4) + ' ETH';
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (loading && !distributions.length) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-light rounded-xl p-6 border border-purple-500/20">
            <div className="text-sm text-gray-400 mb-2">{t('distribution.totalRevenue')}</div>
            <div className="text-3xl font-bold text-gradient-cyber">
              {formatEth(stats.totalRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {stats.totalDistributions} {t('distribution.distributions')}
            </div>
          </div>

          <div className="glass-light rounded-xl p-6 border border-cyan-500/20">
            <div className="text-sm text-gray-400 mb-2">{t('distribution.pendingRevenue')}</div>
            <div className="text-3xl font-bold text-gradient-neon">
              {formatEth(stats.pendingRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {stats.pendingDistributions} {t('distribution.pending')}
            </div>
          </div>

          <div className="glass-light rounded-xl p-6 border border-pink-500/20">
            <div className="text-sm text-gray-400 mb-2">{t('distribution.successRate')}</div>
            <div className="text-3xl font-bold text-gradient-cyber">
              {stats.successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {t('distribution.average')}: {formatEth(stats.averageDistribution)}
            </div>
          </div>
        </div>
      )}

      {/* Pending Distributions Section */}
      {pendingDistributions.length > 0 && (
        <div className="glass rounded-xl p-6 border border-yellow-500/30">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {t('distribution.pendingTitle')}
              </h3>
              <p className="text-sm text-gray-400">
                {pendingDistributions.length} {t('distribution.pendingWaiting')}
              </p>
            </div>
            <button
              onClick={handleProcessPending}
              disabled={processingBatch}
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingBatch ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  {t('distribution.processing')}
                </span>
              ) : (
                <>⚡ {t('distribution.processAll')}</>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {pendingDistributions.slice(0, 5).map((dist, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-4 glass-light rounded-lg border border-yellow-500/20"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    Token #{dist.tokenId}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(dist.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-400">
                    {formatEth(dist.amount)}
                  </div>
                  <button
                    onClick={() => handleExecute(dist.tokenId, dist.amount)}
                    disabled={executingId === dist.tokenId}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
                  >
                    {executingId === dist.tokenId
                      ? t('distribution.executing')
                      : t('distribution.executeNow')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pendingDistributions.length > 5 && (
            <div className="text-center mt-4 text-sm text-gray-400">
              +{pendingDistributions.length - 5} {t('distribution.more')}
            </div>
          )}
        </div>
      )}

      {/* Gas Estimate Info */}
      {gasEstimate && (
        <div className="glass-light rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⛽</div>
              <div>
                <div className="text-sm text-gray-400">{t('distribution.currentGas')}</div>
                <div className="text-lg font-bold text-cyan-400">
                  {parseFloat(gasEstimate.gasPriceGwei).toFixed(2)} Gwei
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">{t('distribution.estimatedCost')}</div>
              <div className="text-lg font-bold text-white">
                ~{formatEth(gasEstimate.estimatedCostForDistribution)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Distribution History */}
      <div className="glass rounded-xl p-6 border border-purple-500/20">
        <h3 className="text-xl font-bold text-white mb-4">
          {t('distribution.historyTitle')}
        </h3>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {distributions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-4">📊</div>
            <p>{t('distribution.noHistory')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {distributions.map((dist) => (
                <div
                  key={dist.id}
                  className="p-4 glass-light rounded-lg border border-purple-500/20 hover:border-cyan-500/30 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-medium text-white mb-1">
                        Token #{dist.tokenId}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(dist.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          {formatEth(dist.salePrice)}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          dist.status
                        )}`}
                      >
                        {dist.status}
                      </span>
                    </div>
                  </div>

                  {/* Beneficiaries */}
                  {Array.isArray(dist.distributions) && dist.distributions.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {dist.distributions.map((beneficiary: any, index: number) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs p-2 bg-black/20 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">
                              {beneficiary.recipient.slice(0, 6)}...
                              {beneficiary.recipient.slice(-4)}
                            </span>
                            <span className="text-purple-400">
                              ({beneficiary.percentage / 100}%)
                            </span>
                          </div>
                          <span className="text-cyan-400 font-medium">
                            {formatEth(beneficiary.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transaction Link */}
                  {dist.txHash && dist.txHash !== '' && !dist.txHash.startsWith('pending') && (
                    <a
                      href={`https://arbiscan.io/tx/${dist.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <span>🔗 {t('distribution.viewTransaction')}</span>
                      <span className="text-gray-500">
                        {dist.txHash.slice(0, 10)}...{dist.txHash.slice(-8)}
                      </span>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 glass-light rounded-lg border border-purple-500/20 hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ← {t('distribution.previous')}
                </button>
                <span className="text-sm text-gray-400">
                  {t('distribution.page')} {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 glass-light rounded-lg border border-purple-500/20 hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('distribution.next')} →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Gas Estimate Modal */}
      {showGasModal && selectedDistribution && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full border border-cyan-500/30">
            <h3 className="text-2xl font-bold text-white mb-4">
              {t('distribution.confirmExecution')}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="p-4 glass-light rounded-lg">
                <div className="text-sm text-gray-400 mb-1">{t('distribution.tokenId')}</div>
                <div className="text-lg font-bold text-white">
                  #{selectedDistribution.tokenId}
                </div>
              </div>

              <div className="p-4 glass-light rounded-lg">
                <div className="text-sm text-gray-400 mb-1">{t('distribution.amount')}</div>
                <div className="text-lg font-bold text-cyan-400">
                  {formatEth(selectedDistribution.amount)}
                </div>
              </div>

              {gasEstimate && (
                <div className="p-4 glass-light rounded-lg border border-yellow-500/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">{t('distribution.gasPrice')}</span>
                    <span className="text-sm font-medium text-white">
                      {parseFloat(gasEstimate.gasPriceGwei).toFixed(2)} Gwei
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {t('distribution.estimatedCost')}
                    </span>
                    <span className="text-sm font-bold text-yellow-400">
                      ~{formatEth(gasEstimate.estimatedCostForDistribution)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGasModal(false);
                  setSelectedDistribution(null);
                }}
                className="flex-1 px-6 py-3 glass-light border border-gray-500/30 rounded-lg font-semibold hover:bg-white/5 transition-all"
              >
                {t('distribution.cancel')}
              </button>
              <button
                onClick={confirmExecute}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                {t('distribution.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
