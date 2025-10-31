package blockchain

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// IPBondContract wraps the IPBond smart contract
type IPBondContract struct {
	client       *ethclient.Client
	contractAddr common.Address
	abi          abi.ABI
	privateKey   string
	chainID      *big.Int
}

// NewIPBondContract creates a new IPBond contract instance
func NewIPBondContract(
	client *ethclient.Client,
	contractAddr string,
	privateKey string,
	chainID int64,
) (*IPBondContract, error) {
	// Parse contract ABI
	contractABI, err := abi.JSON(strings.NewReader(IPBondABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse contract ABI: %w", err)
	}

	return &IPBondContract{
		client:       client,
		contractAddr: common.HexToAddress(contractAddr),
		abi:          contractABI,
		privateKey:   privateKey,
		chainID:      big.NewInt(chainID),
	}, nil
}

// IssueBond issues a new bond on-chain
func (c *IPBondContract) IssueBond(
	ctx context.Context,
	ipnftID *big.Int,
	nftContract common.Address,
	totalValue *big.Int,
	seniorAllocation *big.Int,
	mezzanineAllocation *big.Int,
	juniorAllocation *big.Int,
	maturityDate *big.Int,
	valuationUSD *big.Int,
	riskRating string,
) (*types.Transaction, error) {
	// Create transactor
	auth, err := c.createTransactor(ctx)
	if err != nil {
		return nil, err
	}

	// Pack function call data
	data, err := c.abi.Pack(
		"issueBond",
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
	if err != nil {
		return nil, fmt.Errorf("failed to pack function call: %w", err)
	}

	// Estimate gas
	gasLimit, err := c.client.EstimateGas(ctx, ethereum.CallMsg{
		From: auth.From,
		To:   &c.contractAddr,
		Data: data,
	})
	if err != nil {
		gasLimit = 500000 // Fallback gas limit
	}
	auth.GasLimit = gasLimit

	// Create transaction
	tx := types.NewTransaction(
		auth.Nonce.Uint64(),
		c.contractAddr,
		big.NewInt(0),
		gasLimit,
		auth.GasPrice,
		data,
	)

	// Sign transaction
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(c.chainID), c.getPrivateKey())
	if err != nil {
		return nil, fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	err = c.client.SendTransaction(ctx, signedTx)
	if err != nil {
		return nil, fmt.Errorf("failed to send transaction: %w", err)
	}

	return signedTx, nil
}

// Invest invests in a bond tranche
func (c *IPBondContract) Invest(
	ctx context.Context,
	bondID *big.Int,
	trancheID uint8,
	amount *big.Int,
) (*types.Transaction, error) {
	// Create transactor
	auth, err := c.createTransactor(ctx)
	if err != nil {
		return nil, err
	}

	// Set transaction value (payable function)
	auth.Value = amount

	// Pack function call data
	data, err := c.abi.Pack(
		"invest",
		bondID,
		trancheID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to pack function call: %w", err)
	}

	// Estimate gas
	gasLimit, err := c.client.EstimateGas(ctx, ethereum.CallMsg{
		From:  auth.From,
		To:    &c.contractAddr,
		Value: amount,
		Data:  data,
	})
	if err != nil {
		gasLimit = 300000
	}
	auth.GasLimit = gasLimit

	// Create transaction
	tx := types.NewTransaction(
		auth.Nonce.Uint64(),
		c.contractAddr,
		amount,
		gasLimit,
		auth.GasPrice,
		data,
	)

	// Sign and send
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(c.chainID), c.getPrivateKey())
	if err != nil {
		return nil, fmt.Errorf("failed to sign transaction: %w", err)
	}

	err = c.client.SendTransaction(ctx, signedTx)
	if err != nil {
		return nil, fmt.Errorf("failed to send transaction: %w", err)
	}

	return signedTx, nil
}

// DistributeRevenue distributes revenue to bond holders
func (c *IPBondContract) DistributeRevenue(
	ctx context.Context,
	bondID *big.Int,
	revenue *big.Int,
) (*types.Transaction, error) {
	// Create transactor
	auth, err := c.createTransactor(ctx)
	if err != nil {
		return nil, err
	}

	// Pack function call data
	data, err := c.abi.Pack(
		"distributeRevenue",
		bondID,
		revenue,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to pack function call: %w", err)
	}

	// Estimate gas
	gasLimit, err := c.client.EstimateGas(ctx, ethereum.CallMsg{
		From: auth.From,
		To:   &c.contractAddr,
		Data: data,
	})
	if err != nil {
		gasLimit = 400000
	}
	auth.GasLimit = gasLimit

	// Create transaction
	tx := types.NewTransaction(
		auth.Nonce.Uint64(),
		c.contractAddr,
		big.NewInt(0),
		gasLimit,
		auth.GasPrice,
		data,
	)

	// Sign and send
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(c.chainID), c.getPrivateKey())
	if err != nil {
		return nil, fmt.Errorf("failed to sign transaction: %w", err)
	}

	err = c.client.SendTransaction(ctx, signedTx)
	if err != nil {
		return nil, fmt.Errorf("failed to send transaction: %w", err)
	}

	return signedTx, nil
}

