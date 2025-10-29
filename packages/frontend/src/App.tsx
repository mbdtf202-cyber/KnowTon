import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import MarketplacePage from './pages/MarketplacePage'
import MintPage from './pages/MintPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import UploadPage from './pages/UploadPage'
import NFTDetailsPage from './pages/NFTDetailsPage'
import TradingPage from './pages/TradingPage'
import FractionalizePage from './pages/FractionalizePage'
import StakingPage from './pages/StakingPage'
import GovernancePage from './pages/GovernancePage'
import AnalyticsPage from './pages/AnalyticsPage'
import ResponsiveTestPage from './pages/ResponsiveTestPage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/nft/:tokenId" element={<NFTDetailsPage />} />
          <Route path="/trade/:tokenId" element={<TradingPage />} />
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
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
