import React, { useState, useEffect } from 'react';

interface PDFPreviewProps {
  uploadId: string;
  onPurchase?: () => void;
}

interface PreviewData {
  previewUrl: string;
  totalPages: number;
  previewPages: number;
  fileSize: number;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ uploadId, onPurchase }) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    generatePreview();
  }, [uploadId]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/v1/preview/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          uploadId,
          previewPercentage: 10,
          watermarkOpacity: 0.3,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setPreviewData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      console.error('Preview generation error:', err);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleRetry = () => {
    generatePreview();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="pdf-preview-container">
        <div className="preview-loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">
            {generating ? 'Generating preview...' : 'Loading preview...'}
          </p>
          <p className="loading-subtext">This may take a few seconds</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-preview-container">
        <div className="preview-error">
          <svg className="error-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Preview Not Available</h3>
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            Try Again
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (!previewData) {
    return null;
  }

  return (
    <div className="pdf-preview-container">
      {/* Preview Notice Banner */}
      <div className="preview-notice">
        <div className="notice-content">
          <svg className="notice-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <div className="notice-text">
            <strong>Preview Mode</strong>
            <span className="notice-details">
              Showing {previewData.previewPages} of {previewData.totalPages} pages
              ({Math.round((previewData.previewPages / previewData.totalPages) * 100)}%)
            </span>
          </div>
        </div>
        {onPurchase && (
          <button onClick={onPurchase} className="purchase-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Purchase Full Document
          </button>
        )}
      </div>

      {/* Preview Info */}
      <div className="preview-info">
        <div className="info-item">
          <span className="info-label">Total Pages:</span>
          <span className="info-value">{previewData.totalPages}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Preview Size:</span>
          <span className="info-value">{formatFileSize(previewData.fileSize)}</span>
        </div>
        <div className="info-item watermark-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Watermarked for protection</span>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="preview-viewer">
        <iframe
          src={previewData.previewUrl}
          className="pdf-iframe"
          title="PDF Preview"
          sandbox="allow-same-origin"
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Download Prevention Notice */}
      <div className="preview-footer">
        <div className="footer-notice">
          <svg className="footer-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <p>
            This is a preview only. Downloading, copying, or distributing this preview is prohibited.
            Purchase the full document to access all content.
          </p>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
};

const styles = `
        .pdf-preview-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .preview-loading,
        .preview-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #f3f4f6;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .loading-subtext {
          font-size: 14px;
          color: #6b7280;
        }

        .error-icon {
          color: #ef4444;
          margin-bottom: 16px;
        }

        .preview-error h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .preview-error p {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .retry-button {
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .retry-button:hover {
          background: #2563eb;
        }

        .preview-notice {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          gap: 16px;
        }

        .notice-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .notice-icon {
          flex-shrink: 0;
        }

        .notice-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .notice-text strong {
          font-size: 16px;
          font-weight: 600;
        }

        .notice-details {
          font-size: 13px;
          opacity: 0.9;
        }

        .purchase-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .purchase-button:hover {
          background: #f9fafb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .preview-info {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 24px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .info-label {
          color: #6b7280;
          font-weight: 500;
        }

        .info-value {
          color: #1f2937;
          font-weight: 600;
        }

        .watermark-notice {
          margin-left: auto;
          color: #9ca3af;
          font-size: 13px;
        }

        .preview-viewer {
          position: relative;
          width: 100%;
          height: 600px;
          background: #f3f4f6;
        }

        .pdf-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .preview-footer {
          padding: 16px 24px;
          background: #fef3c7;
          border-top: 1px solid #fde68a;
        }

        .footer-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .footer-icon {
          flex-shrink: 0;
          color: #d97706;
          margin-top: 2px;
        }

        .footer-notice p {
          font-size: 13px;
          color: #92400e;
          line-height: 1.5;
          margin: 0;
        }

        @media (max-width: 768px) {
          .preview-notice {
            flex-direction: column;
            align-items: flex-start;
          }

          .purchase-button {
            width: 100%;
            justify-content: center;
          }

          .preview-info {
            flex-wrap: wrap;
            gap: 12px;
          }

          .watermark-notice {
            margin-left: 0;
            width: 100%;
          }

          .preview-viewer {
            height: 500px;
          }
        }
`;

export default PDFPreview;
