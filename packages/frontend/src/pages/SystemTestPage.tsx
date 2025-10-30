import React, { useState, useEffect } from 'react';
import { simpleAPI } from '../services/simpleApi';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

const SystemTestPage: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Health Check', status: 'pending' },
    { name: 'Get Creators', status: 'pending' },
    { name: 'Get NFTs', status: 'pending' },
    { name: 'Get Analytics', status: 'pending' },
    { name: 'Get Staking Stats', status: 'pending' },
    { name: 'Get Proposals', status: 'pending' },
    { name: 'Register Creator', status: 'pending' },
    { name: 'Upload Content', status: 'pending' },
  ]);

  const updateTest = (name: string, status: 'success' | 'error', message?: string, data?: any) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, data } : test
    ));
  };

  const runTests = async () => {
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })));

    try {
      // Test 1: Health Check
      const healthResponse = await fetch('http://localhost:3000/health');
      const healthData = await healthResponse.json();
      updateTest('Health Check', 'success', 'Backend is healthy', healthData);
    } catch (error) {
      updateTest('Health Check', 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test 2: Get Creators
      const creatorsData = await simpleAPI.getCreators();
      updateTest('Get Creators', 'success', `Found ${creatorsData.data?.length || 0} creators`, creatorsData);
    } catch (error) {
      updateTest('Get Creators', 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test 3: Get NFTs
      const nftsData = await simpleAPI.getNFTs();
      updateTest('Get NFTs', 'success', `Found ${nftsData.data?.length || 0} NFTs`, nftsData);
    } catch (error) {
      updateTest('Get NFTs', 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test 4: Get Analytics
      const analyticsData = await simpleAPI.getAnalyticsSummary();
      updateTest('Get Analytics', 'success', 'Analytics data retrieved', analyticsData);
    } catch (error) {
      updateTest('Get Analytics', 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test 5: Get Staking Stats
      const stakingData = await simpleAPI.getStakingStats();
      updateTest('Get Staking Stats', 'success', 'Staking stats retrieved', stakingData);
    } catch (error) {
      updateTest('Get Staking Stats', 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test 6: Get Proposals
      const proposalsData = await simpleAPI.getProposals();
      updateTest('Get Proposals', 'success', `Found ${proposalsData.data?.length || 0} proposals`, proposalsData);
    } catch (error) {
      updateTest('Get Proposals', 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test 7: Register Creator
      const newCreator = await simpleAPI.registerCreator({
        walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        displayName: 'Test Creator',
        bio: 'This is a test creator for system testing'
      });
      updateTest('Register Creator', 'success', 'Creator registered successfully', newCreator);
    } catch (error) {
      updateTest('Register Creator', 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Test 8: Upload Content
      const newContent = await simpleAPI.uploadContent({
        title: 'Test Content',
        description: 'This is test content for system testing',
        category: 'test'
      });
      updateTest('Upload Content', 'success', 'Content uploaded successfully', newContent);
    } catch (error) {
      updateTest('Upload Content', 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const pendingCount = tests.filter(t => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800">🚀 KnowTon System Test</h1>
            <button
              onClick={runTests}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Run Tests Again
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-green-700">Passed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-red-700">Failed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-yellow-700">Pending</div>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(test.status)}</span>
                    <span className="font-semibold text-gray-800">{test.name}</span>
                  </div>
                  <span className={`font-medium ${getStatusColor(test.status)}`}>
                    {test.status.toUpperCase()}
                  </span>
                </div>
                
                {test.message && (
                  <div className="mt-2 text-sm text-gray-600">
                    {test.message}
                  </div>
                )}
                
                {test.data && test.status === 'success' && (
                  <details className="mt-2">
                    <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                      View Response Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* System Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">📊 System Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Frontend:</strong> http://localhost:5177
              </div>
              <div>
                <strong>Backend:</strong> http://localhost:3000
              </div>
              <div>
                <strong>API Docs:</strong> http://localhost:3000/api-docs
              </div>
              <div>
                <strong>Test Time:</strong> {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTestPage;