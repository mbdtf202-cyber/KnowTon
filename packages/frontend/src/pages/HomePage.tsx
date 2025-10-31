import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { isConnected } = useAccount()
  const { t } = useTranslation()

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-light neon-glow">
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-600 opacity-20 blur-xl"></div>

        <div className="relative px-8 py-24 text-center">
          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <div className="absolute top-20 right-20 w-3 h-3 bg-purple-400 rounded-full animate-pulse animation-delay-200"></div>
            <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-pink-400 rounded-full animate-pulse animation-delay-300"></div>
            <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-cyan-400 rounded-full animate-pulse animation-delay-100"></div>
          </div>

          <div className="relative z-10">
            <div className="text-6xl mb-6 float">🚀</div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-gradient-cyber">
              {t('home.title')}
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t('home.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isConnected ? (
                <Link
                  to="/register"
                  className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    🚀 {t('home.getStarted')}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              ) : (
                <Link
                  to="/upload"
                  className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    📤 {t('upload.title')}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              )}
              <Link
                to="/marketplace"
                className="px-8 py-4 glass-light border-2 border-purple-500/50 text-white rounded-xl font-semibold text-lg hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-300"
              >
                🏪 {t('home.exploreMarket')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4">
        <div className="max-w-6xl mx-auto glass rounded-3xl p-12 neon-border">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gradient-neon mb-2">{t('home.statsTitle')}</h2>
            <p className="text-gray-400">{t('home.statsSubtitle')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-4 glass-light rounded-xl hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">1,234</div>
              <div className="text-gray-300 font-medium">👨‍🎨 {t('home.creators')}</div>
            </div>
            <div className="p-4 glass-light rounded-xl hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent mb-2">5,678</div>
              <div className="text-gray-300 font-medium">🎨 {t('home.ipNfts')}</div>
            </div>
            <div className="p-4 glass-light rounded-xl hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">$2.3M</div>
              <div className="text-gray-300 font-medium">💰 {t('home.volume')}</div>
            </div>
            <div className="p-4 glass-light rounded-xl hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">98%</div>
              <div className="text-gray-300 font-medium">😊 {t('home.satisfaction')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gradient-cyber mb-4">{t('home.featuresTitle')}</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t('home.featuresSubtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              to="/upload"
              className="group relative p-8 glass-light rounded-2xl hover:scale-105 transition-all duration-300 border border-purple-500/20 hover:border-cyan-500/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 float">🎨</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gradient-cyber transition-colors">
                  {t('mint.title')}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {t('mint.subtitle')}
                </p>
              </div>
            </Link>

            <Link
              to="/fractionalize"
              className="group relative p-8 glass-light rounded-2xl hover:scale-105 transition-all duration-300 border border-cyan-500/20 hover:border-purple-500/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 float animation-delay-100">💎</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gradient-neon transition-colors">
                  {t('fractionalize.title')}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {t('fractionalize.subtitle')}
                </p>
              </div>
            </Link>

            <Link
              to="/marketplace"
              className="group relative p-8 glass-light rounded-2xl hover:scale-105 transition-all duration-300 border border-pink-500/20 hover:border-purple-500/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 float animation-delay-200">🔒</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gradient-cyber transition-colors">
                  {t('home.privacyProtection')}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {t('home.privacyDescription')}
                </p>
              </div>
            </Link>

            <Link
              to="/governance"
              className="group relative p-8 glass-light rounded-2xl hover:scale-105 transition-all duration-300 border border-purple-500/20 hover:border-cyan-500/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 float animation-delay-300">🏛️</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gradient-neon transition-colors">
                  {t('home.daoGovernance')}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {t('home.daoDescription')}
                </p>
              </div>
            </Link>

            <Link
              to="/analytics"
              className="group relative p-8 glass-light rounded-2xl hover:scale-105 transition-all duration-300 border border-cyan-500/20 hover:border-pink-500/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 float">📊</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gradient-cyber transition-colors">
                  {t('home.dataAnalytics')}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {t('home.analyticsDescription')}
                </p>
              </div>
            </Link>

            <Link
              to="/trading"
              className="group relative p-8 glass-light rounded-2xl hover:scale-105 transition-all duration-300 border border-pink-500/20 hover:border-cyan-500/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 float animation-delay-100">💱</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gradient-neon transition-colors">
                  {t('home.ammTrading')}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {t('home.tradingDescription')}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Glowing background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 rounded-3xl blur-2xl opacity-30"></div>

          <div className="relative glass rounded-3xl p-16 neon-border">
            <h2 className="text-4xl font-bold mb-6 text-gradient-neon">{t('home.ctaTitle')}</h2>
            <p className="text-xl mb-10 text-gray-300 leading-relaxed max-w-2xl mx-auto">
              {t('home.ctaDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isConnected ? "/upload" : "/register"}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10">
                  {isConnected ? `🎨 ${t('home.startCreating')}` : `✨ ${t('home.freeRegister')}`}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link
                to="/marketplace"
                className="px-8 py-4 glass-light border-2 border-cyan-500/50 text-white rounded-xl font-semibold text-lg hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300"
              >
                🔍 {t('home.browseWorks')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
