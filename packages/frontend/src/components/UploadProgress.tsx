interface UploadProgressProps {
  progress: number
  fileName: string
  fileSize: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  onCancel?: () => void
}

export default function UploadProgress({
  progress,
  fileName,
  fileSize,
  status,
  error,
  onCancel,
}: UploadProgressProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return '上传中...'
      case 'processing':
        return '处理中...'
      case 'complete':
        return '上传完成'
      case 'error':
        return '上传失败'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'bg-blue-600'
      case 'complete':
        return 'bg-green-600'
      case 'error':
        return 'bg-red-600'
    }
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {fileName}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(fileSize)} • {getStatusText()}
          </p>
        </div>
        
        {status === 'uploading' && onCancel && (
          <button
            onClick={onCancel}
            className="ml-4 text-gray-400 hover:text-gray-600"
            aria-label="取消上传"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {status === 'complete' && (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        
        {status === 'error' && (
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress percentage */}
      {status !== 'error' && (
        <p className="text-xs text-gray-500 mt-1 text-right">
          {progress}%
        </p>
      )}

      {/* Error message */}
      {status === 'error' && error && (
        <p className="text-xs text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  )
}
