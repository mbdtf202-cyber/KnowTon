import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import DistributionDashboard from '../components/DistributionDashboard';
import RevenueChart from '../components/RevenueChart';
import ContentPerformance from '../components/ContentPerformance';

export default function CreatorDashboard() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'content' | 'analytics'>('overview');

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="glass rounded-3xl p-16">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('dashboard.connectWallet')}
          </h2>
          <p className="text-gray-400 mb-8">
            {t('dashboard.connectWalletDescription')}
          </p>
          <Link
            to="/"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            {t('dashboard.goHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-8 border border-purple-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gradient-cyber mb-2">
              {t('dashboard.title')}
            </h1>
            <p className="text-gray-400">
              {t('dashboard.welcome')}, {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/upload"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              📤 {t('dashboard.uploadContent')}
            </Link>
            <Link
              to="/mint"
              className="px-6 py-3 glass-light border border-cyan-500/30 rounded-lg font-semibold hover:bg-white/5 transition-all"
            >
              🎨 {t('dashboard.mintNFT')}
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass rounded-xl p-2 border border-purple-500/20">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📊 {t('dashboard.overview')}
          </button>
          <button
            onClick={() => setActiveTab('distributions')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === 'distributions'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            💰 {t('dashboard.distributions')}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === 'content'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            🎨 {t('dashboard.content')}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📈 {t('dashboard.analytics')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-light rounded-xl p-6 border border-purple-500/20">
                <div className="text-sm text-gray-400 mb-2">{t('dashboard.totalEarnings')}</div>
                <div className="text-3xl font-bold text-gradient-cyber">$12,345</div>
                <div className="text-xs text-green-400 mt-2">+15% {t('dashboard.thisMonth')}</div>
              </div>
              <div className="glass-light rounded-xl p-6 border border-cyan-500/20">
                <div className="text-sm text-gray-400 mb-2">{t('dashboard.totalContent')}</div>
                <div className="text-3xl font-bold text-gradient-neon">24</div>
                <div className="text-xs text-cyan-400 mt-2">+3 {t('dashboard.thisMonth')}</div>
              </div>
              <div className="glass-light rounded-xl p-6 border border-pink-500/20">
                <div className="text-sm text-gray-400 mb-2">{t('dashboard.totalViews')}</div>
                <div className="text-3xl font-bold text-gradient-cyber">8,432</div>
                <div className="text-xs text-pink-400 mt-2">+22% {t('dashboard.thisMonth')}</div>
              </div>
              <div className="glass-light rounded-xl p-6 border border-purple-500/20">
                <div className="text-sm text-gray-400 mb-2">{t('dashboard.totalSales')}</div>
                <div className="text-3xl font-bold text-gradient-neon">156</div>
                <div className="text-xs text-purple-400 mt-2">+8% {t('dashboard.thisMonth')}</div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="glass rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-bold text-white mb-4">
                {t('dashboard.revenueOverview')}
              </h3>
              <RevenueChart />
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-xl p-6 border border-cyan-500/20">
              <h3 className="text-xl font-bold text-white mb-4">
                {t('dashboard.recentActivity')}
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-4 glass-light rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 flex items-center justify-center">
                        💰
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {t('dashboard.newSale')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {t('dashboard.minutesAgo', { minutes: i * 15 })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-cyan-400">+$125.00</div>
                      <div className="text-xs text-gray-500">0.05 ETH</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'distributions' && <DistributionDashboard />}

        {activeTab === 'content' && (
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">{t('dashboard.myContent')}</h3>
              <Link
                to="/upload"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                + {t('dashboard.addNew')}
              </Link>
            </div>
            <ContentPerformance />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-xl font-bold text-white mb-4">
                {t('dashboard.detailedAnalytics')}
              </h3>
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">📊</div>
                <p>{t('dashboard.analyticsComingSoon')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
