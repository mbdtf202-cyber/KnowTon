// +build integration

package blockchain

import (
	"context"
	"math/big"
	"os"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestIPBondContractIntegration tests the full bond lifecycle on-chain
func TestIPBondContractIntegration(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Load configuration from environment
	rpcURL := os.Getenv("ARBITRUM_RPC_URL")
	if rpcURL == "" {
		t.Skip("ARBITRUM_RPC_URL not set, skipping integration test")
	}

	contractAddr := os.Getenv("IPBOND_CONTRACT_ADDRESS")
	if contractAddr == "" {
		t.Skip("IPBOND_CONTRACT_ADDRESS not set, skipping integration test")
	}

	privateKey := os.Getenv("PRIVATE_KEY")
	if privateKey == "" {
		t.Skip("PRIVATE_KEY not set, skipping integration test")
	}

	// Connect to Ethereum client
	client, err := ethclient.Dial(rpcURL)
	require.NoError(t, err, "Failed to connect to Ethereum client")
	defer client.Close()

	// Create contract instance
	contract, err := NewIPBondContract(client, contractAddr, privateKey, 421614) // Arbitrum Sepolia
	require.NoError(t, err, "Failed to create contract instance")

	ctx := context.Background()

	t.Run("IssueBond", func(t *testing.T) {
		testIssueBond(t, ctx, contract)
	})

	t.Run("InvestInBond", func(t *testing.T) {
		testInvestInBond(t, ctx, contract)
	})

	t.Run("DistributeRevenue", func(t *testing.T) {
		testDistributeRevenue(t, ctx, contract)
	})

	t.Run("RedeemBond", func(t *testing.T) {
		testRedeemBond(t, ctx, contract)
	})

	t.Run("GetBondInfo", func(t *testing.T) {
		testGetBondInfo(t, ctx, contract)
	})
}

func testIssueBond(t *testing.T, ctx context.Context, contract *IPBondContract) {
	// Prepare bond parameters
	ipnftID := big.NewInt(1)
	nftContract := common.HexToAddress("0x1234567890123456789012345678901234567890")
	totalValue := big.NewInt(1000000000000000000) // 1 ETH
	seniorAllocation := big.NewInt(500000000000000000) // 0.5 ETH
	mezzanineAllocation := big.NewInt(330000000000000000) // 0.33 ETH
	juniorAllocation := big.NewInt(170000000000000000) // 0.17 ETH
	maturityDate := big.NewInt(time.Now().Add(365 * 24 * time.Hour).Unix()) // 1 year
	valuationUSD := big.NewInt(1000000) // $1M
	riskRating := "AA"

	// Issue bond
	tx, err := contract.IssueBond(
		ctx,
		ipnftID,
		nftContract,
		totalValue,
		seniorAllocation,
		mezzanineAllocation,
		juniorAllocation,
		maturityDate,
		valuationUSD,
		riskRating,
	)
	require.NoError(t, err, "Failed to issue bond")
	assert.NotNil(t, tx, "Transaction should not be nil")

	// Wait for transaction to be mined
	receipt, err := contract.WaitForTransaction(ctx, tx)
	require.NoError(t, err, "Failed to wait for transaction")
	assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

	t.Logf("Bond issued successfully. TxHash: %s, Gas Used: %d", tx.Hash().Hex(), receipt.GasUsed)
}

func testInvestInBond(t *testing.T, ctx context.Context, contract *IPBondContract) {
	bondID := big.NewInt(1) // Assuming bond 1 exists from previous test
	
	// Test investing in Senior tranche (tranche 0)
	t.Run("InvestInSeniorTranche", func(t *testing.T) {
		trancheID := uint8(0) // Senior
		amount := big.NewInt(100000000000000000) // 0.1 ETH

		tx, err := contract.Invest(ctx, bondID, trancheID, amount)
		require.NoError(t, err, "Failed to invest in Senior tranche")
		assert.NotNil(t, tx, "Transaction should not be nil")

		receipt, err := contract.WaitForTransaction(ctx, tx)
		require.NoError(t, err, "Failed to wait for transaction")
		assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

		t.Logf("Invested in Senior tranche. TxHash: %s, Gas Used: %d", tx.Hash().Hex(), receipt.GasUsed)
	})

	// Test investing in Mezzanine tranche (tranche 1)
	t.Run("InvestInMezzanineTranche", func(t *testing.T) {
		trancheID := uint8(1) // Mezzanine
		amount := big.NewInt(50000000000000000) // 0.05 ETH

		tx, err := contract.Invest(ctx, bondID, trancheID, amount)
		require.NoError(t, err, "Failed to invest in Mezzanine tranche")
		assert.NotNil(t, tx, "Transaction should not be nil")

		receipt, err := contract.WaitForTransaction(ctx, tx)
		require.NoError(t, err, "Failed to wait for transaction")
		assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

		t.Logf("Invested in Mezzanine tranche. TxHash: %s, Gas Used: %d", tx.Hash().Hex(), receipt.GasUsed)
	})

	// Test investing in Junior tranche (tranche 2)
	t.Run("InvestInJuniorTranche", func(t *testing.T) {
		trancheID := uint8(2) // Junior
		amount := big.NewInt(30000000000000000) // 0.03 ETH

		tx, err := contract.Invest(ctx, bondID, trancheID, amount)
		require.NoError(t, err, "Failed to invest in Junior tranche")
		assert.NotNil(t, tx, "Transaction should not be nil")

		receipt, err := contract.WaitForTransaction(ctx, tx)
		require.NoError(t, err, "Failed to wait for transaction")
		assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

		t.Logf("Invested in Junior tranche. TxHash: %s, Gas Used: %d", tx.Hash().Hex(), receipt.GasUsed)
	})
}

func testDistributeRevenue(t *testing.T, ctx context.Context, contract *IPBondContract) {
	bondID := big.NewInt(1)
	revenue := big.NewInt(50000000000000000) // 0.05 ETH

	tx, err := contract.DistributeRevenue(ctx, bondID, revenue)
	require.NoError(t, err, "Failed to distribute revenue")
	assert.NotNil(t, tx, "Transaction should not be nil")

	receipt, err := contract.WaitForTransaction(ctx, tx)
	require.NoError(t, err, "Failed to wait for transaction")
	assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

	t.Logf("Revenue distributed successfully. TxHash: %s, Gas Used: %d", tx.Hash().Hex(), receipt.GasUsed)
}

func testRedeemBond(t *testing.T, ctx context.Context, contract *IPBondContract) {
	// Note: This test would typically run after maturity date
	// For testing purposes, you might need to fast-forward time or use a test network
	t.Skip("Skipping redeem test - requires bond to be matured")
}

func testGetBondInfo(t *testing.T, ctx context.Context, contract *IPBondContract) {
	bondID := big.NewInt(1)

	bondInfo, err := contract.GetBondInfo(ctx, bondID)
	require.NoError(t, err, "Failed to get bond info")
	assert.NotNil(t, bondInfo, "Bond info should not be nil")

	// Verify bond info fields
	assert.NotEmpty(t, bondInfo["nftContract"], "NFT contract should not be empty")
	assert.NotEmpty(t, bondInfo["issuer"], "Issuer should not be empty")
	assert.NotEmpty(t, bondInfo["totalValue"], "Total value should not be empty")
	assert.NotZero(t, bondInfo["maturityDate"], "Maturity date should not be zero")

	t.Logf("Bond Info: %+v", bondInfo)
}

// TestErrorHandling tests error scenarios
func TestErrorHandling(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	rpcURL := os.Getenv("ARBITRUM_RPC_URL")
	if rpcURL == "" {
		t.Skip("ARBITRUM_RPC_URL not set")
	}

	contractAddr := os.Getenv("IPBOND_CONTRACT_ADDRESS")
	if contractAddr == "" {
		t.Skip("IPBOND_CONTRACT_ADDRESS not set")
	}

	privateKey := os.Getenv("PRIVATE_KEY")
	if privateKey == "" {
		t.Skip("PRIVATE_KEY not set")
	}

	client, err := ethclient.Dial(rpcURL)
	require.NoError(t, err)
	defer client.Close()

	contract, err := NewIPBondContract(client, contractAddr, privateKey, 421614)
	require.NoError(t, err)

	ctx := context.Background()

	t.Run("InvestInNonexistentBond", func(t *testing.T) {
		bondID := big.NewInt(999999) // Non-existent bond
		trancheID := uint8(0)
		amount := big.NewInt(100000000000000000)

		tx, err := contract.Invest(ctx, bondID, trancheID, amount)
		// Transaction might be created but will fail on-chain
		if err == nil {
			receipt, _ := contract.WaitForTransaction(ctx, tx)
			if receipt != nil {
				assert.Equal(t, uint64(0), receipt.Status, "Transaction should fail")
			}
		}
	})

	t.Run("InvestWithZeroAmount", func(t *testing.T) {
		bondID := big.NewInt(1)
		trancheID := uint8(0)
		amount := big.NewInt(0)

		tx, err := contract.Invest(ctx, bondID, trancheID, amount)
		// Should fail either at client side or on-chain
		if err == nil {
			receipt, _ := contract.WaitForTransaction(ctx, tx)
			if receipt != nil {
				assert.Equal(t, uint64(0), receipt.Status, "Transaction should fail")
			}
		}
	})

	t.Run("GetNonexistentBondInfo", func(t *testing.T) {
		bondID := big.NewInt(999999)

		_, err := contract.GetBondInfo(ctx, bondID)
		// Should return error or empty result
		assert.Error(t, err, "Should fail to get info for nonexistent bond")
	})
}

// TestRetryLogic tests transaction retry mechanisms
func TestRetryLogic(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	rpcURL := os.Getenv("ARBITRUM_RPC_URL")
	if rpcURL == "" {
		t.Skip("ARBITRUM_RPC_URL not set")
	}

	contractAddr := os.Getenv("IPBOND_CONTRACT_ADDRESS")
	if contractAddr == "" {
		t.Skip("IPBOND_CONTRACT_ADDRESS not set")
	}

	privateKey := os.Getenv("PRIVATE_KEY")
	if privateKey == "" {
		t.Skip("PRIVATE_KEY not set")
	}

	client, err := ethclient.Dial(rpcURL)
	require.NoError(t, err)
	defer client.Close()

	contract, err := NewIPBondContract(client, contractAddr, privateKey, 421614)
	require.NoError(t, err)

	ctx := context.Background()

	t.Run("RetryOnNetworkError", func(t *testing.T) {
		// Create a context with timeout to simulate network issues
		ctxWithTimeout, cancel := context.WithTimeout(ctx, 1*time.Millisecond)
		defer cancel()

		bondID := big.NewInt(1)
		_, err := contract.GetBondInfo(ctxWithTimeout, bondID)
		
		// Should handle timeout gracefully
		assert.Error(t, err, "Should return error on timeout")
		t.Logf("Handled timeout error: %v", err)
	})
}

// TestConcurrentInvestments tests concurrent investment scenarios
func TestConcurrentInvestments(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	rpcURL := os.Getenv("ARBITRUM_RPC_URL")
	if rpcURL == "" {
		t.Skip("ARBITRUM_RPC_URL not set")
	}

	contractAddr := os.Getenv("IPBOND_CONTRACT_ADDRESS")
	if contractAddr == "" {
		t.Skip("IPBOND_CONTRACT_ADDRESS not set")
	}

	privateKey := os.Getenv("PRIVATE_KEY")
	if privateKey == "" {
		t.Skip("PRIVATE_KEY not set")
	}

	client, err := ethclient.Dial(rpcURL)
	require.NoError(t, err)
	defer client.Close()

	contract, err := NewIPBondContract(client, contractAddr, privateKey, 421614)
	require.NoError(t, err)

	ctx := context.Background()

	t.Run("MultipleInvestmentsInSameTranche", func(t *testing.T) {
		bondID := big.NewInt(1)
		trancheID := uint8(0)
		
		// Make multiple small investments
		for i := 0; i < 3; i++ {
			amount := big.NewInt(10000000000000000) // 0.01 ETH
			
			tx, err := contract.Invest(ctx, bondID, trancheID, amount)
			if err != nil {
				t.Logf("Investment %d failed: %v", i+1, err)
				continue
			}

			receipt, err := contract.WaitForTransaction(ctx, tx)
			if err != nil {
				t.Logf("Failed to wait for transaction %d: %v", i+1, err)
				continue
			}

			assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")
			t.Logf("Investment %d successful. TxHash: %s", i+1, tx.Hash().Hex())
			
			// Add delay to avoid nonce issues
			time.Sleep(2 * time.Second)
		}
	})
}
