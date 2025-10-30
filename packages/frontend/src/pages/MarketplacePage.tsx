import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NFTCard from '../components/NFTCard'
import { useMarketplace } from '../hooks/useMarketplace'
import type { MarketplaceFilters } from '../hooks/useMarketplace'
import { CONTENT_CATEGORIES } from '../utils/constants'

type LayoutType = 'grid' | 'list'

export default function MarketplacePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [layout, setLayout] = useState<LayoutType>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<MarketplaceFilters>({
    sortBy: 'newest',
  })
  const [searchQuery, setSearchQuery] = useState('')

  const itemsPerPage = layout === 'grid' ? 12 : 10
  const { nfts, loading, error, pagination } = useMarketplace(filters, currentPage, itemsPerPage)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters(prev => ({ ...prev, search: searchQuery }))
    setCurrentPage(1)
  }

  const handleFilterChange = (key: keyof MarketplaceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setFilters({ sortBy: 'newest' })
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handleNFTClick = (tokenId: string) => {
    navigate(`/nft/${tokenId}`)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t('marketplace.title')}</h1>
        <p className="text-sm sm:text-base text-gray-600">{t('marketplace.subtitle')}</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('marketplace.searchPlaceholder')}
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="btn-touch px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <span className="hidden xs:inline">{t('marketplace.search')}</span>
            <svg className="w-5 h-5 xs:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>

      {/* Filters and Layout Controls */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
          {/* Filters */}
          <div className="flex flex-col xs:flex-row flex-wrap gap-2 sm:gap-3 lg:gap-4 items-stretch xs:items-center flex-1">
            {/* Category Filter */}
            <select
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
              className="btn-touch px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('marketplace.allCategories')}</option>
              {CONTENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {t(`mint.categories.${cat}`)}
                </option>
              ))}
            </select>

            {/* Verified Filter */}
            <select
              value={filters.verified === undefined ? '' : filters.verified ? 'true' : 'false'}
              onChange={(e) => handleFilterChange('verified', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="btn-touch px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('marketplace.allStatus')}</option>
              <option value="true">{t('marketplace.verified')}</option>
              <option value="false">{t('marketplace.unverified')}</option>
            </select>

            {/* Sort By */}
            <select
              value={filters.sortBy || 'newest'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="btn-touch px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">{t('marketplace.sort.newest')}</option>
              <option value="price_low">{t('marketplace.sort.price_low')}</option>
              <option value="price_high">{t('marketplace.sort.price_high')}</option>
              <option value="popular">{t('marketplace.sort.popular')}</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={handleClearFilters}
              className="btn-touch px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors border border-gray-300 rounded-lg sm:border-0"
            >
              {t('marketplace.clearFilters')}
            </button>
          </div>

          {/* Layout Toggle - Hidden on mobile */}
          <div className="hidden sm:flex gap-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setLayout('grid')}
              className={`btn-touch p-2 rounded transition-colors ${
                layout === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }`}
              title={t('marketplace.gridLayout')}
              aria-label={t('marketplace.gridLayout')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`btn-touch p-2 rounded transition-colors ${
                layout === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }`}
              title={t('marketplace.listLayout')}
              aria-label={t('marketplace.listLayout')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
        {t('marketplace.showingResults', {
          start: (currentPage - 1) * itemsPerPage + 1,
          end: Math.min(currentPage * itemsPerPage, pagination.totalItems),
          total: pagination.totalItems
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* NFT Grid/List */}
      {!loading && !error && (
        <>
          {nfts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-2">{t('marketplace.noResults')}</p>
              <p className="text-gray-400">{t('marketplace.tryAdjustFilters')}</p>
            </div>
          ) : (
            <div
              className={
                layout === 'grid'
                  ? 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6'
                  : 'space-y-3 sm:space-y-4'
              }
            >
              {nfts.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  tokenId={nft.tokenId}
                  title={nft.metadata?.title || `NFT #${nft.tokenId}`}
                  creator={nft.creator}
                  owner={nft.owner}
                  category={nft.category}
                  thumbnailHash={nft.metadata?.thumbnailHash}
                  floorPrice={nft.floorPrice}
                  lastSalePrice={nft.lastSalePrice}
                  verified={nft.verified}
                  onClick={() => handleNFTClick(nft.tokenId)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 sm:mt-8 flex justify-center items-center gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-touch px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden xs:inline">{t('marketplace.previous')}</span>
                <span className="xs:hidden">←</span>
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`btn-touch px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className="btn-touch px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden xs:inline">{t('marketplace.next')}</span>
                <span className="xs:hidden">→</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
