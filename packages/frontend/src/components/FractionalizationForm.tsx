import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useFractionalization } from '../hooks/useFractionalization';
import type { FractionalizeFormData, FractionalizeState, VaultInfo } from '../hooks/useFractionalization';

interface FractionalizationFormProps {
  tokenId: string;
  onSuccess: (result: { vaultId: string; fractionalToken: string; poolAddress: string }) => void;
  fractionalizeState: FractionalizeState;
  vaultInfo: VaultInfo | null;
  isVaultCreated: boolean;
}

export default function FractionalizationForm({
  tokenId,
  onSuccess,
  fractionalizeState,
  vaultInfo,
  isVaultCreated,
}: FractionalizationFormProps) {
  const { address } = useAccount();
  const { fractionalize } = useFractionalization();

  const [formData, setFormData] = useState<FractionalizeFormData>({
    tokenId,
    totalSupply: '10000',
    tokenName: '',
    tokenSymbol: '',
    reservePrice: '1.0',
    initialLiquidity: '0.5',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FractionalizeFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FractionalizeFormData, string>> = {};

    if (!formData.tokenName.trim()) {
      newErrors.tokenName = 'Token name is required';
    }

    if (!formData.tokenSymbol.trim()) {
      newErrors.tokenSymbol = 'Token symbol is required';
    } else if (formData.tokenSymbol.length > 10) {
      newErrors.tokenSymbol = 'Symbol must be 10 characters or less';
    }

    const supply = parseFloat(formData.totalSupply);
    if (isNaN(supply) || supply < 1000 || supply > 1000000) {
      newErrors.totalSupply = 'Supply must be between 1,000 and 1,000,000';
    }

    const reservePrice = parseFloat(formData.reservePrice);
    if (isNaN(reservePrice) || reservePrice <= 0) {
      newErrors.reservePrice = 'Reserve price must be greater than 0';
    }

    const liquidity = parseFloat(formData.initialLiquidity);
    if (isNaN(liquidity) || liquidity <= 0) {
      newErrors.initialLiquidity = 'Initial liquidity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await fractionalize(formData);
      if (result) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Fractionalization failed:', error);
    }
  };

  const handleInputChange = (field: keyof FractionalizeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // If vault is already created, show vault info
  if (isVaultCreated && vaultInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vault Created Successfully</h2>
              <p className="text-gray-600">Your NFT has been fractionalized</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Vault Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vault ID</span>
                  <span className="font-medium text-gray-900">{fractionalizeState.vaultId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token Name</span>
                  <span className="font-medium text-gray-900">{vaultInfo.tokenName || formData.tokenName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token Symbol</span>
                  <span className="font-medium text-gray-900">{vaultInfo.tokenSymbol || formData.tokenSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Supply</span>
                  <span className="font-medium text-gray-900">{fractionalizeState.totalSupply || formData.totalSupply}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reserve Price</span>
                  <span className="font-medium text-gray-900">{formData.reservePrice} ETH</span>
                </div>
              </div>
            </div>

            {fractionalizeState.fractionalToken && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Fractional Token</h3>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-white px-3 py-1 rounded border border-blue-200 flex-1 overflow-x-auto">
                    {fractionalizeState.fractionalToken}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(fractionalizeState.fractionalToken!)}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                    title="Copy address"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {fractionalizeState.poolAddress && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Liquidity Pool</h3>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-white px-3 py-1 rounded border border-green-200 flex-1 overflow-x-auto">
                    {fractionalizeState.poolAddress}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(fractionalizeState.poolAddress!)}
                    className="p-2 hover:bg-green-100 rounded transition-colors"
                    title="Copy address"
                  >
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {fractionalizeState.txHash && (
              <div className="text-center">
                <a
                  href={`https://arbiscan.io/tx/${fractionalizeState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Transaction on Explorer →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Fractionalize Your NFT</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Name *
            </label>
            <input
              type="text"
              value={formData.tokenName}
              onChange={(e) => handleInputChange('tokenName', e.target.value)}
              placeholder="e.g., Fractional Art Token"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.tokenName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={fractionalizeState.isFractionalizing}
            />
            {errors.tokenName && (
              <p className="mt-1 text-sm text-red-600">{errors.tokenName}</p>
            )}
          </div>

          {/* Token Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Symbol *
            </label>
            <input
              type="text"
              value={formData.tokenSymbol}
              onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
              placeholder="e.g., FART"
              maxLength={10}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.tokenSymbol ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={fractionalizeState.isFractionalizing}
            />
            {errors.tokenSymbol && (
              <p className="mt-1 text-sm text-red-600">{errors.tokenSymbol}</p>
            )}
          </div>

          {/* Total Supply */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Supply *
            </label>
            <input
              type="number"
              value={formData.totalSupply}
              onChange={(e) => handleInputChange('totalSupply', e.target.value)}
              placeholder="10000"
              min="1000"
              max="1000000"
              step="1"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.totalSupply ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={fractionalizeState.isFractionalizing}
            />
            <p className="mt-1 text-sm text-gray-500">
              Number of fractional tokens to create (1,000 - 1,000,000)
            </p>
            {errors.totalSupply && (
              <p className="mt-1 text-sm text-red-600">{errors.totalSupply}</p>
            )}
          </div>

          {/* Reserve Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reserve Price (ETH) *
            </label>
            <input
              type="number"
              value={formData.reservePrice}
              onChange={(e) => handleInputChange('reservePrice', e.target.value)}
              placeholder="1.0"
              min="0.001"
              step="0.001"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.reservePrice ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={fractionalizeState.isFractionalizing}
            />
            <p className="mt-1 text-sm text-gray-500">
              Minimum price for buyout redemption
            </p>
            {errors.reservePrice && (
              <p className="mt-1 text-sm text-red-600">{errors.reservePrice}</p>
            )}
          </div>

          {/* Initial Liquidity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Liquidity (ETH) *
            </label>
            <input
              type="number"
              value={formData.initialLiquidity}
              onChange={(e) => handleInputChange('initialLiquidity', e.target.value)}
              placeholder="0.5"
              min="0.01"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.initialLiquidity ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={fractionalizeState.isFractionalizing}
            />
            <p className="mt-1 text-sm text-gray-500">
              ETH to add to the Uniswap liquidity pool
            </p>
            {errors.initialLiquidity && (
              <p className="mt-1 text-sm text-red-600">{errors.initialLiquidity}</p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What happens when you fractionalize?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your NFT will be locked in a vault contract</li>
                  <li>Fractional ERC-20 tokens will be minted to your wallet</li>
                  <li>A Uniswap V3 liquidity pool will be created</li>
                  <li>Token holders can vote to redeem the NFT</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {fractionalizeState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{fractionalizeState.error}</p>
            </div>
          )}

          {/* Status Display */}
          {fractionalizeState.isFractionalizing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {fractionalizeState.status === 'preparing' && 'Preparing fractionalization...'}
                    {fractionalizeState.status === 'signing' && 'Please sign the transaction...'}
                    {fractionalizeState.status === 'confirming' && 'Confirming transaction...'}
                    {fractionalizeState.status === 'creating_pool' && 'Creating liquidity pool...'}
                  </p>
                  {fractionalizeState.txHash && (
                    <a
                      href={`https://arbiscan.io/tx/${fractionalizeState.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View on Explorer →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!address || fractionalizeState.isFractionalizing}
            className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
              !address || fractionalizeState.isFractionalizing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {!address
              ? 'Connect Wallet'
              : fractionalizeState.isFractionalizing
              ? 'Fractionalizing...'
              : 'Fractionalize NFT'}
          </button>
        </form>
      </div>
    </div>
  );
}
