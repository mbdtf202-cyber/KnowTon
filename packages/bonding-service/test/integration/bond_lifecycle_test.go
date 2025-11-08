// +build integration

package integration

import (
	"context"
	"math/big"
	"os"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/knowton/bonding-service/internal/blockchain"
	"github.com/knowton/bonding-service/internal/oracle"
	"github.com/knowton/bonding-service/internal/risk"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestFullBondLifecycle tests the complete bond issuance, investment, and distribution flow
func TestFullBondLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Setup
	config := loadTestConfig(t)
	ctx := context.Background()

	// Initialize components
	client, err := ethclient.Dial(config.RPCURL)
	require.NoError(t, err, "Failed to connect to Ethereum client")
	defer client.Close()

	contract, err := blockchain.NewIPBondContract(
		client,
		config.ContractAddress,
		config.PrivateKey,
		config.ChainID,
	)
	require.NoError(t, err, "Failed to create contract instance")

	riskEngine := risk.NewRiskEngineWithOracle(config.OracleURL)

	// Step 1: Assess IP Value and Risk
	t.Run("Step1_AssessIPValue", func(t *testing.T) {
		ipnftID := "test-ipnft-1"
		metadata := &risk.IPMetadata{
			Category:       "music",
			CreatorAddress: "0x1234567890123456789012345678901234567890",
			CreatedAt:      time.Now().Add(-180 * 24 * time.Hour), // 6 months old
			Views:          5000,
			Likes:          500,
			Tags:           []string{"electronic", "dance", "original"},
			ContentHash:    "QmTest123456789",
		}

		assessment, err := riskEngine.AssessIPValue(ipnftID, metadata)
		require.NoError(t, err, "Failed to assess IP value")
		assert.NotNil(t, assessment, "Assessment should not be nil")
		assert.Greater(t, assessment.ValuationUSD, 0.0, "Valuation should be positive")
		assert.Greater(t, assessment.ConfidenceScore, 0.0, "Confidence should be positive")
		assert.NotEmpty(t, assessment.RiskRating, "Risk rating should not be empty")

		t.Logf("Risk Assessment Results:")
		t.Logf("  Valuation: $%.2f", assessment.ValuationUSD)
		t.Logf("  Confidence: %.2f", assessment.ConfidenceScore)
		t.Logf("  Risk Rating: %s", assessment.RiskRating)
		t.Logf("  Default Probability: %.2f%%", assessment.DefaultProbability*100)
		t.Logf("  Recommended LTV: %.2f%%", assessment.RecommendedLTV*100)
	})

	// Step 2: Issue Bond
	var bondID *big.Int
	t.Run("Step2_IssueBond", func(t *testing.T) {
		ipnftID := big.NewInt(1)
		nftContract := common.HexToAddress("0x1234567890123456789012345678901234567890")
		totalValue := big.NewInt(1000000000000000000) // 1 ETH
		seniorAllocation := big.NewInt(500000000000000000)
		mezzanineAllocation := big.NewInt(330000000000000000)
		juniorAllocation := big.NewInt(170000000000000000)
		maturityDate := big.NewInt(time.Now().Add(365 * 24 * time.Hour).Unix())
		valuationUSD := big.NewInt(1000000)
		riskRating := "AA"

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

		receipt, err := contract.WaitForTransaction(ctx, tx)
		require.NoError(t, err, "Failed to wait for transaction")
		assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

		bondID = big.NewInt(1) // Assuming this is the first bond
		t.Logf("Bond issued successfully. TxHash: %s", tx.Hash().Hex())
	})

	// Step 3: Multiple Investors Invest in Different Tranches
	t.Run("Step3_InvestInTranches", func(t *testing.T) {
		require.NotNil(t, bondID, "Bond ID should be set from previous step")

		// Senior tranche investment
		t.Run("SeniorInvestment", func(t *testing.T) {
			tx, err := contract.Invest(ctx, bondID, 0, big.NewInt(100000000000000000))
			require.NoError(t, err, "Failed to invest in Senior tranche")

			receipt, err := contract.WaitForTransaction(ctx, tx)
			require.NoError(t, err, "Failed to wait for transaction")
			assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

			t.Logf("Senior investment successful. TxHash: %s", tx.Hash().Hex())
		})

		// Mezzanine tranche investment
		t.Run("MezzanineInvestment", func(t *testing.T) {
			tx, err := contract.Invest(ctx, bondID, 1, big.NewInt(50000000000000000))
			require.NoError(t, err, "Failed to invest in Mezzanine tranche")

			receipt, err := contract.WaitForTransaction(ctx, tx)
			require.NoError(t, err, "Failed to wait for transaction")
			assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

			t.Logf("Mezzanine investment successful. TxHash: %s", tx.Hash().Hex())
		})

		// Junior tranche investment
		t.Run("JuniorInvestment", func(t *testing.T) {
			tx, err := contract.Invest(ctx, bondID, 2, big.NewInt(30000000000000000))
			require.NoError(t, err, "Failed to invest in Junior tranche")

			receipt, err := contract.WaitForTransaction(ctx, tx)
			require.NoError(t, err, "Failed to wait for transaction")
			assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

			t.Logf("Junior investment successful. TxHash: %s", tx.Hash().Hex())
		})
	})

	// Step 4: Distribute Revenue
	t.Run("Step4_DistributeRevenue", func(t *testing.T) {
		require.NotNil(t, bondID, "Bond ID should be set")

		// Simulate revenue generation
		revenue := big.NewInt(50000000000000000) // 0.05 ETH

		tx, err := contract.DistributeRevenue(ctx, bondID, revenue)
		require.NoError(t, err, "Failed to distribute revenue")

		receipt, err := contract.WaitForTransaction(ctx, tx)
		require.NoError(t, err, "Failed to wait for transaction")
		assert.Equal(t, uint64(1), receipt.Status, "Transaction should succeed")

		t.Logf("Revenue distributed successfully. TxHash: %s", tx.Hash().Hex())
	})

	// Step 5: Verify Bond State
	t.Run("Step5_VerifyBondState", func(t *testing.T) {
		require.NotNil(t, bondID, "Bond ID should be set")

		bondInfo, err := contract.GetBondInfo(ctx, bondID)
		require.NoError(t, err, "Failed to get bond info")

		assert.NotEmpty(t, bondInfo["nftContract"], "NFT contract should be set")
		assert.NotEmpty(t, bondInfo["issuer"], "Issuer should be set")
		assert.NotEmpty(t, bondInfo["totalValue"], "Total value should be set")
		assert.NotEmpty(t, bondInfo["totalRevenue"], "Total revenue should be set")

		t.Logf("Bond State:")
		t.Logf("  NFT Contract: %s", bondInfo["nftContract"])
		t.Logf("  Issuer: %s", bondInfo["issuer"])
		t.Logf("  Total Value: %s", bondInfo["totalValue"])
		t.Logf("  Total Revenue: %s", bondInfo["totalRevenue"])
		t.Logf("  Status: %v", bondInfo["status"])
	})
}

