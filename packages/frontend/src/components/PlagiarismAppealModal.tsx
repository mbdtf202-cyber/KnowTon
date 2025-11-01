import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface PlagiarismAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectionId: string;
  uploadId: string;
  filename: string;
  onSubmitSuccess?: () => void;
}

export const PlagiarismAppealModal: React.FC<PlagiarismAppealModalProps> = ({
  isOpen,
  onClose,
  detectionId,
  uploadId,
  filename,
  onSubmitSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.length < 50) {
      setError('Reason must be at least 50 characters');
      return;
    }

    if (reason.length > 2000) {
      setError('Reason must not exceed 2000 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const evidence: any = {};
      
      if (evidenceUrls.trim()) {
        evidence.urls = evidenceUrls
          .split('\n')
          .map((url) => url.trim())
          .filter((url) => url.length > 0);
      }

      if (evidenceDescription.trim()) {
        evidence.description = evidenceDescription.trim();
      }

      const response = await fetch('/api/v1/plagiarism/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          detectionId,
          reason: reason.trim(),
          evidence: Object.keys(evidence).length > 0 ? evidence : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit appeal');
      }

      setSuccess(true);
      
      // Wait a moment to show success message
      setTimeout(() => {
        onSubmitSuccess?.();
        onClose();
        // Reset form
        setReason('');
        setEvidenceUrls('');
        setEvidenceDescription('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit appeal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Submit Plagiarism Appeal
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Appeal Submitted Successfully
              </h3>
              <p className="text-gray-600">
                Our team will review your appeal within 48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* File Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>File:</strong> {filename}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Upload ID:</strong> {uploadId}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Reason */}
              <div className="mb-4">
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Reason for Appeal <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please explain why you believe this detection is incorrect. Include details about your original work, creation process, or any other relevant information."
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {reason.length} / 2000 characters (minimum 50)
                </p>
              </div>

              {/* Evidence URLs */}
              <div className="mb-4">
                <label
                  htmlFor="evidenceUrls"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Evidence URLs (Optional)
                </label>
                <textarea
                  id="evidenceUrls"
                  value={evidenceUrls}
                  onChange={(e) => setEvidenceUrls(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter URLs to supporting evidence (one per line)&#10;Example: https://example.com/my-original-work"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Provide links to your original work, portfolio, or other evidence
                </p>
              </div>

              {/* Evidence Description */}
              <div className="mb-6">
                <label
                  htmlFor="evidenceDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Additional Evidence Description (Optional)
                </label>
                <textarea
                  id="evidenceDescription"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe any additional evidence or context that supports your appeal"
                />
              </div>

              {/* Info Box */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Appeals are reviewed by our team within 48 hours.
                  Providing detailed information and evidence will help expedite the review
                  process.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || reason.length < 50}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
