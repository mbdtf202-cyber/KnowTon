import { IPFS_GATEWAY } from '../utils/constants'
import { formatAddress } from '../utils/format'

interface NFTCardProps {
  tokenId: string
  title: string
  creator: string
  owner: string
  category: string
  thumbnailHash?: string
  floorPrice?: number
  lastSalePrice?: number
  verified: boolean
  onClick?: () => void
}

export default function NFTCard({
  tokenId,
  title,
  creator,
  category,
  thumbnailHash,
  floorPrice,
  verified,
  onClick,
}: NFTCardProps) {
  const imageUrl = thumbnailHash
    ? `${IPFS_GATEWAY}${thumbnailHash}`
    : '/placeholder-nft.png'

  return (
    <div
      onClick={onClick}
      className="card-mobile bg-white overflow-hidden hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
    >
      {/* NFT Image */}
      <div className="relative aspect-square bg-gray-200">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-nft.png'
          }}
        />
        {verified && (
          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1">
            <svg
              className="w-2.5 h-2.5 sm:w-3 sm:h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden xs:inline">已验证</span>
            <span className="xs:hidden">✓</span>
          </div>
        )}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 bg-black bg-opacity-60 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">
          {category}
        </div>
      </div>

      {/* NFT Info */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 truncate">{title}</h3>
        
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-xs sm:text-sm text-gray-600">
          <span className="hidden xs:inline">创作者:</span>
          <span className="xs:hidden">by</span>
          <span className="font-mono text-[10px] sm:text-xs">{formatAddress(creator)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">底价</p>
            <p className="font-semibold text-sm sm:text-base lg:text-lg">
              {floorPrice ? `${floorPrice} ETH` : '未上架'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] sm:text-xs text-gray-500">Token ID</p>
            <p className="font-mono text-xs sm:text-sm">#{tokenId}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
