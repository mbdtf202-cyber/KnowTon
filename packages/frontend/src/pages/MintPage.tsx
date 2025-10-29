import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContentUpload } from '../hooks/useContentUpload'
import { useNFTMint } from '../hooks/useNFTMint'
import FileUpload from '../components/FileUpload'
import UploadProgress from '../components/UploadProgress'
import MintForm from '../components/MintForm'
import TransactionModal from '../components/TransactionModal'

export default function MintPage() {
  const navigate = useNavigate()
  const { isConnected } = useAuth()
  const { uploadState, uploadFile, reset: resetUpload } = useContentUpload()
  const { mintState, mintNFT, reset: resetMint } = useNFTMint()
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'form'>('upload')

  // Redirect if not connected
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <svg className="h-12 w-12 text-yellow-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">需要连接钱包</h2>
          <p className="text-gray-600 mb-4">
            请先连接您的 Web3 钱包以铸造 NFT
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    const contentHash = await uploadFile(file)
    
    if (contentHash) {
      setStep('form')
    }
  }

  const handleMintSubmit = async (formData: any) => {
    try {
      await mintNFT(formData)
    } catch (error) {
      console.error('Mint error:', error)
    }
  }

  const handleModalClose = () => {
    if (mintState.status === 'complete') {
      // Reset and go back to upload step
      resetUpload()
      resetMint()
      setSelectedFile(null)
      setStep('upload')
    } else if (mintState.status === 'error') {
      resetMint()
    }
  }

  const handleStartOver = () => {
    resetUpload()
    resetMint()
    setSelectedFile(null)
    setStep('upload')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">铸造 IP-NFT</h1>
        <p className="text-gray-600">
          将您的知识产权作品铸造为 NFT，实现链上所有权和版税收益
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step === 'upload' ? 'border-blue-600 bg-blue-50' : 'border-green-600 bg-green-50'
            }`}>
              {step === 'form' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-semibold">1</span>
              )}
            </div>
            <span className="ml-2 font-medium">上传内容</span>
          </div>
          
          <div className="w-16 h-0.5 bg-gray-300"></div>
          
          <div className={`flex items-center ${step === 'form' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step === 'form' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
            }`}>
              <span className="text-sm font-semibold">2</span>
            </div>
            <span className="ml-2 font-medium">填写信息</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {step === 'upload' && (
          <div>
            {uploadState.status === 'idle' && (
              <FileUpload
                onFileSelect={handleFileSelect}
                accept="*/*"
                maxSize={500 * 1024 * 1024} // 500MB
              />
            )}

            {(uploadState.status === 'uploading' || 
              uploadState.status === 'processing' || 
              uploadState.status === 'complete') && 
              selectedFile && (
              <div className="space-y-4">
                <UploadProgress
                  progress={uploadState.progress}
                  fileName={selectedFile.name}
                  fileSize={selectedFile.size}
                  status={uploadState.status}
                  error={uploadState.error || undefined}
                />
                
                {uploadState.status === 'complete' && (
                  <div className="text-center">
                    <p className="text-green-600 font-medium mb-4">
                      ✓ 文件上传成功！
                    </p>
                    <button
                      onClick={() => setStep('form')}
                      className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      继续填写信息
                    </button>
                  </div>
                )}
              </div>
            )}

            {uploadState.status === 'error' && (
              <div className="text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                  <svg className="h-12 w-12 text-red-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">上传失败</h3>
                  <p className="text-gray-600">{uploadState.error}</p>
                </div>
                <button
                  onClick={handleStartOver}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  重新上传
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'form' && uploadState.contentHash && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">NFT 信息</h2>
              <button
                onClick={handleStartOver}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← 重新上传
              </button>
            </div>
            
            <MintForm
              contentHash={uploadState.contentHash}
              onSubmit={handleMintSubmit}
              isSubmitting={mintState.isMinting}
            />
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">版权保护</h3>
              <p className="text-sm text-gray-600">
                AI 技术自动生成内容指纹，保护您的知识产权
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">自动版税</h3>
              <p className="text-sm text-gray-600">
                每次二次销售自动获得版税收益
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">去中心化存储</h3>
              <p className="text-sm text-gray-600">
                内容永久存储在 IPFS，确保不会丢失
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {mintState.status !== 'idle' && (
        <TransactionModal
          isOpen={mintState.isMinting || mintState.status === 'complete' || mintState.status === 'error'}
          status={mintState.status as 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'}
          txHash={mintState.txHash}
          tokenId={mintState.tokenId}
          error={mintState.error}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
