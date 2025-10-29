import { useSwitchChain, useChainId } from 'wagmi'
import { arbitrum, arbitrumGoerli } from 'wagmi/chains'

export function useChainSwitch() {
  const chainId = useChainId()
  const { chains, switchChain, isPending } = useSwitchChain()

  const switchToArbitrum = () => {
    switchChain({ chainId: arbitrum.id })
  }

  const switchToArbitrumGoerli = () => {
    switchChain({ chainId: arbitrumGoerli.id })
  }

  const isArbitrum = chainId === arbitrum.id
  const isArbitrumGoerli = chainId === arbitrumGoerli.id

  return {
    chainId,
    chains,
    switchChain,
    switchToArbitrum,
    switchToArbitrumGoerli,
    isArbitrum,
    isArbitrumGoerli,
    isPending,
  }
}
