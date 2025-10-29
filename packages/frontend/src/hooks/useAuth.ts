import { useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useAppStore } from '../store/useAppStore'

export function useAuth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { user, setUser, setConnected, disconnect } = useAppStore()

  useEffect(() => {
    if (isConnected && address) {
      setConnected(true)
      if (!user || user.address !== address) {
        setUser({ address })
      }
    } else {
      setConnected(false)
      if (user) {
        disconnect()
      }
    }
  }, [isConnected, address, user, setUser, setConnected, disconnect])

  const signIn = async () => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    try {
      // Create SIWE message
      const message = `Sign in to KnowTon\n\nAddress: ${address}\nTimestamp: ${new Date().toISOString()}`
      
      // Sign message
      const signature = await signMessageAsync({ message })
      
      // TODO: Verify signature on backend and get JWT token
      console.log('Signature:', signature)
      
      // Update user state
      setUser({ address })
      setConnected(true)
      
      return signature
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signOut = () => {
    disconnect()
  }

  return {
    address,
    isConnected,
    user,
    signIn,
    signOut,
  }
}
