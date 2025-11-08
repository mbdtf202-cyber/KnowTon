import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test creator address (use a valid Ethereum address)
const TEST_CREATOR_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

async function testDistributionDashboard() {
  console.log('🧪 Testing Distribution Dashboard API Endpoints\n');

  try {
    // Test 1: Get gas estimate
    console.log('1️⃣ Testing gas estimate endpoint...');
    const gasResponse = await axios.get(`${API_URL}/api/royalty-distribution/gas-estimate`);
    console.log('✅ Gas Estimate:', {
      gasPrice: gasResponse.data.data.gasPriceGwei + ' Gwei',
      estimatedCost: gasResponse.data.data.estimatedCostForDistribution + ' ETH',
    });
    console.log('');

    // Test 2: Get pending distributions
    console.log('2️⃣ Testing pending distributions endpoint...');
    const pendingResponse = await axios.get(`${API_URL}/api/royalty-distribution/pending`);
    console.log('✅ Pending Distributions:', pendingResponse.data.data.length);
    if (pendingResponse.data.data.length > 0) {
      console.log('   First pending:', pendingResponse.data.data[0]);
    }
    console.log('');

    // Test 3: Get distribution history
    console.log('3️⃣ Testing distribution history endpoint...');
    const historyResponse = await axios.get(
      `${API_URL}/api/royalty-distribution/history/${TEST_CREATOR_ADDRESS}`,
      { params: { page: 1, limit: 5 } }
    );
    console.log('✅ Distribution History:', {
      total: historyResponse.data.data.total,
      page: historyResponse.data.data.page,
      totalPages: historyResponse.data.data.totalPages,
      distributions: historyResponse.data.data.distributions.length,
    });
    console.log('');

    // Test 4: Get distribution statistics
    console.log('4️⃣ Testing distribution statistics endpoint...');
    const statsResponse = await axios.get(
      `${API_URL}/api/royalty-distribution/stats/${TEST_CREATOR_ADDRESS}`
    );
    console.log('✅ Distribution Stats:', statsResponse.data.data);
    console.log('');

    // Test 5: Calculate distribution (off-chain)
    console.log('5️⃣ Testing distribution calculation...');
    const calcResponse = await axios.post(`${API_URL}/api/royalty-distribution/calculate`, {
      tokenId: '1',
      totalAmount: '1.0',
      beneficiaries: [
        { recipient: TEST_CREATOR_ADDRESS, percentage: 7000 }, // 70%
        { recipient: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', percentage: 3000 }, // 30%
      ],
    });
    console.log('✅ Distribution Calculation:', {
      tokenId: calcResponse.data.data.tokenId,
      totalAmount: calcResponse.data.data.totalAmount + ' ETH',
      beneficiaries: calcResponse.data.data.beneficiaries.length,
      gasEstimate: calcResponse.data.data.gasEstimate + ' ETH',
    });
    console.log('   Beneficiary splits:');
    calcResponse.data.data.beneficiaries.forEach((b: any) => {
      console.log(`   - ${b.recipient.slice(0, 10)}... : ${b.amount} ETH (${b.percentage / 100}%)`);
    });
    console.log('');

    console.log('✅ All tests passed successfully!\n');
    console.log('📊 Distribution Dashboard API is working correctly.');
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testDistributionDashboard()
  .then(() => {
    console.log('\n✨ Test suite completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });
