import React, { useState, useEffect } from 'react';
import { simpleAPI } from '../services/simpleApi';

const TestPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Test health endpoint
        const healthResponse = await fetch('http://localhost:3000/health');
        const healthData = await healthResponse.json();
        
        // Test creators endpoint
        const creatorsData = await simpleAPI.getCreators();
        
        // Test NFTs endpoint
        const nftsData = await simpleAPI.getNFTs();
        
        setData({
          health: healthData,
          creators: creatorsData,
          nfts: nftsData,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Testing API connections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">API Test Results</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Health Check</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data?.health, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Creators Data</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data?.creators, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">NFTs Data</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data?.nfts, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestPage;