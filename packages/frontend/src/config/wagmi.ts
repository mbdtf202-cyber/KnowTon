import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrum, arbitrumGoerli, mainnet, sepolia } from 'wagmi/chains'

// Enhanced multi-wallet configuration
export const config = getDefaultConfig({
  appName: 'KnowTon Platform',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    arbitrum,
    arbitrumGoerli,
    mainnet,
    sepolia,
  ],
  ssr: false,
})
