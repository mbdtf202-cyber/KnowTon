import React, { useState } from 'react';
import { AlertTriangle, FileWarning, X, Info } from 'lucide-react';

interface SimilarContent {
  content_id: string;
  similarity_score: number;
  content_type?: string;
  metadata?: {
    title?: string;
    creator?: string;
  };
}

interface PlagiarismWarningProps {
  uploadId: string;
  isPlagiarism: boolean;
  maxSimilarity: number;
  action: 'warning' | 'rejected' | 'approved';
  message: string;
  similarContent: SimilarContent[];
  onAppeal?: () => void;
  onDismiss?: () => void;
}

export const PlagiarismWarning: React.FC<PlagiarismWarningProps> = ({
  uploadId,
  isPlagiarism,
  maxSimilarity,
  action,
  message,
  similarContent,
  onAppeal,
  onDismiss,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (action === 'approved') {
    return null; // Don't show anything for approved content
  }

  const isRejected = action === 'rejected';
  const bgColor = isRejected ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = isRejected ? 'border-red-200' : 'border-yellow-200';
  const textColor = isRejected ? 'text-red-800' : 'text-yellow-800';
  const iconColor = isRejected ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconColor}`}>
          {isRejected ? (
            <FileWarning className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${textColor}`}>
            {isRejected ? 'Upload Rejected' : 'Similarity Warning'}
          </h3>
          <div className={`mt-2 text-sm ${textColor}`}>
            <p>{message}</p>
            <p className="mt-1">
              Maximum similarity detected: <strong>{(maxSimilarity * 100).toFixed(1)}%</strong>
            </p>
          </div>

          {similarContent.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-sm font-medium ${textColor} hover:underline flex items-center`}
              >
                <Info className="h-4 w-4 mr-1" />
                {showDetails ? 'Hide' : 'Show'} similar content ({similarContent.length})
              </button>

              {showDetails && (
                <div className="mt-2 space-y-2">
                  {similarContent.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white rounded p-3 border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.metadata?.title || `Content ${item.content_id.substring(0, 8)}`}
                          </p>
                          {item.metadata?.creator && (
                            <p className="text-xs text-gray-500 mt-1">
                              Creator: {item.metadata.creator}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Type: {item.content_type || 'Unknown'}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {(item.similarity_score * 100).toFixed(1)}% similar
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isRejected && onAppeal && (
            <div className="mt-4 flex space-x-3">
              <button
                onClick={onAppeal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Submit Appeal
              </button>
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Dismiss
              </button>
            </div>
          )}

          {!isRejected && (
            <div className="mt-4">
              <p className={`text-xs ${textColor}`}>
                <strong>Note:</strong> You can proceed with the upload, but please ensure you have
                the proper rights to this content. If you believe this is a false positive, you can
                contact support.
              </p>
            </div>
          )}
        </div>
        {onDismiss && !isRejected && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 ${textColor} hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500`}
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
