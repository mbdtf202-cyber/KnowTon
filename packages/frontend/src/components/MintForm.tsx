import { useState } from 'react'
import { CONTENT_CATEGORIES, ROYALTY_LIMITS } from '../utils/constants'
import type { RoyaltyInfo } from '../types'

interface MintFormProps {
  contentHash: string
  onSubmit: (data: {
    contentHash: string
    title: string
    description: string
    category: string
    tags: string[]
    price: string
    royalty: RoyaltyInfo
  }) => void
  isSubmitting: boolean
}

export default function MintForm({ contentHash, onSubmit, isSubmitting }: MintFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(CONTENT_CATEGORIES[0])
  const [tags, setTags] = useState<string>('')
  const [price, setPrice] = useState('')
  const [royaltyPercentage, setRoyaltyPercentage] = useState<number>(ROYALTY_LIMITS.DEFAULT)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = '请输入标题'
    } else if (title.length > 100) {
      newErrors.title = '标题不能超过100个字符'
    }

    if (!description.trim()) {
      newErrors.description = '请输入描述'
    } else if (description.length > 1000) {
      newErrors.description = '描述不能超过1000个字符'
    }

    if (!price || parseFloat(price) <= 0) {
      newErrors.price = '请输入有效的价格'
    }

    if (royaltyPercentage < ROYALTY_LIMITS.MIN || royaltyPercentage > ROYALTY_LIMITS.MAX) {
      newErrors.royalty = `版税比例必须在 ${ROYALTY_LIMITS.MIN}% 到 ${ROYALTY_LIMITS.MAX}% 之间`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Parse tags
    const tagArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    // Create royalty info (creator gets 100% of royalties)
    const royaltyInfo: RoyaltyInfo = {
      recipients: [window.ethereum?.selectedAddress || ''],
      percentages: [royaltyPercentage * 100], // Convert to basis points
    }

    onSubmit({
      contentHash,
      title,
      description,
      category,
      tags: tagArray,
      price,
      royalty: royaltyInfo,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          标题 *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="为您的作品起一个吸引人的标题"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          描述 *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="详细描述您的作品内容、特点和价值"
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          分类 *
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          {CONTENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'music' && '音乐'}
              {cat === 'video' && '视频'}
              {cat === 'ebook' && '电子书'}
              {cat === 'course' && '课程'}
              {cat === 'software' && '软件'}
              {cat === 'artwork' && '艺术品'}
              {cat === 'research' && '研究论文'}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
          标签
        </label>
        <input
          type="text"
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="用逗号分隔多个标签，例如：原创,流行,钢琴"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500">
          添加标签可以帮助用户更容易发现您的作品
        </p>
      </div>

      {/* Price */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
          价格 (ETH) *
        </label>
        <input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          step="0.001"
          min="0"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.price ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="0.1"
          disabled={isSubmitting}
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600">{errors.price}</p>
        )}
      </div>

      {/* Royalty */}
      <div>
        <label htmlFor="royalty" className="block text-sm font-medium text-gray-700 mb-2">
          版税比例 (%) *
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            id="royalty"
            value={royaltyPercentage}
            onChange={(e) => setRoyaltyPercentage(Number(e.target.value))}
            min={ROYALTY_LIMITS.MIN}
            max={ROYALTY_LIMITS.MAX}
            step="1"
            className="flex-1"
            disabled={isSubmitting}
          />
          <span className="text-lg font-semibold text-gray-900 w-16 text-right">
            {royaltyPercentage}%
          </span>
        </div>
        {errors.royalty && (
          <p className="mt-1 text-sm text-red-600">{errors.royalty}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          每次二次销售时，您将自动获得该比例的收益
        </p>
      </div>

      {/* Content Hash Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-1">内容哈希</p>
        <p className="text-xs text-gray-600 font-mono break-all">{contentHash}</p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '铸造中...' : '铸造 NFT'}
      </button>
    </form>
  )
}
