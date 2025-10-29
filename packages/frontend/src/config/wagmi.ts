import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrum, arbitrumGoerli } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'KnowTon',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    arbitrum,
    arbitrumGoerli,
  ],
  ssr: false,
})
