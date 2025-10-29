import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function SignInButton() {
  const { isConnected, user, signIn, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return null
  }

  if (user) {
    return (
      <button
        onClick={signOut}
        className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
      >
        退出登录
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '签名中...' : '签名登录'}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
