import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { nftAPI, creatorAPI } from '../services/api'
import type { IPNFT, Transaction, User } from '../types'
import { formatAddress, formatDate, formatEther } from '../utils/format'
import { useNavigate } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function ProfilePage() {
  const { address } = useAccount()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions' | 'settings'>('portfolio')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nfts, setNfts] = useState<IPNFT[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    email: '',
    avatar: '',
    twitter: '',
    discord: '',
    website: '',
  })

  useEffect(() => {
    if (address) {
      loadProfileData()
    }
  }, [address])

  const loadProfileData = async () => {
    if (!address) return

    setLoading(true)
    try {
      // Load user profile
      const profileResponse = await creatorAPI.getProfile(address)
      const profileData = profileResponse.data as User
      setProfile(profileData)
      setEditForm({
        username: profileData.username || '',
        bio: profileData.bio || '',
        email: profileData.email || '',
        avatar: profileData.avatar || '',
        twitter: profileData.socialLinks?.twitter || '',
        discord: profileData.socialLinks?.discord || '',
        website: profileData.socialLinks?.website || '',
      })

      // Load user's NFTs
      const nftResponse = await nftAPI.getAll({ limit: 100 })
      const nftData = nftResponse.data as { nfts: IPNFT[] }
      setNfts(nftData?.nfts || [])

      // Mock transaction data (would come from API in production)
      setTransactions([
        {
          id: '1',
          txHash: '0x1234...5678',
          blockNumber: 12345678,
          timestamp: new Date(Date.now() - 86400000),
          from: address,
          to: '0xabcd...efgh',
          tokenId: '1',
          type: 'mint',
          amount: '0',
          currency: 'ETH',
          status: 'confirmed',
        },
        {
          id: '2',
          txHash: '0x8765...4321',
          blockNumber: 12345679,
          timestamp: new Date(Date.now() - 172800000),
          from: '0xijkl...mnop',
          to: address,
          tokenId: '2',
          type: 'sale',
          amount: '0.5',
          currency: 'ETH',
          status: 'confirmed',
        },
      ])
    } catch (error) {
      console.error('Failed to load profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!address) return

    try {
      await creatorAPI.update(address, {
        username: editForm.username,
        bio: editForm.bio,
      })
      setIsEditing(false)
      await loadProfileData()
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('更新资料失败，请重试')
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mint: '铸造',
      transfer: '转移',
      sale: '出售',
      fractionalize: '碎片化',
      redeem: '赎回',
    }
    return labels[type] || type
  }

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      mint: 'text-green-600 bg-green-50',
      transfer: 'text-blue-600 bg-blue-50',
      sale: 'text-purple-600 bg-purple-50',
      fractionalize: 'text-orange-600 bg-orange-50',
      redeem: 'text-red-600 bg-red-50',
    }
    return colors[type] || 'text-gray-600 bg-gray-50'
  }

  if (!address) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">请先连接钱包</h2>
        <p className="text-gray-600">您需要连接钱包才能查看个人中心</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Wallet Info Card */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">钱包信息</h2>
            <p className="text-sm opacity-90">管理您的钱包和网络设置</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile?.username?.[0]?.toUpperCase() || address.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile?.username || '未命名用户'}</h1>
              <p className="text-gray-600 text-sm">{formatAddress(address)}</p>
              {profile?.did && (
                <p className="text-xs text-gray-500 mt-1">DID: {profile.did.slice(0, 20)}...</p>
              )}
              {profile?.reputation && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-sm text-gray-600">声誉等级: {profile.reputation.level}</span>
                  <span className="text-sm text-gray-600">积分: {profile.reputation.score}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {isEditing ? '取消编辑' : '编辑资料'}
          </button>
        </div>

        {profile?.bio && !isEditing && (
          <p className="mt-4 text-gray-700">{profile.bio}</p>
        )}

        {profile?.socialLinks && !isEditing && (
          <div className="flex space-x-4 mt-4">
            {profile.socialLinks.twitter && (
              <a
                href={`https://twitter.com/${profile.socialLinks.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                Twitter
              </a>
            )}
            {profile.socialLinks.discord && (
              <span className="text-indigo-500">Discord: {profile.socialLinks.discord}</span>
            )}
            {profile.socialLinks.website && (
              <a
                href={profile.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600"
              >
                Website
              </a>
            )}
          </div>
        )}

        {/* Edit Form */}
        {isEditing && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="输入用户名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="介绍一下自己..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">头像 URL</label>
              <input
                type="text"
                value={editForm.avatar}
                onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                <input
                  type="text"
                  value={editForm.twitter}
                  onChange={(e) => setEditForm({ ...editForm, twitter: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discord</label>
                <input
                  type="text"
                  value={editForm.discord}
                  onChange={(e) => setEditForm({ ...editForm, discord: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="username#1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleSaveProfile}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'portfolio'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              NFT 组合 ({nfts.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              交易历史 ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              设置
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div>
              {nfts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">您还没有任何 NFT</p>
                  <button
                    onClick={() => navigate('/mint')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    铸造第一个 NFT
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nfts.map((nft) => (
                    <div
                      key={nft.tokenId}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/nft/${nft.tokenId}`)}
                    >
                      <div className="aspect-square bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                        #{nft.tokenId}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500 uppercase">{nft.category}</span>
                          {nft.verified && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              已验证
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Token #{nft.tokenId}</h3>
                        {nft.floorPrice && (
                          <p className="text-sm text-gray-600">
                            底价: {formatEther(nft.floorPrice)} ETH
                          </p>
                        )}
                        {nft.totalRevenue && (
                          <p className="text-sm text-gray-600">
                            总收益: {formatEther(nft.totalRevenue)} ETH
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">暂无交易记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(
                              tx.type
                            )}`}
                          >
                            {getTransactionTypeLabel(tx.type)}
                          </span>
                          <div>
                            <p className="font-medium">Token #{tx.tokenId}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(tx.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.amount !== '0' && (
                            <p className="font-semibold">
                              {tx.type === 'sale' && tx.to === address ? '+' : '-'}
                              {formatEther(tx.amount)} {tx.currency}
                            </p>
                          )}
                          <a
                            href={`https://arbiscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            查看交易 ↗
                          </a>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <span>从: {formatAddress(tx.from)}</span>
                        <span className="mx-2">→</span>
                        <span>到: {formatAddress(tx.to)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">账户设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">钱包地址</p>
                      <p className="text-sm text-gray-600">{address}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(address)}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      复制
                    </button>
                  </div>

                  {profile?.did && (
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium">去中心化身份 (DID)</p>
                        <p className="text-sm text-gray-600 break-all">{profile.did}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(profile.did!)}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        复制
                      </button>
                    </div>
                  )}

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium mb-2">账户创建时间</p>
                    <p className="text-sm text-gray-600">
                      {profile?.createdAt ? formatDate(profile.createdAt) : '未知'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">隐私设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">公开个人资料</p>
                      <p className="text-sm text-gray-600">允许其他用户查看您的资料</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">显示交易历史</p>
                      <p className="text-sm text-gray-600">允许其他用户查看您的交易记录</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
