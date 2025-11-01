import React, { useRef } from 'react';
import { useBatchUpload } from '../hooks/useBatchUpload';
import type { BatchFileItem } from '../hooks/useBatchUpload';

interface BatchUploadProps {
  userId: string;
  onUploadComplete?: (uploadIds: string[]) => void;
  onUploadError?: (errors: Array<{ filename: string; error: string }>) => void;
}

export const BatchUpload: React.FC<BatchUploadProps> = ({
  userId,
  onUploadComplete,
  onUploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    files,
    addFiles,
    removeFile,
    updateFileMetadata,
    startUpload,
    pauseFile,
    resumeFile,
    retryFile,
    cancelFile,
    clearCompleted,
    clearAll,
    progress,
    isUploading,
  } = useBatchUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleStartUpload = () => {
    // Validate that all files have titles
    const filesWithoutTitle = files.filter((f) => !f.metadata.title && f.status === 'pending');
    if (filesWithoutTitle.length > 0) {
      alert('Please provide titles for all files before uploading');
      return;
    }

    startUpload(userId);
  };

  // Notify parent of completion
  React.useEffect(() => {
    const completedFiles = files.filter((f) => f.status === 'completed');
    const failedFiles = files.filter((f) => f.status === 'error');

    if (completedFiles.length > 0 && completedFiles.length + failedFiles.length === files.length && files.length > 0) {
      const uploadIds = completedFiles.map((f) => f.uploadId).filter((id): id is string => id !== null);
      onUploadComplete?.(uploadIds);

      if (failedFiles.length > 0) {
        const errors = failedFiles.map((f) => ({
          filename: f.file.name,
          error: f.error || 'Unknown error',
        }));
        onUploadError?.(errors);
      }
    }
  }, [files, onUploadComplete, onUploadError]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: BatchFileItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'uploading':
        return 'text-blue-600 bg-blue-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: BatchFileItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'uploading':
        return 'Uploading';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Batch Upload</h2>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept=".pdf,.docx,.mp4,.mp3,.wav,.epub,.zip,.jpg,.jpeg,.png,.gif"
          className="hidden"
        />
        <div className="text-gray-600">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-lg font-medium mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Maximum 50 files, 2GB per file
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supported: PDF, DOCX, MP4, MP3, WAV, EPUB, ZIP, JPG, PNG, GIF
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      {files.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress: {progress.completedFiles} / {progress.totalFiles} files
            </span>
            <span className="text-sm text-gray-600">{progress.overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>
              {formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}
            </span>
            {progress.failedFiles > 0 && (
              <span className="text-red-600 font-medium">
                {progress.failedFiles} failed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleStartUpload}
            disabled={isUploading || files.every((f) => f.status !== 'pending')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Start Upload ({files.filter((f) => f.status === 'pending').length} pending)
          </button>
          <button
            onClick={clearCompleted}
            disabled={!files.some((f) => f.status === 'completed' || f.status === 'cancelled')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Clear Completed
          </button>
          <button
            onClick={clearAll}
            disabled={isUploading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Clear All
          </button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold mb-3">Files ({files.length})</h3>
          {files.map((file) => (
            <div
              key={file.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-4">
                      <input
                        type="text"
                        value={file.metadata.title || ''}
                        onChange={(e) =>
                          updateFileMetadata(file.id, { title: e.target.value })
                        }
                        disabled={file.status !== 'pending'}
                        placeholder="Enter title *"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {file.file.name} ({formatBytes(file.bytesTotal)})
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                        file.status
                      )}`}
                    >
                      {getStatusText(file.status)}
                    </span>
                  </div>

                  {/* Metadata Fields */}
                  {file.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={file.metadata.description || ''}
                        onChange={(e) =>
                          updateFileMetadata(file.id, { description: e.target.value })
                        }
                        placeholder="Description (optional)"
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={file.metadata.category || ''}
                        onChange={(e) =>
                          updateFileMetadata(file.id, { category: e.target.value })
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select category</option>
                        <option value="education">Education</option>
                        <option value="music">Music</option>
                        <option value="video">Video</option>
                        <option value="document">Document</option>
                        <option value="art">Art</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {(file.status === 'uploading' || file.status === 'paused') && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{file.progress}%</span>
                        <span>
                          {formatBytes(file.bytesUploaded)} / {formatBytes(file.bytesTotal)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            file.status === 'paused' ? 'bg-yellow-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-600 mb-2">{file.error}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {file.status === 'uploading' && (
                      <button
                        onClick={() => pauseFile(file.id)}
                        className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      >
                        Pause
                      </button>
                    )}
                    {file.status === 'paused' && (
                      <button
                        onClick={() => resumeFile(file.id, userId)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Resume
                      </button>
                    )}
                    {file.status === 'error' && (
                      <button
                        onClick={() => retryFile(file.id, userId)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Retry
                      </button>
                    )}
                    {(file.status === 'uploading' || file.status === 'paused') && (
                      <button
                        onClick={() => cancelFile(file.id)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Cancel
                      </button>
                    )}
                    {(file.status === 'pending' ||
                      file.status === 'error' ||
                      file.status === 'cancelled') && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No files selected. Drop files or click the area above to add files.</p>
        </div>
      )}
    </div>
  );
};
