import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
// import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import WalletWithNetwork from './WalletWithNetwork'
import ConnectWalletModal from './ConnectWalletModal'

export default function Header() {
  const { isConnected } = useAccount()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [pendingRoute, setPendingRoute] = useState<string>('')

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleNavClick = (e: React.MouseEvent, link: typeof navLinks[0]) => {
    if (link.requiresWallet && !isConnected) {
      e.preventDefault()
      setPendingRoute(link.to)
      setShowConnectModal(true)
    }
  }

  // Watch for wallet connection to navigate to pending route
  useEffect(() => {
    if (isConnected && pendingRoute) {
      navigate(pendingRoute)
      setPendingRoute('')
      setShowConnectModal(false)
    }
  }, [isConnected, pendingRoute, navigate])

  const navLinks = [
    { to: '/marketplace', label: t('nav.marketplace'), icon: '🏪', requiresWallet: false },
    { to: '/dashboard', label: 'Dashboard', icon: '📊', requiresWallet: true },
    { to: '/upload', label: t('nav.upload'), icon: '📤', requiresWallet: true },
    { to: '/mint', label: t('nav.mint'), icon: '✨', requiresWallet: true },
    { to: '/trading', label: t('nav.trading'), icon: '💱', requiresWallet: true },
    { to: '/staking', label: t('nav.staking'), icon: '💎', requiresWallet: true },
    { to: '/governance', label: t('nav.governance'), icon: '🗳️', requiresWallet: true },
    { to: '/analytics', label: t('nav.analytics'), icon: '📊', requiresWallet: false },
  ]

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'glass shadow-lg shadow-purple-500/10' 
          : 'glass-light'
      }`}
    >
      {/* Gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center h-16 sm:h-20">
          {/* Logo - Far Left */}
          <Link 
            to="/" 
            className="group flex items-center gap-2 sm:gap-3 touch-manipulation relative flex-shrink-0"
          >
            {/* Logo icon with animation */}
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-lg sm:text-xl">K</span>
              </div>
            </div>
            
            {/* Logo text with gradient */}
            <span className="text-xl sm:text-2xl font-black text-gradient-cyber group-hover:text-gradient-neon transition-all duration-300 tracking-tight">
              KnowTon
            </span>
            
            {/* Beta badge */}
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white rounded-full uppercase tracking-wider animate-gradient-x">
              Beta
            </span>
          </Link>
          
          {/* Desktop Navigation - Center */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center mx-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`group relative px-3 py-2 rounded-xl font-semibold text-base transition-all duration-300 ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-gray-300 hover:text-cyan-400'
                  }`}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20 rounded-xl animate-gradient-x" />
                  )}
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-cyan-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:via-cyan-500/10 group-hover:to-pink-500/10 rounded-xl transition-all duration-300" />
                  
                  <span className="relative flex items-center gap-2 whitespace-nowrap">
                    <span className="text-xl group-hover:scale-110 transition-transform duration-300">
                      {link.icon}
                    </span>
                    <span className="hidden xl:inline text-sm">{link.label}</span>
                  </span>
                  
                  {/* Bottom border for active */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right side - Language & Wallet */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher />
            {isConnected ? (
              <Link
                to="/profile"
                className="group relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative w-8 h-8 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="relative text-sm font-bold">{t('nav.profile')}</span>
              </Link>
            ) : (
              <WalletWithNetwork />
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2 ml-auto">
            <LanguageSwitcher />
            <button
              onClick={toggleMobileMenu}
              className="relative p-2 text-gray-300 hover:text-cyan-400 transition-colors rounded-xl hover:bg-white/5 group"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`block w-5 h-0.5 bg-current transform transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'}`} />
                <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
                <span className={`block w-5 h-0.5 bg-current transform transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div 
          className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${
            mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 space-y-1 border-t border-white/10">
            {navLinks.map((link, index) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 transform ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20 text-cyan-400 scale-[1.02]'
                      : 'text-gray-300 hover:bg-white/5 hover:text-cyan-400'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: mobileMenuOpen ? 'slideInFromRight 0.3s ease-out forwards' : 'none'
                  }}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </Link>
              )
            })}
            
            {/* Mobile wallet/profile button */}
            <div className="pt-4 border-t border-white/10 px-4">
              {isConnected ? (
                <Link
                  to="/profile"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white font-semibold rounded-xl"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span>{t('nav.profile')}</span>
                </Link>
              ) : (
                <WalletWithNetwork />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal 
        isOpen={showConnectModal}
        onClose={() => {
          setShowConnectModal(false)
          setPendingRoute('')
        }}
        featureName={navLinks.find(l => l.to === pendingRoute)?.label}
      />
    </header>
  )
}
