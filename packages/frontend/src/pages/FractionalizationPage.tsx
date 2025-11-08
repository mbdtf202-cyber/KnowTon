import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useFractionalization } from '../hooks/useFractionalization';
import FractionalizationForm from '../components/FractionalizationForm.tsx';
import FractionDistribution from '../components/FractionDistribution.tsx';
import LiquidityPoolStats from '../components/LiquidityPoolStats.tsx';
import { SwapInterface } from '../components/SwapInterface';

export default function FractionalizationPage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const {
    fractionalizeState,
    vaultInfo,
    loadVaultInfo,
  } = useFractionalization();

  const [activeTab, setActiveTab] = useState<'fractionalize' | 'distribution' | 'pool' | 'trade'>('fractionalize');
  const [vaultId, setVaultId] = useState<string | null>(null);

  useEffect(() => {
    // Check if NFT is already fractionalized
    if (tokenId) {
      // In production, this would check if vault exists for this NFT
      // For now, we'll use the fractionalizeState
      if (fractionalizeState.vaultId) {
        setVaultId(fractionalizeState.vaultId);
        loadVaultInfo(fractionalizeState.vaultId);
      }
    }
  }, [tokenId, fractionalizeState.vaultId, loadVaultInfo]);

  if (!tokenId) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="text-center">
          <p className="text-red-600">Invalid NFT Token ID</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">Please connect your wallet to fractionalize NFTs</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isVaultCreated = vaultId !== null || fractionalizeState.status === 'complete';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/nft/${tokenId}`)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to NFT Details
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          NFT Fractionalization
        </h1>
        <p className="text-gray-600">
          Split your NFT into tradeable fractional tokens
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('fractionalize')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'fractionalize'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {isVaultCreated ? 'Vault Info' : 'Fractionalize'}
            </button>
            {isVaultCreated && (
              <>
                <button
                  onClick={() => setActiveTab('distribution')}
                  className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                    activeTab === 'distribution'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Distribution
                </button>
                <button
                  onClick={() => setActiveTab('pool')}
                  className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                    activeTab === 'pool'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Liquidity Pool
                </button>
                <button
                  onClick={() => setActiveTab('trade')}
                  className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                    activeTab === 'trade'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Trade
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'fractionalize' && (
          <FractionalizationForm
            tokenId={tokenId}
            onSuccess={(result: { vaultId: string; fractionalToken: string; poolAddress: string }) => {
              setVaultId(result.vaultId);
              setActiveTab('distribution');
            }}
            fractionalizeState={fractionalizeState}
            vaultInfo={vaultInfo}
            isVaultCreated={isVaultCreated}
          />
        )}

        {activeTab === 'distribution' && vaultId && (
          <FractionDistribution
            vaultId={vaultId}
            vaultInfo={vaultInfo}
          />
        )}

        {activeTab === 'pool' && vaultId && fractionalizeState.poolAddress && (
          <LiquidityPoolStats
            vaultId={vaultId}
            poolAddress={fractionalizeState.poolAddress}
            fractionalToken={fractionalizeState.fractionalToken || ''}
          />
        )}

        {activeTab === 'trade' && vaultId && fractionalizeState.fractionalToken && (
          <SwapInterface
            vaultId={vaultId}
            fractionalToken={fractionalizeState.fractionalToken}
            fractionalTokenSymbol={vaultInfo?.tokenSymbol || 'FRAC'}
          />
        )}
      </div>
    </div>
  );
}
