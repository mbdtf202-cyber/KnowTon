import { useState, useCallback } from 'react'
import { contentAPI } from '../services/api'

export interface UploadState {
  isUploading: boolean
  progress: number
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error'
  error: string | null
  contentHash: string | null
}

export function useContentUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    status: 'idle',
    error: null,
    contentHash: null,
  })

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    setUploadState({
      isUploading: true,
      progress: 0,
      status: 'uploading',
      error: null,
      contentHash: null,
    })

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval)
            return { ...prev, progress: 90, status: 'processing' }
          }
          return { ...prev, progress: prev.progress + 10 }
        })
      }, 200)

      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      const result = await contentAPI.upload(formData)
      
      clearInterval(progressInterval)

      const contentHash = result.data?.contentHash || result.data?.hash || 'uploaded'

      setUploadState({
        isUploading: false,
        progress: 100,
        status: 'complete',
        error: null,
        contentHash,
      })

      return contentHash
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : '上传失败',
        contentHash: null,
      })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      status: 'idle',
      error: null,
      contentHash: null,
    })
  }, [])

  return {
    uploadState,
    uploadFile,
    reset,
  }
}
