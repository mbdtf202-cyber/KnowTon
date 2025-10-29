import { useNavigate } from 'react-router-dom'
import { useCreatorRegistration } from '../hooks/useCreatorRegistration'
import { CreatorRegistrationForm } from '../components/CreatorRegistrationForm'

export default function RegisterPage() {
  const navigate = useNavigate()
  const {
    formData,
    setFormData,
    errors,
    avatarPreview,
    isSubmitting,
    registrationProgress,
    handleSubmit,
    handleAvatarChange,
    isConnected,
    address,
  } = useCreatorRegistration()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSubmit()
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">创作者注册</h1>
        <p className="text-gray-600 mb-8">请先连接钱包以继续注册</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-2">创作者注册</h1>
      <p className="text-gray-600 mb-8">
        完善您的创作者资料，开始在 KnowTon 平台上发布作品
      </p>

      {/* General Error */}
      {errors.username && !formData.username && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
          {errors.username}
        </div>
      )}

      <CreatorRegistrationForm
        formData={formData}
        errors={errors}
        avatarPreview={avatarPreview}
        isSubmitting={isSubmitting}
        onFormDataChange={setFormData}
        onAvatarChange={handleAvatarChange}
        onSubmit={onSubmit}
        onCancel={() => navigate('/')}
        walletAddress={address}
      />

      {/* Progress Bar */}
      {isSubmitting && registrationProgress.progress > 0 && (
        <div className="space-y-2 mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${registrationProgress.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 text-center">
            {registrationProgress.message}
          </p>
        </div>
      )}
    </div>
  )
}
