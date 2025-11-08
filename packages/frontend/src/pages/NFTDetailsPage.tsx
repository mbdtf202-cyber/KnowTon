import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { useNFTDetails } from '../hooks/useNFTDetails'
import { useNFTPurchase } from '../hooks/useNFTPurchase'
import PriceChart from '../components/PriceChart'
import TransactionModal from '../components/TransactionModal'
import { formatAddress, formatDate, formatFileSize } from '../utils/format'

export default function NFTDetailsPage() {
  const { t } = useTranslation()
  const { tokenId } = useParams<{ tokenId: string }>()
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { nft, loading, error } = useNFTDetails(tokenId || '')
  const { purchaseNFT, makeOffer, isPurchasing } = useNFTPurchase()

  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<'preparing' | 'signing' | 'confirming' | 'complete' | 'error'>('preparing')
  const [txError, setTxError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'holders'>('details')

  if (!tokenId) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="text-center">
          <p className="text-red-600">{t('pages.invalidTokenId')}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !nft) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || t('pages.nftNotFound')}</p>
        </div>
      </div>
    )
  }

  const isOwner = address && address.toLowerCase() === nft.owner.toLowerCase()

  const handlePurchase = async () => {
    if (!nft.floorPrice) return

    setShowPurchaseModal(true)
    setTxStatus('signing')
    setTxError(null)

    const result = await purchaseNFT({
      tokenId: nft.tokenId,
      price: nft.floorPrice,
      currency: 'ETH',
    })

    if (result.success && result.txHash) {
      setTxHash(result.txHash)
      setTxStatus('confirming')
      
      // Simulate confirmation
      setTimeout(() => {
        setTxStatus('complete')
      }, 2000)
    } else {
      setTxStatus('error')
      setTxError(result.error || t('pages.purchaseFailed'))
    }
  }

  const handleMakeOffer = async () => {
    const amount = parseFloat(offerAmount)
    if (isNaN(amount) || amount <= 0) {
      alert(t('pages.enterValidAmount'))
      return
    }

    const result = await makeOffer(nft.tokenId, amount)

    if (result.success && result.txHash) {
      setTxHash(result.txHash)
      setShowOfferModal(false)
      setOfferAmount('')
      alert(t('pages.offerSuccess'))
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/marketplace')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('pages.backToMarket')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Media */}
        <div>
          <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center mb-4">
            {nft.metadata.thumbnailHash ? (
              <img
                src={`https://ipfs.io/ipfs/${nft.metadata.thumbnailHash}`}
                alt={nft.metadata.title}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                }}
              />
            ) : (
              <div className="text-center p-8">
                <svg
                  className="w-24 h-24 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500">{nft.metadata.title}</p>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">{t('pages.views')}</p>
              <p className="text-2xl font-bold">{nft.statistics.views.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">{t('pages.holders')}</p>
              <p className="text-2xl font-bold">{nft.statistics.holderCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">{t('pages.totalRevenue')}</p>
              <p className="text-2xl font-bold">
                {nft.statistics.totalRevenue.toFixed(2)} ETH
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">{t('pages.uniqueViewers')}</p>
              <p className="text-2xl font-bold">{nft.statistics.uniqueViewers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div>
          {/* Title and Verification */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold">{nft.metadata.title}</h1>
              {nft.verified && (
                <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t('pages.verified')}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-4">{nft.metadata.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {nft.metadata.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Price and Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">{t('pages.currentPrice')}</p>
              <p className="text-4xl font-bold">
                {nft.floorPrice ? `${nft.floorPrice.toFixed(4)} ETH` : t('pages.notListed')}
              </p>
              {nft.lastSalePrice && (
                <p className="text-sm text-gray-500 mt-1">
                  {t('pages.lastSale')}: {nft.lastSalePrice.toFixed(4)} ETH
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isOwner && nft.floorPrice && (
                <button
                  onClick={handlePurchase}
                  disabled={!isConnected || isPurchasing}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {!isConnected
                    ? t('pages.connectWalletFirst')
                    : isPurchasing
                    ? t('pages.purchasing')
                    : t('pages.buyNow')}
                </button>
              )}

              <button
                onClick={() => navigate(`/trade/${tokenId}`)}
                className="w-full px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
              >
                {t('pages.goToTrading')}
              </button>

              {isOwner && (
                <button
                  onClick={() => navigate(`/fractionalize/${tokenId}`)}
                  className="w-full px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold"
                >
                  Fractionalize NFT
                </button>
              )}

              {!isOwner && (
                <button
                  onClick={() => setShowOfferModal(true)}
                  disabled={!isConnected}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {t('pages.makeOffer')}
                </button>
              )}

              {isOwner && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">{t('pages.youOwnThisNft')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Creator and Owner Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('pages.creator')}</p>
                <button
                  onClick={() => navigate(`/profile/${nft.creator}`)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {formatAddress(nft.creator)}
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('pages.currentOwner')}</p>
                <button
                  onClick={() => navigate(`/profile/${nft.owner}`)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {formatAddress(nft.owner)}
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('pages.mintTime')}</p>
                <p className="font-medium">{formatDate(nft.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">{t('pages.metadata')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('pages.category')}</span>
                <span className="font-medium">{nft.metadata.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('pages.fileSize')}</span>
                <span className="font-medium">{formatFileSize(nft.metadata.fileSize)}</span>
              </div>
              {nft.metadata.duration && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('pages.duration')}</span>
                  <span className="font-medium">
                    {Math.floor(nft.metadata.duration / 60)}:
                    {(nft.metadata.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{t('pages.language')}</span>
                <span className="font-medium">{nft.metadata.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('pages.license')}</span>
                <span className="font-medium">{nft.metadata.license}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('pages.tokenId')}</span>
                <span className="font-medium">#{nft.tokenId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              价格历史
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              交易历史
            </button>
            <button
              onClick={() => setActiveTab('holders')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'holders'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              持有者分布
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && <PriceChart priceHistory={nft.priceHistory} currency="ETH" />}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      从
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      到
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      金额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      交易哈希
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {nft.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            tx.type === 'mint'
                              ? 'bg-green-100 text-green-800'
                              : tx.type === 'sale'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tx.type === 'mint' ? '铸造' : tx.type === 'sale' ? '出售' : '转移'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => navigate(`/profile/${tx.from}`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {formatAddress(tx.from)}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => navigate(`/profile/${tx.to}`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {formatAddress(tx.to)}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {parseFloat(tx.amount).toFixed(4)} {tx.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(tx.timestamp.getTime())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`https://arbiscan.io/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {formatAddress(tx.txHash)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'holders' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">{t('pages.holderDistribution')}</h3>
            <div className="space-y-4">
              {nft.holders.map((holder, index) => (
                <div key={holder.address} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 text-center text-sm font-medium text-gray-500">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => navigate(`/profile/${holder.address}`)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {formatAddress(holder.address)}
                      </button>
                      <span className="text-sm font-medium">{holder.percentage.toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${holder.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('pages.heldSince')} {formatDate(holder.since)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t('pages.offer')}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('pages.offerAmount')}
              </label>
              <input
                type="number"
                step="0.0001"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="0.0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {nft.floorPrice && (
                <p className="text-sm text-gray-500 mt-1">
                  {t('pages.currentPrice')}: {nft.floorPrice.toFixed(4)} ETH
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOfferModal(false)
                  setOfferAmount('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('pages.cancel')}
              </button>
              <button
                onClick={handleMakeOffer}
                disabled={isPurchasing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPurchasing ? '提交中...' : '确认出价'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showPurchaseModal && (
        <TransactionModal
          isOpen={showPurchaseModal}
          status={txStatus}
          txHash={txHash}
          tokenId={nft.tokenId}
          error={txError}
          onClose={() => {
            setShowPurchaseModal(false)
            setTxHash(null)
            setTxStatus('preparing')
            setTxError(null)
          }}
        />
      )}
    </div>
  )
}