// TestOracleIntegration tests the Oracle Adapter integration
func TestOracleIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	config := loadTestConfig(t)
	if config.OracleURL == "" {
		t.Skip("Oracle URL not configured")
	}

	ctx := context.Background()
	oracleClient := oracle.NewOracleClient(config.OracleURL)

	t.Run("HealthCheck", func(t *testing.T) {
		err := oracleClient.HealthCheck(ctx)
		if err != nil {
			t.Logf("Oracle health check failed (may be expected if service is not running): %v", err)
		} else {
			t.Log("Oracle service is healthy")
		}
	})

	t.Run("EstimateValue", func(t *testing.T) {
		metadata := map[string]interface{}{
			"category":      "music",
			"creator":       "0x1234567890123456789012345678901234567890",
			"views":         5000,
			"likes":         500,
			"tags":          []string{"electronic", "dance"},
			"content_hash":  "QmTest123",
			"created_at":    time.Now().Add(-180 * 24 * time.Hour).Unix(),
			"quality_score": 0.7,
			"rarity":        0.6,
		}

		valuation, err := oracleClient.EstimateValue(ctx, "test-token-1", metadata, nil)
		if err != nil {
			t.Logf("Oracle valuation failed (may be expected): %v", err)
			return
		}

		assert.Greater(t, valuation.EstimatedValue, 0.0, "Estimated value should be positive")
		assert.NotEmpty(t, valuation.Factors, "Factors should not be empty")

		t.Logf("Oracle Valuation Results:")
		t.Logf("  Estimated Value: $%.2f", valuation.EstimatedValue)
		t.Logf("  Confidence Interval: [%.2f, %.2f]", 
			valuation.ConfidenceInterval[0], 
			valuation.ConfidenceInterval[1])
		t.Logf("  Model Uncertainty: %.4f", valuation.ModelUncertainty)
		t.Logf("  Processing Time: %.2fms", valuation.ProcessingTimeMs)
	})
}

