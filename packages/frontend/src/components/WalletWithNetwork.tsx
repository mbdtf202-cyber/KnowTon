import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useTranslation } from 'react-i18next'

export default function WalletWithNetwork() {
  const { t } = useTranslation()

  return (
    <div className="relative group">
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
          const ready = mounted
          const connected = ready && account && chain

          if (!ready) {
            return null
          }

          if (!connected) {
            return (
              <div className="relative">
                <button
                  onClick={openConnectModal}
                  className="relative px-4 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {t('wallet.connect')}
                  </span>
                </button>
              </div>
            )
          }

          return (
            <div className="flex items-center gap-2">
              {/* Chain Button */}
              {chain && (
                <button
                  onClick={openChainModal}
                  className="group relative px-3 py-2 bg-white border-2 border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="relative flex items-center gap-2">
                    {chain.iconUrl && (
                      <img
                        alt={chain.name ?? 'Chain icon'}
                        src={chain.iconUrl}
                        className="w-5 h-5"
                      />
                    )}
                    <span className="hidden sm:inline font-medium text-gray-700 group-hover:text-blue-600 transition-colors text-sm">
                      {chain.name}
                    </span>
                  </div>
                </button>
              )}

              {/* Account Button */}
              <button
                onClick={openAccountModal}
                className="group relative px-3 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                  </div>
                  <span className="font-mono text-sm">
                    {account.displayName}
                  </span>
                  {account.displayBalance && (
                    <span className="hidden lg:inline text-xs opacity-90">
                      {account.displayBalance}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )
        }}
      </ConnectButton.Custom>
    </div>
  )
}
