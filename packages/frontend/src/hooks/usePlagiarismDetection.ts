import { useState, useEffect } from 'react';

interface SimilarContent {
  content_id: string;
  similarity_score: number;
  content_type?: string;
  metadata?: Record<string, any>;
}

interface PlagiarismDetectionResult {
  id: string;
  uploadId: string;
  isPlagiarism: boolean;
  maxSimilarity: number;
  threshold: number;
  totalMatches: number;
  similarContent: SimilarContent[];
  action: 'warning' | 'rejected' | 'approved';
  message: string;
}

interface Appeal {
  id: string;
  detectionId: string;
  uploadId: string;
  filename: string;
  status: string;
  reason: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export const usePlagiarismDetection = (uploadId?: string) => {
  const [detection, setDetection] = useState<PlagiarismDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetection = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/plagiarism/detection/${id}`, {
        credentials: 'include',
      });

      if (response.status === 404) {
        // No detection found - this is okay
        setDetection(null);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch detection results');
      }

      const data = await response.json();
      setDetection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch detection results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uploadId) {
      fetchDetection(uploadId);
    }
  }, [uploadId]);

  const refetch = () => {
    if (uploadId) {
      fetchDetection(uploadId);
    }
  };

  return {
    detection,
    loading,
    error,
    refetch,
  };
};

export const useAppealSubmission = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAppeal = async (
    detectionId: string,
    reason: string,
    evidence?: {
      urls?: string[];
      documents?: string[];
      description?: string;
    }
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/plagiarism/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          detectionId,
          reason,
          evidence,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit appeal');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit appeal';
      setError(errorMessage);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitAppeal,
    submitting,
    error,
  };
};

export const useUserAppeals = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppeals = async (limit: number = 50) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/plagiarism/appeals?limit=${limit}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch appeals');
      }

      const data = await response.json();
      setAppeals(data.appeals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appeals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const refetch = () => {
    fetchAppeals();
  };

  return {
    appeals,
    loading,
    error,
    refetch,
  };
};

export const useAppealStatus = (appealId?: string) => {
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppealStatus = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/plagiarism/appeal/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch appeal status');
      }

      const data = await response.json();
      setAppeal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appeal status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appealId) {
      fetchAppealStatus(appealId);
    }
  }, [appealId]);

  const refetch = () => {
    if (appealId) {
      fetchAppealStatus(appealId);
    }
  };

  return {
    appeal,
    loading,
    error,
    refetch,
  };
};
