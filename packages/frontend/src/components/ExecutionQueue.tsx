import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ExecutionQueueItem {
  id: string
  proposalId: string
  eta: number
  status: 'QUEUED' | 'EXECUTING' | 'EXECUTED' | 'FAILED' | 'CANCELLED'
  attempts: number
  lastAttemptAt?: string
  error?: string
  executedAt?: string
  txHash?: string
  createdAt: string
  updatedAt: string
}

interface ExecutionQueueProps {
  onRefresh?: () => void
}

export const ExecutionQueue: React.FC<ExecutionQueueProps> = ({ onRefresh }) => {
  const { t } = useTranslation()
  const [queueStatus, setQueueStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'all' | 'ready' | 'failed'>('all')

  useEffect(() => {
    fetchQueueStatus()
    const interval = setInterval(fetchQueueStatus, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/v1/governance/execution/queue')
      const data = await response.json()

      if (data.success) {
        setQueueStatus(data.queue)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch queue status')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch queue status')
    } finally {
      setLoading(false)
    }
  }

  const handleManualExecute = async (proposalId: string) => {
    if (!confirm(t('governance.execution.confirmManualExecute'))) {
      return
    }

    try {
      const response = await fetch(`/api/v1/governance/execution/${proposalId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        alert(t('governance.execution.executeSuccess'))
        fetchQueueStatus()
        onRefresh?.()
      } else {
        alert(data.error || t('governance.execution.executeFailed'))
      }
    } catch (err: any) {
      alert(err.message || t('governance.execution.executeFailed'))
    }
  }

  const handleRetry = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/v1/governance/execution/${proposalId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        alert(t('governance.execution.retryInitiated'))
        fetchQueueStatus()
      } else {
        alert(data.error || t('governance.execution.retryFailed'))
      }
    } catch (err: any) {
      alert(err.message || t('governance.execution.retryFailed'))
    }
  }

  const handleCancel = async (proposalId: string) => {
    if (!confirm(t('governance.execution.confirmCancel'))) {
      return
    }

    try {
      const response = await fetch(`/api/v1/governance/execution/${proposalId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        alert(t('governance.execution.cancelSuccess'))
        fetchQueueStatus()
        onRefresh?.()
      } else {
        alert(data.error || t('governance.execution.cancelFailed'))
      }
    } catch (err: any) {
      alert(err.message || t('governance.execution.cancelFailed'))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'bg-yellow-100 text-yellow-800'
      case 'EXECUTING':
        return 'bg-blue-100 text-blue-800'
      case 'EXECUTED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
    return date.toLocaleString()
  }

  const getTimeUntilExecution = (eta: number) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = eta - now

    if (diff <= 0) {
      return t('governance.execution.readyNow')
    }

    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)

    if (hours > 0) {
      return t('governance.execution.timeUntil', { hours, minutes })
    }
    return t('governance.execution.minutesUntil', { minutes })
  }

  const getFilteredItems = () => {
    if (!queueStatus?.items) return []

    switch (selectedTab) {
      case 'ready':
        const now = Math.floor(Date.now() / 1000)
        return queueStatus.items.filter(
          (item: ExecutionQueueItem) => item.status === 'QUEUED' && item.eta <= now
        )
      case 'failed':
        return queueStatus.items.filter((item: ExecutionQueueItem) => item.status === 'FAILED')
      default:
        return queueStatus.items
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchQueueStatus}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('governance.execution.total')}</div>
          <div className="text-2xl font-bold text-gray-900">{queueStatus?.total || 0}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-600">{t('governance.execution.queued')}</div>
          <div className="text-2xl font-bold text-yellow-900">{queueStatus?.queued || 0}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-sm text-blue-600">{t('governance.execution.executing')}</div>
          <div className="text-2xl font-bold text-blue-900">{queueStatus?.executing || 0}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-600">{t('governance.execution.executed')}</div>
          <div className="text-2xl font-bold text-green-900">{queueStatus?.executed || 0}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-sm text-red-600">{t('governance.execution.failed')}</div>
          <div className="text-2xl font-bold text-red-900">{queueStatus?.failed || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('all')}
            className={`${
              selectedTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            {t('governance.execution.allItems')}
          </button>
          <button
            onClick={() => setSelectedTab('ready')}
            className={`${
              selectedTab === 'ready'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            {t('governance.execution.readyForExecution')}
          </button>
          <button
            onClick={() => setSelectedTab('failed')}
            className={`${
              selectedTab === 'failed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            {t('governance.execution.failedExecutions')}
          </button>
        </nav>
      </div>

      {/* Queue Items */}
      <div className="space-y-4">
        {getFilteredItems().length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('governance.execution.noItems')}
          </div>
        ) : (
          getFilteredItems().map((item: ExecutionQueueItem) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('governance.execution.proposalId')}: {item.proposalId}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">{t('governance.execution.eta')}:</span>
                      <span className="ml-2 text-gray-900">{formatDate(item.eta)}</span>
                      {item.status === 'QUEUED' && (
                        <span className="ml-2 text-blue-600">({getTimeUntilExecution(item.eta)})</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600">{t('governance.execution.attempts')}:</span>
                      <span className="ml-2 text-gray-900">{item.attempts}</span>
                    </div>
                    {item.executedAt && (
                      <div>
                        <span className="text-gray-600">{t('governance.execution.executedAt')}:</span>
                        <span className="ml-2 text-gray-900">{formatDate(item.executedAt)}</span>
                      </div>
                    )}
                    {item.txHash && (
                      <div>
                        <span className="text-gray-600">{t('governance.execution.txHash')}:</span>
                        <a
                          href={`https://etherscan.io/tx/${item.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          {item.txHash.substring(0, 10)}...
                        </a>
                      </div>
                    )}
                  </div>

                  {item.error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800">
                        <span className="font-semibold">{t('governance.execution.error')}:</span> {item.error}
                      </p>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col space-y-2">
                  {item.status === 'QUEUED' && item.eta <= Math.floor(Date.now() / 1000) && (
                    <button
                      onClick={() => handleManualExecute(item.proposalId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      {t('governance.execution.executeNow')}
                    </button>
                  )}
                  {item.status === 'FAILED' && (
                    <button
                      onClick={() => handleRetry(item.proposalId)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                    >
                      {t('governance.execution.retry')}
                    </button>
                  )}
                  {item.status === 'QUEUED' && (
                    <button
                      onClick={() => handleCancel(item.proposalId)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      {t('governance.execution.cancel')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchQueueStatus}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          {t('common.refresh')}
        </button>
      </div>
    </div>
  )
}
