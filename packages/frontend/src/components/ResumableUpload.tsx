import React, { useState, useRef } from 'react';
import { useResumableUpload } from '../hooks/useResumableUpload';

interface ResumableUploadProps {
  userId: string;
  onUploadComplete?: (uploadId: string) => void;
  onUploadError?: (error: string) => void;
}

export const ResumableUpload: React.FC<ResumableUploadProps> = ({
  userId,
  onUploadComplete,
  onUploadError,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    category: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, pause, resume, cancel, progress, isUploading, isPaused } = useResumableUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title from filename
      if (!metadata.title) {
        setMetadata((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        }));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    if (!metadata.title) {
      alert('Please enter a title');
      return;
    }

    upload(selectedFile, {
      userId,
      ...metadata,
    });
  };

  const handlePause = () => {
    pause();
  };

  const handleResume = () => {
    resume();
  };

  const handleCancel = () => {
    cancel();
    setSelectedFile(null);
    setMetadata({ title: '', description: '', category: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle upload completion
  React.useEffect(() => {
    if (progress.status === 'completed' && progress.uploadId) {
      onUploadComplete?.(progress.uploadId);
    } else if (progress.status === 'error' && progress.error) {
      onUploadError?.(progress.error);
    }
  }, [progress.status, progress.uploadId, progress.error, onUploadComplete, onUploadError]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Upload Content</h2>

      {/* File Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File
        </label>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          accept=".pdf,.docx,.mp4,.mp3,.wav,.epub,.zip,.jpg,.jpeg,.png,.gif"
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
          </p>
        )}
      </div>

      {/* Metadata Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Enter content title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={metadata.description}
            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
            disabled={isUploading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Enter content description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={metadata.category}
            onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
      </div>

      {/* Upload Progress */}
      {(isUploading || isPaused || progress.status === 'completed') && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {progress.status === 'completed' ? 'Upload Complete' : 'Uploading...'}
            </span>
            <span className="text-sm text-gray-600">
              {progress.percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                progress.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>
              {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.bytesTotal)}
            </span>
            {isPaused && (
              <span className="text-yellow-600 font-medium">Paused</span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {progress.status === 'error' && progress.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {progress.error}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {progress.status === 'idle' && (
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !metadata.title}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Start Upload
          </button>
        )}

        {isUploading && (
          <button
            onClick={handlePause}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-medium"
          >
            Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={handleResume}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Resume
          </button>
        )}

        {(isUploading || isPaused) && (
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
          >
            Cancel
          </button>
        )}

        {progress.status === 'completed' && (
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
          >
            Upload Another
          </button>
        )}
      </div>

      {/* File Type Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Supported formats:</strong> PDF, DOCX, MP4, MP3, WAV, EPUB, ZIP, JPG, PNG, GIF
        </p>
        <p className="text-sm text-blue-800 mt-1">
          <strong>Maximum file size:</strong> 2GB
        </p>
        <p className="text-sm text-blue-800 mt-1">
          <strong>Features:</strong> Resumable uploads, pause/resume anytime, automatic retry on network errors
        </p>
      </div>
    </div>
  );
};