// GetBondInfo retrieves bond information from the blockchain
func (c *IPBondContract) GetBondInfo(
	ctx context.Context,
	bondID *big.Int,
) (map[string]interface{}, error) {
	// Pack function call data
	data, err := c.abi.Pack("getBondInfo", bondID)
	if err != nil {
		return nil, fmt.Errorf("failed to pack function call: %w", err)
	}

	// Call contract
	result, err := c.client.CallContract(ctx, ethereum.CallMsg{
		To:   &c.contractAddr,
		Data: data,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call contract: %w", err)
	}

	// Unpack result
	var bondInfo struct {
		IpnftID      *big.Int
		NftContract  common.Address
		Issuer       common.Address
		TotalValue   *big.Int
		MaturityDate *big.Int
		Status       uint8
		TotalRevenue *big.Int
	}

	err = c.abi.UnpackIntoInterface(&bondInfo, "getBondInfo", result)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack result: %w", err)
	}

	return map[string]interface{}{
		"ipnftID":      bondInfo.IpnftID,
		"nftContract":  bondInfo.NftContract.Hex(),
		"issuer":       bondInfo.Issuer.Hex(),
		"totalValue":   bondInfo.TotalValue.String(),
		"maturityDate": bondInfo.MaturityDate.Int64(),
		"status":       bondInfo.Status,
		"totalRevenue": bondInfo.TotalRevenue.String(),
	}, nil
}

// WaitForTransaction waits for a transaction to be mined
func (c *IPBondContract) WaitForTransaction(
	ctx context.Context,
	tx *types.Transaction,
) (*types.Receipt, error) {
	receipt, err := bind.WaitMined(ctx, c.client, tx)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for transaction: %w", err)
	}

	if receipt.Status == 0 {
		return nil, fmt.Errorf("transaction failed")
	}

	return receipt, nil
}

// Helper functions

func (c *IPBondContract) createTransactor(ctx context.Context) (*bind.TransactOpts, error) {
	// Parse private key
	privateKey, err := crypto.HexToECDSA(c.privateKey)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	// Create transactor
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, c.chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to create transactor: %w", err)
	}

	// Get nonce
	nonce, err := c.client.PendingNonceAt(ctx, auth.From)
	if err != nil {
		return nil, fmt.Errorf("failed to get nonce: %w", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))

	// Get gas price
	gasPrice, err := c.client.SuggestGasPrice(ctx)
	if err != nil {
		gasPrice = big.NewInt(1000000000) // 1 Gwei fallback
	}
	auth.GasPrice = gasPrice

	return auth, nil
}

func (c *IPBondContract) getPrivateKey() *ecdsa.PrivateKey {
	privateKey, _ := crypto.HexToECDSA(c.privateKey)
	return privateKey
}

// IPBondABI is the ABI of the IPBond smart contract
const IPBondABI = `[
	{
		"inputs": [
			{"name": "ipnftID", "type": "uint256"},
			{"name": "nftContract", "type": "address"},
			{"name": "totalValue", "type": "uint256"},
			{"name": "seniorAllocation", "type": "uint256"},
			{"name": "mezzanineAllocation", "type": "uint256"},
			{"name": "juniorAllocation", "type": "uint256"},
			{"name": "maturityDate", "type": "uint256"},
			{"name": "valuationUSD", "type": "uint256"},
			{"name": "riskRating", "type": "string"}
		],
		"name": "issueBond",
		"outputs": [
			{"name": "bondId", "type": "uint256"}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{"name": "bondId", "type": "uint256"},
			{"name": "trancheId", "type": "uint8"}
		],
		"name": "invest",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{"name": "bondId", "type": "uint256"},
			{"name": "revenue", "type": "uint256"}
		],
		"name": "distributeRevenue",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{"name": "bondId", "type": "uint256"}
		],
		"name": "getBondInfo",
		"outputs": [
			{"name": "ipnftID", "type": "uint256"},
			{"name": "nftContract", "type": "address"},
			{"name": "issuer", "type": "address"},
			{"name": "totalValue", "type": "uint256"},
			{"name": "maturityDate", "type": "uint256"},
			{"name": "status", "type": "uint8"},
			{"name": "totalRevenue", "type": "uint256"}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{"name": "bondId", "type": "uint256"},
			{"name": "trancheId", "type": "uint8"}
		],
		"name": "getTrancheInfo",
		"outputs": [
			{"name": "allocation", "type": "uint256"},
			{"name": "apy", "type": "uint256"},
			{"name": "totalInvested", "type": "uint256"},
			{"name": "investorCount", "type": "uint256"}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{"indexed": true, "name": "bondId", "type": "uint256"},
			{"indexed": true, "name": "issuer", "type": "address"},
			{"indexed": false, "name": "ipnftID", "type": "uint256"},
			{"indexed": false, "name": "totalValue", "type": "uint256"}
		],
		"name": "BondIssued",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{"indexed": true, "name": "bondId", "type": "uint256"},
			{"indexed": true, "name": "investor", "type": "address"},
			{"indexed": false, "name": "trancheId", "type": "uint8"},
			{"indexed": false, "name": "amount", "type": "uint256"}
		],
		"name": "Investment",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{"indexed": true, "name": "bondId", "type": "uint256"},
			{"indexed": false, "name": "revenue", "type": "uint256"},
			{"indexed": false, "name": "timestamp", "type": "uint256"}
		],
		"name": "RevenueDistributed",
		"type": "event"
	}
]`
