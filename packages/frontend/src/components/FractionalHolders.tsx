interface Holder {
  address: string
  balance: string
  percentage: number
}

interface FractionalHoldersProps {
  holders: Holder[]
}

export default function FractionalHolders({ holders }: FractionalHoldersProps) {
  // Sort holders by percentage (descending)
  const sortedHolders = [...holders].sort((a, b) => b.percentage - a.percentage)
  
  // Show top 10 holders
  const topHolders = sortedHolders.slice(0, 10)
  
  // Calculate total shown percentage
  const totalShownPercentage = topHolders.reduce((sum, holder) => sum + holder.percentage, 0)
  const othersPercentage = 100 - totalShownPercentage

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`
    }
    return num.toFixed(2)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">持有者分布</h3>
        <span className="text-sm text-gray-600">
          共 {holders.length} 个持有者
        </span>
      </div>

      {/* Holders List */}
      <div className="space-y-3">
        {topHolders.map((holder, index) => (
          <div key={holder.address} className="flex items-center">
            {/* Rank */}
            <div className="w-6 text-center">
              <span className={`text-sm font-semibold ${
                index === 0 ? 'text-yellow-600' :
                index === 1 ? 'text-gray-400' :
                index === 2 ? 'text-orange-600' :
                'text-gray-500'
              }`}>
                {index + 1}
              </span>
            </div>

            {/* Address */}
            <div className="flex-1 ml-3">
              <p className="font-mono text-sm text-gray-900">
                {formatAddress(holder.address)}
              </p>
              <div className="mt-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${holder.percentage}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="ml-3 text-right">
              <p className="text-sm font-semibold text-gray-900">
                {holder.percentage.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500">
                {formatBalance(holder.balance)}
              </p>
            </div>
          </div>
        ))}

        {/* Others */}
        {othersPercentage > 0 && (
          <div className="flex items-center pt-2 border-t border-gray-200">
            <div className="w-6 text-center">
              <span className="text-sm text-gray-400">•</span>
            </div>
            <div className="flex-1 ml-3">
              <p className="text-sm text-gray-600">其他持有者</p>
              <div className="mt-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gray-400 h-full rounded-full"
                  style={{ width: `${othersPercentage}%` }}
                />
              </div>
            </div>
            <div className="ml-3 text-right">
              <p className="text-sm font-semibold text-gray-600">
                {othersPercentage.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500">
                {holders.length - topHolders.length} 个
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Distribution Chart */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">分布概览</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">最大持有者</p>
            <p className="text-lg font-bold text-blue-600">
              {topHolders[0]?.percentage.toFixed(1)}%
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">前 3 持有</p>
            <p className="text-lg font-bold text-green-600">
              {topHolders.slice(0, 3).reduce((sum, h) => sum + h.percentage, 0).toFixed(1)}%
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">前 10 持有</p>
            <p className="text-lg font-bold text-purple-600">
              {totalShownPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full mr-2" />
            <span>持有份额</span>
          </div>
          <button
            onClick={() => {/* View all holders */}}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            查看全部 →
          </button>
        </div>
      </div>
    </div>
  )
}
