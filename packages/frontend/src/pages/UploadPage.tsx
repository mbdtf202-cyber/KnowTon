import React, { useState } from 'react';
import { ResumableUpload } from '../components/ResumableUpload';
import { BatchUpload } from '../components/BatchUpload';
import { useAccount } from 'wagmi';

type UploadMode = 'single' | 'batch';

export const UploadPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');

  const handleUploadComplete = (uploadId: string) => {
    console.log('Upload completed:', uploadId);
    setUploadedId(uploadId);
    
    // Show success message
    alert(`Upload completed successfully! Upload ID: ${uploadId}`);
    
    // Optionally redirect to content management page
    // navigate(`/content/${uploadId}`);
  };

  const handleBatchUploadComplete = (uploadIds: string[]) => {
    console.log('Batch upload completed:', uploadIds);
    
    // Show success message
    alert(`Batch upload completed! ${uploadIds.length} files uploaded successfully.`);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    alert(`Upload failed: ${error}`);
  };

  const handleBatchUploadError = (errors: Array<{ filename: string; error: string }>) => {
    console.error('Batch upload errors:', errors);
    
    const errorMessage = errors
      .map((e) => `${e.filename}: ${e.error}`)
      .join('\n');
    
    alert(`Some uploads failed:\n${errorMessage}`);
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please connect your wallet to upload content.</p>
        </div>
      </div>
    );
  }

  const userId = address;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Upload Your Content
          </h1>
          <p className="text-lg text-gray-600">
            Share your creative work with the world using our resumable upload system
          </p>
        </div>

        {/* Upload Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setUploadMode('single')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                uploadMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Single Upload
            </button>
            <button
              onClick={() => setUploadMode('batch')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                uploadMode === 'batch'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Batch Upload
            </button>
          </div>
        </div>

        {/* Upload Component */}
        {uploadMode === 'single' ? (
          <ResumableUpload
            userId={userId}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        ) : (
          <BatchUpload
            userId={userId}
            onUploadComplete={handleBatchUploadComplete}
            onUploadError={handleBatchUploadError}
          />
        )}

        {/* Upload History Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Recent Uploads</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-center">
              Your upload history will appear here
            </p>
            {uploadedId && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  Latest upload ID: <code className="font-mono">{uploadedId}</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-blue-600 text-3xl mb-3">⏸️</div>
            <h3 className="text-lg font-semibold mb-2">Pause & Resume</h3>
            <p className="text-gray-600 text-sm">
              Pause your upload anytime and resume later without losing progress
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-blue-600 text-3xl mb-3">🔄</div>
            <h3 className="text-lg font-semibold mb-2">Auto Retry</h3>
            <p className="text-gray-600 text-sm">
              Automatic retry on network errors ensures your upload completes successfully
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-blue-600 text-3xl mb-3">📦</div>
            <h3 className="text-lg font-semibold mb-2">Large Files</h3>
            <p className="text-gray-600 text-sm">
              Upload files up to 2GB with chunked transfer for reliability
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-blue-600 text-3xl mb-3">📚</div>
            <h3 className="text-lg font-semibold mb-2">Batch Upload</h3>
            <p className="text-gray-600 text-sm">
              Upload up to 50 files simultaneously with parallel processing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
