import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAccount } from 'wagmi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Distribution {
  id: string;
  tokenId: string;
  salePrice: string;
  distributions: Array<{
    recipient: string;
    percentage: number;
    amount: string;
  }>;
  txHash: string;
  status: string;
  createdAt: Date;
}

interface DistributionStats {
  totalDistributions: number;
  totalRevenue: string;
  pendingDistributions: number;
  pendingRevenue: string;
  successRate: number;
  averageDistribution: string;
}

interface PendingDistribution {
  tokenId: string;
  amount: string;
  createdAt: Date;
}

interface GasEstimate {
  gasPrice: string;
  gasPriceGwei: string;
  estimatedCostForDistribution: string;
}

export function useRoyaltyDistribution() {
  const { address } = useAccount();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [stats, setStats] = useState<DistributionStats | null>(null);
  const [pendingDistributions, setPendingDistributions] = useState<PendingDistribution[]>([]);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch distribution history
  const fetchHistory = async (creatorAddress?: string, pageNum: number = 1) => {
    if (!creatorAddress && !address) return;

    setLoading(true);
    setError(null);

    try {
      const targetAddress = creatorAddress || address;
      const response = await axios.get(
        `${API_URL}/api/royalty-distribution/history/${targetAddress}`,
        {
          params: { page: pageNum, limit: 10 },
        }
      );

      setDistributions(response.data.data.distributions);
      setPage(response.data.data.page);
      setTotalPages(response.data.data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch distribution history');
      console.error('Error fetching distribution history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch distribution statistics
  const fetchStats = async (creatorAddress?: string) => {
    if (!creatorAddress && !address) return;

    try {
      const targetAddress = creatorAddress || address;
      const response = await axios.get(
        `${API_URL}/api/royalty-distribution/stats/${targetAddress}`
      );

      setStats(response.data.data);
    } catch (err: any) {
      console.error('Error fetching distribution stats:', err);
    }
  };

  // Fetch pending distributions
  const fetchPending = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/royalty-distribution/pending`);
      setPendingDistributions(response.data.data);
    } catch (err: any) {
      console.error('Error fetching pending distributions:', err);
    }
  };

  // Fetch gas estimate
  const fetchGasEstimate = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/royalty-distribution/gas-estimate`);
      setGasEstimate(response.data.data);
    } catch (err: any) {
      console.error('Error fetching gas estimate:', err);
    }
  };

  // Execute a single distribution
  const executeDistribution = async (tokenId: string, amount: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/royalty-distribution/execute`, {
        tokenId,
        amount,
      });

      // Refresh data after execution
      await Promise.all([fetchHistory(), fetchStats(), fetchPending()]);

      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to execute distribution';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Execute batch distributions
  const executeBatchDistributions = async (
    distributions: Array<{ tokenId: string; amount: string }>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/royalty-distribution/execute-batch`,
        { distributions }
      );

      // Refresh data after execution
      await Promise.all([fetchHistory(), fetchStats(), fetchPending()]);

      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to execute batch distributions';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Process all pending distributions
  const processPending = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/royalty-distribution/process-pending`
      );

      // Refresh data after processing
      await Promise.all([fetchHistory(), fetchStats(), fetchPending()]);

      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to process pending distributions';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Calculate distribution off-chain
  const calculateDistribution = async (
    tokenId: string,
    totalAmount: string,
    beneficiaries: Array<{ recipient: string; percentage: number }>
  ) => {
    try {
      const response = await axios.post(`${API_URL}/api/royalty-distribution/calculate`, {
        tokenId,
        totalAmount,
        beneficiaries,
      });

      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to calculate distribution';
      throw new Error(errorMsg);
    }
  };

  // Auto-fetch data when address changes
  useEffect(() => {
    if (address) {
      fetchHistory();
      fetchStats();
      fetchPending();
      fetchGasEstimate();
    }
  }, [address]);

  return {
    distributions,
    stats,
    pendingDistributions,
    gasEstimate,
    loading,
    error,
    page,
    totalPages,
    fetchHistory,
    fetchStats,
    fetchPending,
    fetchGasEstimate,
    executeDistribution,
    executeBatchDistributions,
    processPending,
    calculateDistribution,
    setPage,
  };
}