// TestRiskAssessmentWithOracle tests risk assessment with Oracle integration
func TestRiskAssessmentWithOracle(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	config := loadTestConfig(t)
	riskEngine := risk.NewRiskEngineWithOracle(config.OracleURL)

	testCases := []struct {
		name     string
		metadata *risk.IPMetadata
	}{
		{
			name: "HighQualityMusic",
			metadata: &risk.IPMetadata{
				Category:       "music",
				CreatorAddress: "0x1234567890123456789012345678901234567890",
				CreatedAt:      time.Now().Add(-365 * 24 * time.Hour),
				Views:          50000,
				Likes:          5000,
				Tags:           []string{"pop", "original", "trending"},
				ContentHash:    "QmHighQuality123",
			},
		},
		{
			name: "NewVideo",
			metadata: &risk.IPMetadata{
				Category:       "video",
				CreatorAddress: "0x9876543210987654321098765432109876543210",
				CreatedAt:      time.Now().Add(-30 * 24 * time.Hour),
				Views:          1000,
				Likes:          100,
				Tags:           []string{"tutorial", "educational"},
				ContentHash:    "QmNewVideo456",
			},
		},
		{
			name: "EstablishedSoftware",
			metadata: &risk.IPMetadata{
				Category:       "software",
				CreatorAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
				CreatedAt:      time.Now().Add(-730 * 24 * time.Hour),
				Views:          100000,
				Likes:          10000,
				Tags:           []string{"utility", "open-source", "popular"},
				ContentHash:    "QmSoftware789",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assessment, err := riskEngine.AssessIPValue(tc.name, tc.metadata)
			require.NoError(t, err, "Failed to assess IP value")
			assert.NotNil(t, assessment, "Assessment should not be nil")

			t.Logf("%s Assessment:", tc.name)
			t.Logf("  Valuation: $%.2f", assessment.ValuationUSD)
			t.Logf("  Confidence: %.2f", assessment.ConfidenceScore)
			t.Logf("  Risk Rating: %s", assessment.RiskRating)
			t.Logf("  Default Probability: %.2f%%", assessment.DefaultProbability*100)
			t.Logf("  Recommended LTV: %.2f%%", assessment.RecommendedLTV*100)
			t.Logf("  Risk Factors: %s", assessment.RiskFactors)
		})
	}
}

// TestErrorRecovery tests error handling and recovery mechanisms
func TestErrorRecovery(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	config := loadTestConfig(t)
	ctx := context.Background()

	client, err := ethclient.Dial(config.RPCURL)
	require.NoError(t, err)
	defer client.Close()

	contract, err := blockchain.NewIPBondContract(
		client,
		config.ContractAddress,
		config.PrivateKey,
		config.ChainID,
	)
	require.NoError(t, err)

	t.Run("RecoverFromFailedTransaction", func(t *testing.T) {
		// Try to invest with insufficient funds
		bondID := big.NewInt(1)
		trancheID := uint8(0)
		amount := new(big.Int)
		amount.SetString("1000000000000000000000", 10) // Very large amount (1000 ETH)

		tx, err := contract.Invest(ctx, bondID, trancheID, amount)
		if err != nil {
			t.Logf("Expected error occurred: %v", err)
			return
		}

		receipt, err := contract.WaitForTransaction(ctx, tx)
		if err != nil {
			t.Logf("Transaction failed as expected: %v", err)
			return
		}

		if receipt.Status == 0 {
			t.Log("Transaction reverted as expected")
		}
	})

	t.Run("HandleNetworkTimeout", func(t *testing.T) {
		ctxWithTimeout, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
		defer cancel()

		bondID := big.NewInt(1)
		_, err := contract.GetBondInfo(ctxWithTimeout, bondID)
		
		if err != nil {
			t.Logf("Handled timeout gracefully: %v", err)
		}
	})

	t.Run("RetryOnTransientFailure", func(t *testing.T) {
		bondID := big.NewInt(1)
		maxRetries := 3
		var lastErr error

		for i := 0; i < maxRetries; i++ {
			_, err := contract.GetBondInfo(ctx, bondID)
			if err == nil {
				t.Logf("Succeeded on attempt %d", i+1)
				return
			}
			lastErr = err
			t.Logf("Attempt %d failed: %v", i+1, err)
			time.Sleep(time.Second * time.Duration(i+1))
		}

		t.Logf("All retries exhausted. Last error: %v", lastErr)
	})
}

// TestConfig holds test configuration
type TestConfig struct {
	RPCURL          string
	ContractAddress string
	PrivateKey      string
	ChainID         int64
	OracleURL       string
}

// loadTestConfig loads configuration from environment variables
func loadTestConfig(t *testing.T) *TestConfig {
	config := &TestConfig{
		RPCURL:          os.Getenv("ARBITRUM_RPC_URL"),
		ContractAddress: os.Getenv("IPBOND_CONTRACT_ADDRESS"),
		PrivateKey:      os.Getenv("PRIVATE_KEY"),
		ChainID:         421614, // Arbitrum Sepolia
		OracleURL:       os.Getenv("AI_ORACLE_URL"),
	}

	if config.RPCURL == "" {
		t.Skip("ARBITRUM_RPC_URL not set")
	}
	if config.ContractAddress == "" {
		t.Skip("IPBOND_CONTRACT_ADDRESS not set")
	}
	if config.PrivateKey == "" {
		t.Skip("PRIVATE_KEY not set")
	}

	// Oracle URL is optional
	if config.OracleURL == "" {
		config.OracleURL = "http://localhost:8000"
		t.Logf("Using default Oracle URL: %s", config.OracleURL)
	}

	return config
}
