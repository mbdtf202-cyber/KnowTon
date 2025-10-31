import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useIssueBond, useInvestBond, useRedeemBond, useBondInfo, useApproveToken } from '../hooks/useIPBond'
import { formatEther } from 'viem'

export default function BondPage() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'issue' | 'invest' | 'manage'>('issue')
  
  // Issue Bond
  const [principal, setPrincipal] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [duration, setDuration] = useState('')
  const { issueBond, isPending: isIssuing, isSuccess: issueSuccess, hash: issueHash } = useIssueBond()
  
  // Invest in Bond
  const [investBondId, setInvestBondId] = useState('')
  const [investAmount, setInvestAmount] = useState('')
  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveToken()
  const { invest, isPending: isInvesting, isSuccess: investSuccess, hash: investHash } = useInvestBond()
  
  // Redeem Bond
  const [redeemBondId, setRedeemBondId] = useState('')
  const { redeem, isPending: isRedeeming, isSuccess: redeemSuccess, hash: redeemHash } = useRedeemBond()
  
  // View Bond Info
  const [viewBondId, setViewBondId] = useState('')
  const { bond, refetch } = useBondInfo(viewBondId ? Number(viewBondId) : undefined)

  const handleIssueBond = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!principal || !interestRate || !duration) return
    
    try {
      await issueBond(principal, Number(interestRate), Number(duration))
    } catch (error) {
      console.error('Issue bond failed:', error)
    }
  }

  const handleApproveAndInvest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!investBondId || !investAmount) return
    
    try {
      // First approve
      await approve(investAmount)
      // Then invest (user needs to call this after approval)
    } catch (error) {
      console.error('Approve failed:', error)
    }
  }

  const handleInvest = async () => {
    if (!investBondId || !investAmount) return
    
    try {
      await invest(Number(investBondId), investAmount)
    } catch (error) {
      console.error('Invest failed:', error)
    }
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!redeemBondId) return
    
    try {
      await redeem(Number(redeemBondId))
    } catch (error) {
      console.error('Redeem failed:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access bond features</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gradient-cyber">IP Bond Management</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('issue')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'issue'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
              : 'glass-light text-gray-300 hover:text-white'
          }`}
        >
          Issue Bond
        </button>
        <button
          onClick={() => setActiveTab('invest')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'invest'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
              : 'glass-light text-gray-300 hover:text-white'
          }`}
        >
          Invest
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'manage'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
              : 'glass-light text-gray-300 hover:text-white'
          }`}
        >
          Manage
        </button>
      </div>

      {/* Issue Bond Tab */}
      {activeTab === 'issue' && (
        <div className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">Issue New Bond</h2>
          <form onSubmit={handleIssueBond} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Principal Amount (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-4 py-3 glass-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="1000"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Interest Rate (basis points, e.g., 500 = 5%)</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-3 glass-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Duration (days)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 glass-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="365"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isIssuing}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {isIssuing ? 'Issuing...' : 'Issue Bond'}
            </button>

            {issueSuccess && (
              <div className="p-4 glass-light rounded-lg border border-green-500">
                <p className="text-green-400">✅ Bond issued successfully!</p>
                <p className="text-sm text-gray-400 mt-2">Tx: {issueHash}</p>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Invest Tab */}
      {activeTab === 'invest' && (
        <div className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">Invest in Bond</h2>
          
          <form onSubmit={handleApproveAndInvest} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Bond ID</label>
              <input
                type="number"
                value={investBondId}
                onChange={(e) => setInvestBondId(e.target.value)}
                className="w-full px-4 py-3 glass-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Investment Amount (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                className="w-full px-4 py-3 glass-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="100"
                required
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isApproving || approveSuccess}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
              >
                {isApproving ? 'Approving...' : approveSuccess ? '✅ Approved' : '1. Approve Token'}
              </button>

              <button
                type="button"
                onClick={handleInvest}
                disabled={!approveSuccess || isInvesting}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50"
              >
                {isInvesting ? 'Investing...' : '2. Invest'}
              </button>
            </div>

            {investSuccess && (
              <div className="p-4 glass-light rounded-lg border border-green-500">
                <p className="text-green-400">✅ Investment successful!</p>
                <p className="text-sm text-gray-400 mt-2">Tx: {investHash}</p>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* View Bond Info */}
          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">View Bond Info</h2>
            <div className="flex gap-4 mb-6">
              <input
                type="number"
                value={viewBondId}
                onChange={(e) => setViewBondId(e.target.value)}
                className="flex-1 px-4 py-3 glass-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter Bond ID"
              />
              <button
                onClick={() => refetch()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Load
              </button>
            </div>

            {bond && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-light p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Bond ID</p>
                    <p className="text-xl font-bold">{bond.bondId.toString()}</p>
                  </div>
                  <div className="glass-light p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Principal</p>
                    <p className="text-xl font-bold">{formatEther(bond.principal)} ETH</p>
                  </div>
                  <div className="glass-light p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Interest Rate</p>
                    <p className="text-xl font-bold">{(Number(bond.interestRate) / 100).toFixed(2)}%</p>
                  </div>
                  <div className="glass-light p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Total Invested</p>
                    <p className="text-xl font-bold">{formatEther(bond.totalInvested)} ETH</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Redeem Bond */}
          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Redeem Investment</h2>
            <form onSubmit={handleRedeem} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Bond ID</label>
                <input
                  type="number"
                  value={redeemBondId}
                  onChange={(e) => setRedeemBondId(e.target.value)}
                  className="w-full px-4 py-3 glass-light rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRedeeming}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
              >
                {isRedeeming ? 'Redeeming...' : 'Redeem'}
              </button>

              {redeemSuccess && (
                <div className="p-4 glass-light rounded-lg border border-green-500">
                  <p className="text-green-400">✅ Redeemed successfully!</p>
                  <p className="text-sm text-gray-400 mt-2">Tx: {redeemHash}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
