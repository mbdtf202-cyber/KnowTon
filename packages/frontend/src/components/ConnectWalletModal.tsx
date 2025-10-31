import { useTranslation } from 'react-i18next'
import WalletWithNetwork from './WalletWithNetwork'

interface ConnectWalletModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

export default function ConnectWalletModal({ isOpen, onClose, featureName }: ConnectWalletModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative glass-light rounded-2xl p-8 max-w-md w-full neon-border animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-center mb-3 text-gradient-cyber">
          {t('pages.connectWalletRequired')}
        </h3>

        {/* Description */}
        <p className="text-gray-300 text-center mb-6">
          {featureName 
            ? `${t('pages.connectWalletMessage')} "${featureName}"`
            : t('pages.connectWalletMessage')
          }
        </p>

        {/* Connect Button */}
        <div className="flex justify-center">
          <WalletWithNetwork />
        </div>

        {/* Info */}
        <p className="text-sm text-gray-400 text-center mt-6">
          💡 {t('wallet.networkTip')}
        </p>
      </div>
    </div>
  )
}
