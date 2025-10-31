import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

// Eager load critical pages
import HomePage from './pages/HomePage'

// Lazy load non-critical pages
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'))
const MintPage = lazy(() => import('./pages/MintPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const NFTDetailsPage = lazy(() => import('./pages/NFTDetailsPage'))
const TradingPage = lazy(() => import('./pages/TradingPage'))
const FractionalizePage = lazy(() => import('./pages/FractionalizePage'))
const StakingPage = lazy(() => import('./pages/StakingPage'))
const GovernancePage = lazy(() => import('./pages/GovernancePage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ResponsiveTestPage = lazy(() => import('./pages/ResponsiveTestPage'))
const TestPage = lazy(() => import('./pages/TestPage'))
const SystemTestPage = lazy(() => import('./pages/SystemTestPage'))
const BondPage = lazy(() => import('./pages/BondPage'))

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bonds" element={<BondPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/nft/:tokenId" element={<NFTDetailsPage />} />
            <Route path="/trade/:tokenId" element={<TradingPage />} />
            <Route path="/trading" element={<TradingPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/mint" element={<MintPage />} />
            <Route path="/fractionalize/:tokenId" element={<FractionalizePage />} />
            <Route path="/staking" element={<StakingPage />} />
            <Route path="/governance" element={<GovernancePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:address" element={<ProfilePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/responsive-test" element={<ResponsiveTestPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/system-test" element={<SystemTestPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App
