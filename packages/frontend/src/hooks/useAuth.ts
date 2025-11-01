import { useEffect, useState } from 'react'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { useAppStore } from '../store/useAppStore'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useAuth() {
  const { address, isConnected, connector } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { user, setUser, setConnected, disconnect: storeDisconnect } = useAppStore()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      setConnected(true)
      if (!user || user.address !== address) {
        // Auto-authenticate when wallet connects
        signIn().catch(console.error)
      }
    } else {
      setConnected(false)
      if (user) {
        storeDisconnect()
      }
    }
  }, [isConnected, address])

  const getWalletType = (): 'metamask' | 'walletconnect' | 'coinbase' | 'other' => {
    if (!connector) return 'other'
    
    const connectorName = connector.name.toLowerCase()
    if (connectorName.includes('metamask')) return 'metamask'
    if (connectorName.includes('walletconnect')) return 'walletconnect'
    if (connectorName.includes('coinbase')) return 'coinbase'
    return 'other'
  }

  const signIn = async () => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    if (isAuthenticating) {
      return
    }

    setIsAuthenticating(true)

    try {
      // Get nonce from backend
      const nonceResponse = await axios.post(`${API_URL}/api/v1/auth/wallet/nonce`, {
        address,
      })
      const message = nonceResponse.data.nonce
      
      // Sign message
      const signature = await signMessageAsync({ message })
      
      // Verify signature on backend and get JWT token
      const verifyResponse = await axios.post(`${API_URL}/api/v1/auth/wallet/verify`, {
        address,
        message,
        signature,
        walletType: getWalletType(),
      })

      const { token, user: userData } = verifyResponse.data
      
      // Store token
      localStorage.setItem('auth_token', token)
      
      // Update user state
      setUser({ 
        address: userData.address,
        walletType: userData.walletType,
        role: userData.role,
      })
      setConnected(true)
      
      return { token, user: userData }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setIsAuthenticating(false)
    }
  }

  const signOut = async () => {
    try {
      // Call logout endpoint
      const token = localStorage.getItem('auth_token')
      if (token) {
        await axios.post(`${API_URL}/api/v1/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local state
      localStorage.removeItem('auth_token')
      storeDisconnect()
      wagmiDisconnect()
    }
  }

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return null

      const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const newToken = response.data.token
      localStorage.setItem('auth_token', newToken)
      
      return newToken
    } catch (error) {
      console.error('Token refresh error:', error)
      return null
    }
  }

  return {
    address,
    isConnected,
    user,
    isAuthenticating,
    walletType: getWalletType(),
    signIn,
    signOut,
    refreshToken,
  }
}
