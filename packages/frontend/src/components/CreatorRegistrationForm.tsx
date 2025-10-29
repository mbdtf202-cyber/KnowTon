import { FILE_SIZE_LIMITS } from '../utils/constants'
import { isValidEmail, isValidURL, isValidFileSize, isValidFileType } from '../utils/validation'

export interface CreatorFormData {
  username: string
  bio: string
  email: string
  avatar: File | null
  socialLinks: {
    twitter: string
    discord: string
    website: string
  }
}

export interface CreatorFormErrors {
  username?: string
  bio?: string
  email?: string
  avatar?: string
  twitter?: string
  discord?: string
  website?: string
}

interface CreatorRegistrationFormProps {
  formData: CreatorFormData
  errors: CreatorFormErrors
  avatarPreview: string
  isSubmitting: boolean
  onFormDataChange: (data: CreatorFormData) => void
  onAvatarChange: (file: File | null, preview: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  walletAddress?: string
}

export function CreatorRegistrationForm({
  formData,
  errors,
  avatarPreview,
  isSubmitting,
  onFormDataChange,
  onAvatarChange,
  onSubmit,
  onCancel,
  walletAddress,
}: CreatorRegistrationFormProps) {
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        onAvatarChange(file, reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Avatar Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          头像
        </label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 text-3xl">👤</span>
            )}
          </div>
          <div>
            <input
              type="file"
              id="avatar"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={isSubmitting}
            />
            <label
              htmlFor="avatar"
              className={`px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              选择图片
            </label>
            <p className="text-sm text-gray-500 mt-1">
              支持 JPG、PNG、GIF，最大 10MB
            </p>
          </div>
        </div>
        {errors.avatar && (
          <p className="text-red-600 text-sm mt-1">{errors.avatar}</p>
        )}
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
          用户名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="username"
          value={formData.username}
          onChange={(e) => onFormDataChange({ ...formData, username: e.target.value })}
          disabled={isSubmitting}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
            errors.username ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="your_username"
        />
        {errors.username && (
          <p className="text-red-600 text-sm mt-1">{errors.username}</p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
          个人简介 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => onFormDataChange({ ...formData, bio: e.target.value })}
          disabled={isSubmitting}
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
            errors.bio ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="介绍一下您自己和您的创作领域..."
        />
        <div className="flex justify-between items-center mt-1">
          {errors.bio ? (
            <p className="text-red-600 text-sm">{errors.bio}</p>
          ) : (
            <p className="text-gray-500 text-sm">至少 10 个字符</p>
          )}
          <p className="text-gray-500 text-sm">{formData.bio.length}/500</p>
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          邮箱（可选）
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
          disabled={isSubmitting}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">社交媒体（可选）</h3>
        
        {/* Twitter */}
        <div>
          <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-2">
            Twitter / X
          </label>
          <input
            type="url"
            id="twitter"
            value={formData.socialLinks.twitter}
            onChange={(e) => onFormDataChange({
              ...formData,
              socialLinks: { ...formData.socialLinks, twitter: e.target.value }
            })}
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
              errors.twitter ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://twitter.com/yourhandle"
          />
          {errors.twitter && (
            <p className="text-red-600 text-sm mt-1">{errors.twitter}</p>
          )}
        </div>

        {/* Discord */}
        <div>
          <label htmlFor="discord" className="block text-sm font-medium text-gray-700 mb-2">
            Discord
          </label>
          <input
            type="url"
            id="discord"
            value={formData.socialLinks.discord}
            onChange={(e) => onFormDataChange({
              ...formData,
              socialLinks: { ...formData.socialLinks, discord: e.target.value }
            })}
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
              errors.discord ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://discord.gg/yourserver"
          />
          {errors.discord && (
            <p className="text-red-600 text-sm mt-1">{errors.discord}</p>
          )}
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
            个人网站
          </label>
          <input
            type="url"
            id="website"
            value={formData.socialLinks.website}
            onChange={(e) => onFormDataChange({
              ...formData,
              socialLinks: { ...formData.socialLinks, website: e.target.value }
            })}
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
              errors.website ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://yourwebsite.com"
          />
          {errors.website && (
            <p className="text-red-600 text-sm mt-1">{errors.website}</p>
          )}
        </div>
      </div>

      {/* Connected Wallet Info */}
      {walletAddress && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">连接的钱包:</span>{' '}
            <span className="font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            注册后将为您创建去中心化身份（DID）
          </p>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '注册中...' : '完成注册'}
        </button>
      </div>
    </form>
  )
}

// Validation helper
export function validateCreatorForm(formData: CreatorFormData): CreatorFormErrors {
  const errors: CreatorFormErrors = {}

  // Username validation
  if (!formData.username.trim()) {
    errors.username = '用户名不能为空'
  } else if (formData.username.length < 3) {
    errors.username = '用户名至少需要 3 个字符'
  } else if (formData.username.length > 30) {
    errors.username = '用户名不能超过 30 个字符'
  } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
    errors.username = '用户名只能包含字母、数字、下划线和连字符'
  }

  // Bio validation
  if (!formData.bio.trim()) {
    errors.bio = '个人简介不能为空'
  } else if (formData.bio.length < 10) {
    errors.bio = '个人简介至少需要 10 个字符'
  } else if (formData.bio.length > 500) {
    errors.bio = '个人简介不能超过 500 个字符'
  }

  // Email validation
  if (formData.email && !isValidEmail(formData.email)) {
    errors.email = '请输入有效的邮箱地址'
  }

  // Avatar validation
  if (formData.avatar) {
    if (!isValidFileType(formData.avatar, ['image/*'])) {
      errors.avatar = '只支持图片格式'
    } else if (!isValidFileSize(formData.avatar, FILE_SIZE_LIMITS.IMAGE)) {
      errors.avatar = `图片大小不能超过 ${FILE_SIZE_LIMITS.IMAGE / 1024 / 1024}MB`
    }
  }

  // Social links validation
  if (formData.socialLinks.twitter && !formData.socialLinks.twitter.includes('twitter.com') && !formData.socialLinks.twitter.includes('x.com')) {
    errors.twitter = '请输入有效的 Twitter/X 链接'
  }

  if (formData.socialLinks.discord && !formData.socialLinks.discord.includes('discord')) {
    errors.discord = '请输入有效的 Discord 链接'
  }

  if (formData.socialLinks.website && !isValidURL(formData.socialLinks.website)) {
    errors.website = '请输入有效的网站链接'
  }

  return errors
}
