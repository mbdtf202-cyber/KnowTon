import { useState } from 'react'
import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { useTranslation } from 'react-i18next'

export default function WalletSwitcher() {
  const { t } = useTranslation()
  const { address, connector, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connectors, connect } = useConnect()
  const [isOpen, setIsOpen] = useState(false)

  if (!isConnected || !address) {
    return null
  }

  const currentWalletName = connector?.name || 'Unknown'

  const handleSwitchWallet = async (connectorToUse: any) => {
    try {
      // Disconnect current wallet
      disconnect()
      
      // Wait a bit for disconnection to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Connect to new wallet
      connect({ connector: connectorToUse })
      
      setIsOpen(false)
    } catch (error) {
      console.error('Wallet switch error:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm text-gray-300">{currentWalletName}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 rounded-lg bg-gray-800 border border-gray-700 shadow-xl z-50">
            <div className="p-3 border-b border-gray-700">
              <p className="text-xs text-gray-400 mb-1">{t('wallet.currentWallet')}</p>
              <p className="text-sm font-medium text-white">{currentWalletName}</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>

            <div className="p-2">
              <p className="text-xs text-gray-400 px-2 py-1 mb-1">{t('wallet.switchTo')}</p>
              {connectors
                .filter(c => c.id !== connector?.id)
                .map((connectorOption) => (
                  <button
                    key={connectorOption.id}
                    onClick={() => handleSwitchWallet(connectorOption)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {connectorOption.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{connectorOption.name}</p>
                      <p className="text-xs text-gray-400">
                        {connectorOption.ready ? t('wallet.ready') : t('wallet.notInstalled')}
                      </p>
                    </div>
                  </button>
                ))}
            </div>

            <div className="p-2 border-t border-gray-700">
              <button
                onClick={() => {
                  disconnect()
                  setIsOpen(false)
                }}
                className="w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                {t('wallet.disconnect')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
