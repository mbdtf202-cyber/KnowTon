package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	pb "github.com/knowton/bonding-service/proto"
	"github.com/knowton/bonding-service/internal/models"
	"github.com/knowton/bonding-service/internal/risk"
	"gorm.io/gorm"
)

// BondingServiceServer implements the gRPC BondingService
type BondingServiceServer struct {
	pb.UnimplementedBondingServiceServer
	db         *gorm.DB
	ethClient  *ethclient.Client
	riskEngine *risk.RiskEngine
	contractAddr common.Address
	privateKey  string
}

// NewBondingServiceServer creates a new bonding service server
func NewBondingServiceServer(
	db *gorm.DB,
	ethClient *ethclient.Client,
	contractAddr string,
	privateKey string,
) *BondingServiceServer {
	return &BondingServiceServer{
		db:           db,
		ethClient:    ethClient,
		riskEngine:   risk.NewRiskEngine(),
		contractAddr: common.HexToAddress(contractAddr),
		privateKey:   privateKey,
	}
}

// IssueBond issues a new IP-backed bond
func (s *BondingServiceServer) IssueBond(
	ctx context.Context,
	req *pb.IssueBondRequest,
) (*pb.IssueBondResponse, error) {
	// 1. Validate request
	if err := s.validateIssueBondRequest(req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// 2. Assess IP risk
	metadata := &risk.IPMetadata{
		Category:       "music", // Would be extracted from request
		CreatorAddress: req.IssuerAddress,
		CreatedAt:      time.Now(),
		Views:          1000,
		Likes:          100,
		Tags:           []string{"original", "popular"},
		ContentHash:    req.IpnftId,
	}
	
	riskAssessment, err := s.riskEngine.AssessIPValue(req.IpnftId, metadata)
	if err != nil {
		return nil, fmt.Errorf("risk assessment failed: %w", err)
	}

	// 3. Save risk assessment to database
	if err := s.db.Create(riskAssessment).Error; err != nil {
		return nil, fmt.Errorf("failed to save risk assessment: %w", err)
	}

	// 4. Calculate tranche allocations
	totalValue, ok := new(big.Int).SetString(req.TotalValue, 10)
	if !ok {
		return nil, fmt.Errorf("invalid total value")
	}

	// 5. Call smart contract to issue bond
	txHash, bondID, err := s.issueBondOnChain(req, totalValue)
	if err != nil {
		return nil, fmt.Errorf("failed to issue bond on-chain: %w", err)
	}

	// 6. Save bond to database
	bond := &models.Bond{
		BondID:       bondID,
		IPNFTId:      req.IpnftId,
		NFTContract:  s.contractAddr.Hex(), // Would get from config
		Issuer:       req.IssuerAddress,
		TotalValue:   req.TotalValue,
		MaturityDate: time.Unix(req.MaturityDate, 0),
		Status:       "ACTIVE",
		TotalRevenue: "0",
		TxHash:       txHash,
	}

	if err := s.db.Create(bond).Error; err != nil {
		return nil, fmt.Errorf("failed to save bond: %w", err)
	}

	// 7. Save tranches
	tranches := []*models.Tranche{
		{
			BondID:        bondID,
			TrancheID:     0,
			Name:          req.Senior.Name,
			Priority:      int(req.Senior.Priority),
			Allocation:    s.calculateAllocation(totalValue, req.Senior.AllocationPercentage),
			APY:           req.Senior.Apy,
			RiskLevel:     req.Senior.RiskLevel,
			TotalInvested: "0",
		},
		{
			BondID:        bondID,
			TrancheID:     1,
			Name:          req.Mezzanine.Name,
			Priority:      int(req.Mezzanine.Priority),
			Allocation:    s.calculateAllocation(totalValue, req.Mezzanine.AllocationPercentage),
			APY:           req.Mezzanine.Apy,
			RiskLevel:     req.Mezzanine.RiskLevel,
			TotalInvested: "0",
		},
		{
			BondID:        bondID,
			TrancheID:     2,
			Name:          req.Junior.Name,
			Priority:      int(req.Junior.Priority),
			Allocation:    s.calculateAllocation(totalValue, req.Junior.AllocationPercentage),
			APY:           req.Junior.Apy,
			RiskLevel:     req.Junior.RiskLevel,
			TotalInvested: "0",
		},
	}

	for _, tranche := range tranches {
		if err := s.db.Create(tranche).Error; err != nil {
			return nil, fmt.Errorf("failed to save tranche: %w", err)
		}
	}

	// 8. Build response
	response := &pb.IssueBondResponse{
		BondId: bondID,
		TxHash: txHash,
		Status: "success",
		Tranches: []*pb.TrancheInfo{
			{
				TrancheId:     0,
				Name:          req.Senior.Name,
				Priority:      req.Senior.Priority,
				Allocation:    tranches[0].Allocation,
				Apy:           req.Senior.Apy,
				RiskLevel:     req.Senior.RiskLevel,
				TotalInvested: "0",
			},
			{
				TrancheId:     1,
				Name:          req.Mezzanine.Name,
				Priority:      req.Mezzanine.Priority,
				Allocation:    tranches[1].Allocation,
				Apy:           req.Mezzanine.Apy,
				RiskLevel:     req.Mezzanine.RiskLevel,
				TotalInvested: "0",
			},
			{
				TrancheId:     2,
				Name:          req.Junior.Name,
				Priority:      req.Junior.Priority,
				Allocation:    tranches[2].Allocation,
				Apy:           req.Junior.Apy,
				RiskLevel:     req.Junior.RiskLevel,
				TotalInvested: "0",
			},
		},
		RiskAssessment: &pb.RiskAssessment{
			ValuationUsd:       riskAssessment.ValuationUSD,
			ConfidenceScore:    riskAssessment.ConfidenceScore,
			RiskRating:         riskAssessment.RiskRating,
			DefaultProbability: riskAssessment.DefaultProbability,
			RecommendedLtv:     riskAssessment.RecommendedLTV,
			RiskFactors:        s.parseRiskFactors(riskAssessment.RiskFactors),
		},
	}

	return response, nil
}

// GetBondInfo retrieves bond information
func (s *BondingServiceServer) GetBondInfo(
	ctx context.Context,
	req *pb.GetBondInfoRequest,
) (*pb.GetBondInfoResponse, error) {
	var bond models.Bond
	if err := s.db.Preload("Tranches").Where("bond_id = ?", req.BondId).First(&bond).Error; err != nil {
		return nil, fmt.Errorf("bond not found: %w", err)
	}

	tranches := make([]*pb.TrancheInfo, len(bond.Tranches))
	for i, t := range bond.Tranches {
		tranches[i] = &pb.TrancheInfo{
			TrancheId:     int32(t.TrancheID),
			Name:          t.Name,
			Priority:      int32(t.Priority),
			Allocation:    t.Allocation,
			Apy:           t.APY,
			RiskLevel:     t.RiskLevel,
			TotalInvested: t.TotalInvested,
		}
	}

	response := &pb.GetBondInfoResponse{
		BondId:       bond.BondID,
		IpnftId:      bond.IPNFTId,
		NftContract:  bond.NFTContract,
		Issuer:       bond.Issuer,
		TotalValue:   bond.TotalValue,
		MaturityDate: bond.MaturityDate.Unix(),
		Status:       bond.Status,
		Tranches:     tranches,
		TotalRevenue: bond.TotalRevenue,
		CreatedAt:    bond.CreatedAt.Unix(),
	}

	return response, nil
}

// InvestInBond processes an investment in a bond tranche
func (s *BondingServiceServer) InvestInBond(
	ctx context.Context,
	req *pb.InvestInBondRequest,
) (*pb.InvestInBondResponse, error) {
	// This would call the smart contract invest function
	// For now, return a placeholder response
	return &pb.InvestInBondResponse{
		TxHash:         "0x" + fmt.Sprintf("%064x", time.Now().Unix()),
		Status:         "pending",
		InvestedAmount: req.Amount,
		ExpectedReturn: 1.15, // 15% return
	}, nil
}

// DistributeRevenue distributes revenue to bond holders
func (s *BondingServiceServer) DistributeRevenue(
	ctx context.Context,
	req *pb.DistributeRevenueRequest,
) (*pb.DistributeRevenueResponse, error) {
	// This would call the smart contract distributeRevenue function
	// For now, return a placeholder response
	return &pb.DistributeRevenueResponse{
		TxHash: "0x" + fmt.Sprintf("%064x", time.Now().Unix()),
		Status: "success",
		Distributions: []*pb.TrancheDistribution{
			{
				TrancheId:         0,
				Name:              "Senior",
				AmountDistributed: req.Amount,
				InvestorCount:     5,
			},
		},
	}, nil
}

// AssessIPRisk assesses the risk of an IP-NFT
func (s *BondingServiceServer) AssessIPRisk(
	ctx context.Context,
	req *pb.AssessIPRiskRequest,
) (*pb.AssessIPRiskResponse, error) {
	metadata := &risk.IPMetadata{
		Category:       req.Metadata.Category,
		CreatorAddress: req.Metadata.CreatorAddress,
		CreatedAt:      time.Unix(req.Metadata.CreatedAt, 0),
		Views:          req.Metadata.Views,
		Likes:          req.Metadata.Likes,
		Tags:           req.Metadata.Tags,
		ContentHash:    req.Metadata.ContentHash,
	}

	assessment, err := s.riskEngine.AssessIPValue(req.IpnftId, metadata)
	if err != nil {
		return nil, fmt.Errorf("risk assessment failed: %w", err)
	}

	response := &pb.AssessIPRiskResponse{
		Assessment: &pb.RiskAssessment{
			ValuationUsd:       assessment.ValuationUSD,
			ConfidenceScore:    assessment.ConfidenceScore,
			RiskRating:         assessment.RiskRating,
			DefaultProbability: assessment.DefaultProbability,
			RecommendedLtv:     assessment.RecommendedLTV,
			RiskFactors:        s.parseRiskFactors(assessment.RiskFactors),
		},
		ComparableSales: []*pb.ComparableSale{
			// Would fetch from database
		},
		MarketAnalysis: &pb.MarketAnalysis{
			AvgPrice:       5000.0,
			MedianPrice:    4500.0,
			PriceTrend:     0.15,
			TotalSales:     150,
			LiquidityScore: 0.75,
		},
	}

	return response, nil
}

// Helper functions

func (s *BondingServiceServer) validateIssueBondRequest(req *pb.IssueBondRequest) error {
	if req.IpnftId == "" {
		return fmt.Errorf("ipnft_id is required")
	}
	if req.TotalValue == "" {
		return fmt.Errorf("total_value is required")
	}
	if req.MaturityDate <= time.Now().Unix() {
		return fmt.Errorf("maturity_date must be in the future")
	}
	if req.Senior == nil || req.Mezzanine == nil || req.Junior == nil {
		return fmt.Errorf("all tranches must be configured")
	}
	return nil
}

func (s *BondingServiceServer) issueBondOnChain(
	req *pb.IssueBondRequest,
	totalValue *big.Int,
) (string, string, error) {
	// Parse private key
	privateKey, err := crypto.HexToECDSA(s.privateKey)
	if err != nil {
		return "", "", fmt.Errorf("invalid private key: %w", err)
	}

	// Create transactor
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(42161)) // Arbitrum
	if err != nil {
		return "", "", fmt.Errorf("failed to create transactor: %w", err)
	}

	// In production, this would call the actual smart contract
	// For now, simulate the transaction
	bondID := fmt.Sprintf("BOND-%d", time.Now().Unix())
	txHash := fmt.Sprintf("0x%064x", time.Now().Unix())

	// Simulate gas estimation
	auth.GasLimit = 500000
	auth.GasPrice = big.NewInt(1000000000) // 1 Gwei

	return txHash, bondID, nil
}

func (s *BondingServiceServer) calculateAllocation(totalValue *big.Int, percentage string) string {
	// Parse percentage
	pct := new(big.Int)
	pct.SetString(percentage, 10)
	
	// Calculate allocation
	allocation := new(big.Int).Mul(totalValue, pct)
	allocation.Div(allocation, big.NewInt(100))
	
	return allocation.String()
}

func (s *BondingServiceServer) parseRiskFactors(riskFactorsJSON string) []string {
	var factors []string
	if err := json.Unmarshal([]byte(riskFactorsJSON), &factors); err != nil {
		return []string{}
	}
	return factors
}
