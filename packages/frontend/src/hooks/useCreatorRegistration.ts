import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useSignMessage } from 'wagmi'
import { useAppStore } from '../store/useAppStore'
import { creatorAPI, contentAPI } from '../services/api'
import type { CreatorFormData, CreatorFormErrors } from '../components/CreatorRegistrationForm'
import { validateCreatorForm } from '../components/CreatorRegistrationForm'

interface RegistrationProgress {
  step: 'idle' | 'signing' | 'uploading' | 'creating_did' | 'registering' | 'complete'
  progress: number
  message: string
}

export function useCreatorRegistration() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { setUser } = useAppStore()

  const [formData, setFormData] = useState<CreatorFormData>({
    username: '',
    bio: '',
    email: '',
    avatar: null,
    socialLinks: {
      twitter: '',
      discord: '',
      website: '',
    },
  })

  const [errors, setErrors] = useState<CreatorFormErrors>({})
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationProgress, setRegistrationProgress] = useState<RegistrationProgress>({
    step: 'idle',
    progress: 0,
    message: '',
  })

  // Upload avatar to IPFS
  const uploadAvatarToIPFS = async (file: File): Promise<string> => {
    const result = await contentAPI.uploadToIPFS(file)
    return result.contentHash
  }

  // Create DID using Ceramic Network
  const createDID = async (walletAddress: string, signature: string): Promise<string> => {
    const result = await creatorAPI.createDID({
      address: walletAddress,
      signature,
    })
    return result.did
  }

  // Register creator
  const registerCreator = async (avatarHash: string, did: string, signature: string) => {
    if (!address) throw new Error('No wallet address')
    
    return await creatorAPI.register({
      address,
      did,
      username: formData.username,
      bio: formData.bio,
      email: formData.email || undefined,
      avatar: avatarHash,
      socialLinks: {
        twitter: formData.socialLinks.twitter || undefined,
        discord: formData.socialLinks.discord || undefined,
        website: formData.socialLinks.website || undefined,
      },
      signature,
    })
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setErrors({ username: '请先连接钱包' })
      return false
    }

    // Validate form
    const validationErrors = validateCreatorForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return false
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // Step 1: Sign message for authentication
      setRegistrationProgress({
        step: 'signing',
        progress: 20,
        message: '正在验证签名...',
      })

      const message = `Register as creator on KnowTon\n\nAddress: ${address}\nUsername: ${formData.username}\nTimestamp: ${new Date().toISOString()}`
      const signature = await signMessageAsync({ message })

      // Step 2: Upload avatar to IPFS if provided
      let avatarHash = ''
      if (formData.avatar) {
        setRegistrationProgress({
          step: 'uploading',
          progress: 40,
          message: '正在上传头像...',
        })
        avatarHash = await uploadAvatarToIPFS(formData.avatar)
      } else {
        setRegistrationProgress({
          step: 'uploading',
          progress: 40,
          message: '跳过头像上传...',
        })
      }

      // Step 3: Create DID
      setRegistrationProgress({
        step: 'creating_did',
        progress: 60,
        message: '正在创建 DID...',
      })
      const did = await createDID(address, signature)

      // Step 4: Register creator
      setRegistrationProgress({
        step: 'registering',
        progress: 80,
        message: '正在注册创作者...',
      })
      await registerCreator(avatarHash, did, signature)

      // Step 5: Update local state
      setRegistrationProgress({
        step: 'complete',
        progress: 100,
        message: '注册完成！',
      })

      setUser({
        address,
        did,
        username: formData.username,
        avatar: avatarHash,
      })

      // Navigate to profile after a short delay
      setTimeout(() => {
        navigate('/profile')
      }, 500)

      return true
    } catch (error: any) {
      console.error('Registration error:', error)
      setErrors({
        username: error.message || '注册失败，请重试',
      })
      setRegistrationProgress({
        step: 'idle',
        progress: 0,
        message: '',
      })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAvatarChange = (file: File | null, preview: string) => {
    setFormData({ ...formData, avatar: file })
    setAvatarPreview(preview)
  }

  const resetForm = () => {
    setFormData({
      username: '',
      bio: '',
      email: '',
      avatar: null,
      socialLinks: {
        twitter: '',
        discord: '',
        website: '',
      },
    })
    setErrors({})
    setAvatarPreview('')
    setRegistrationProgress({
      step: 'idle',
      progress: 0,
      message: '',
    })
  }

  return {
    formData,
    setFormData,
    errors,
    avatarPreview,
    isSubmitting,
    registrationProgress,
    handleSubmit,
    handleAvatarChange,
    resetForm,
    isConnected,
    address,
  }
}
