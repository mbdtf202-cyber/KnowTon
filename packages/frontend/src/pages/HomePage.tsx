import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { isConnected } = useAccount()
  const { t } = useTranslation()

  return (
    <div className="space-y-20 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
          <div className="relative px-8 py-24 text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              {t('home.title')}
            </h1>
            <p className="text-xl md:text-2xl mb-10 opacity-95 max-w-3xl mx-auto leading-relaxed">
              {t('home.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isConnected ? (
                <Link
                  to="/register"
                  className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200"
                >
                  🚀 {t('home.getStarted')}
                </Link>
              ) : (
                <Link
                  to="/upload"
                  className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200"
                >
                  📤 {t('upload.title')}
                </Link>
              )}
              <Link
                to="/marketplace"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/50 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200"
              >
                🏪 {t('home.exploreMarket')}
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-4">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-lg p-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{t('home.statsTitle')}</h2>
              <p className="text-gray-500">{t('home.statsSubtitle')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="p-4">
                <div className="text-4xl font-bold text-blue-600 mb-2">1,234</div>
                <div className="text-gray-600 font-medium">👨‍🎨 {t('home.creators')}</div>
              </div>
              <div className="p-4">
                <div className="text-4xl font-bold text-blue-600 mb-2">5,678</div>
                <div className="text-gray-600 font-medium">🎨 {t('home.ipNfts')}</div>
              </div>
              <div className="p-4">
                <div className="text-4xl font-bold text-blue-600 mb-2">$2.3M</div>
                <div className="text-gray-600 font-medium">💰 {t('home.volume')}</div>
              </div>
              <div className="p-4">
                <div className="text-4xl font-bold text-blue-600 mb-2">98%</div>
                <div className="text-gray-600 font-medium">😊 {t('home.satisfaction')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">{t('home.featuresTitle')}</h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                {t('home.featuresSubtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                to="/upload"
                className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-100"
              >
                <div className="text-5xl mb-4">🎨</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('mint.title')}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t('mint.subtitle')}
                </p>
              </Link>

              <Link
                to="/fractionalize"
                className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-100"
              >
                <div className="text-5xl mb-4">💎</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('fractionalize.title')}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t('fractionalize.subtitle')}
                </p>
              </Link>

              <Link
                to="/marketplace"
                className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-100"
              >
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('home.privacyProtection')}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t('home.privacyDescription')}
                </p>
              </Link>

              <Link
                to="/governance"
                className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-100"
              >
                <div className="text-5xl mb-4">🏛️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('home.daoGovernance')}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t('home.daoDescription')}
                </p>
              </Link>

              <Link
                to="/analytics"
                className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-100"
              >
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('home.dataAnalytics')}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t('home.analyticsDescription')}
                </p>
              </Link>

              <Link
                to="/trading"
                className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-100"
              >
                <div className="text-5xl mb-4">💱</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {t('home.ammTrading')}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t('home.tradingDescription')}
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-xl p-16">
            <h2 className="text-4xl font-bold mb-6 text-white">{t('home.ctaTitle')}</h2>
            <p className="text-xl mb-10 text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {t('home.ctaDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isConnected ? "/upload" : "/register"}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200"
              >
                {isConnected ? `🎨 ${t('home.startCreating')}` : `✨ ${t('home.freeRegister')}`}
              </Link>
              <Link
                to="/marketplace"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200"
              >
                🔍 {t('home.browseWorks')}
              </Link>
            </div>
          </div>
        </section>
    </div>
  )
}
