import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import UploadProgress from '../components/UploadProgress'
import { useContentUpload } from '../hooks/useContentUpload'
import { CONTENT_CATEGORIES, FILE_SIZE_LIMITS } from '../utils/constants'
import { validateRequired, validateMaxLength } from '../utils/validation'

interface ContentMetadata {
  title: string
  description: string
  category: string
  tags: string[]
  language: string
  license: string
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { uploadState, uploadFile, reset } = useContentUpload()
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<ContentMetadata>({
    title: '',
    description: '',
    category: 'music',
    tags: [],
    language: 'zh',
    license: 'CC BY-NC-SA 4.0',
  })
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    reset()
    
    // Auto-fill title from filename
    if (!metadata.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      setMetadata(prev => ({ ...prev, title: fileName }))
    }
  }

  const handleMetadataChange = (field: keyof ContentMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !metadata.tags.includes(tag) && metadata.tags.length < 10) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate title
    const titleError = validateRequired(metadata.title, '标题')
    if (titleError) {
      newErrors.title = titleError
    } else {
      const lengthError = validateMaxLength(metadata.title, 100, '标题')
      if (lengthError) newErrors.title = lengthError
    }

    // Validate description
    const descError = validateRequired(metadata.description, '描述')
    if (descError) {
      newErrors.description = descError
    } else {
      const lengthError = validateMaxLength(metadata.description, 1000, '描述')
      if (lengthError) newErrors.description = lengthError
    }

    // Validate category
    if (!metadata.category) {
      newErrors.category = '请选择内容分类'
    }

    // Validate file
    if (!selectedFile) {
      newErrors.file = '请选择要上传的文件'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpload = async () => {
    if (!validateForm() || !selectedFile) {
      return
    }

    const contentHash = await uploadFile(selectedFile)
    
    if (contentHash) {
      // Store metadata in session storage for the mint page
      sessionStorage.setItem('uploadedContent', JSON.stringify({
        contentHash,
        file: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
        },
        metadata,
      }))
      
      // Navigate to mint page
      setTimeout(() => {
        navigate('/mint')
      }, 1500)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">上传内容</h1>
      <p className="text-gray-600 mb-8">
        上传您的知识产权内容到 IPFS，准备铸造为 NFT
      </p>

      <div className="space-y-8">
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">选择文件</h2>
          
          {!selectedFile ? (
            <FileUpload
              onFileSelect={handleFileSelect}
              maxSize={FILE_SIZE_LIMITS.VIDEO}
              disabled={uploadState.isUploading}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                {uploadState.status === 'idle' && (
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      reset()
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    移除
                  </button>
                )}
              </div>

              {uploadState.status !== 'idle' && (
                <UploadProgress
                  progress={uploadState.progress}
                  fileName={selectedFile.name}
                  fileSize={selectedFile.size}
                  status={uploadState.status}
                  error={uploadState.error || undefined}
                />
              )}
            </div>
          )}
          
          {errors.file && (
            <p className="mt-2 text-sm text-red-600">{errors.file}</p>
          )}
        </div>

        {/* Metadata Form Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">内容信息</h2>
          
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={metadata.title}
                onChange={(e) => handleMetadataChange('title', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="输入内容标题"
                maxLength={100}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {metadata.title.length}/100 字符
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={metadata.description}
                onChange={(e) => handleMetadataChange('description', e.target.value)}
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="详细描述您的内容..."
                maxLength={1000}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {metadata.description.length}/1000 字符
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                分类 <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={metadata.category}
                onChange={(e) => handleMetadataChange('category', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {CONTENT_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category === 'music' && '音乐'}
                    {category === 'video' && '视频'}
                    {category === 'ebook' && '电子书'}
                    {category === 'course' && '课程'}
                    {category === 'software' && '软件'}
                    {category === 'artwork' && '艺术品'}
                    {category === 'research' && '研究论文'}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                标签
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入标签后按回车添加"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || metadata.tags.length >= 10}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
              
              {metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                最多添加 10 个标签 ({metadata.tags.length}/10)
              </p>
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                语言
              </label>
              <select
                id="language"
                value={metadata.language}
                onChange={(e) => handleMetadataChange('language', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            {/* License */}
            <div>
              <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-2">
                许可协议
              </label>
              <select
                id="license"
                value={metadata.license}
                onChange={(e) => handleMetadataChange('license', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="CC BY-NC-SA 4.0">CC BY-NC-SA 4.0 (署名-非商业-相同方式共享)</option>
                <option value="CC BY-NC 4.0">CC BY-NC 4.0 (署名-非商业)</option>
                <option value="CC BY-SA 4.0">CC BY-SA 4.0 (署名-相同方式共享)</option>
                <option value="CC BY 4.0">CC BY 4.0 (署名)</option>
                <option value="All Rights Reserved">All Rights Reserved (保留所有权利)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={uploadState.isUploading}
          >
            取消
          </button>
          
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploadState.isUploading || uploadState.status === 'complete'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {uploadState.isUploading ? '上传中...' : '上传到 IPFS'}
          </button>
        </div>
      </div>
    </div>
  )
}
