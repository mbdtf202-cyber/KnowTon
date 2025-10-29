package main

import (
	"context"
	"fmt"
	"log"
	"time"

	pb "github.com/knowton/bonding-service/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Connect to bonding service
	conn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewBondingServiceClient(conn)
	ctx := context.Background()

	// Example 1: Assess IP Risk
	fmt.Println("=== Assessing IP Risk ===")
	riskResp, err := client.AssessIPRisk(ctx, &pb.AssessIPRiskRequest{
		IpnftId: "QmHash123",
		Metadata: &pb.IPMetadata{
			Category:       "music",
			CreatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
			CreatedAt:      time.Now().Unix(),
			Views:          10000,
			Likes:          500,
			Tags:           []string{"original", "popular", "trending"},
			ContentHash:    "QmHash123",
		},
	})
	if err != nil {
		log.Fatalf("Failed to assess risk: %v", err)
	}

	fmt.Printf("Valuation: $%.2f USD\n", riskResp.Assessment.ValuationUsd)
	fmt.Printf("Risk Rating: %s\n", riskResp.Assessment.RiskRating)
	fmt.Printf("Default Probability: %.2f%%\n", riskResp.Assessment.DefaultProbability*100)
	fmt.Printf("Recommended LTV: %.2f%%\n", riskResp.Assessment.RecommendedLtv*100)
	fmt.Printf("Confidence Score: %.2f\n", riskResp.Assessment.ConfidenceScore)
	fmt.Println()

	// Example 2: Issue Bond
	fmt.Println("=== Issuing Bond ===")
	bondResp, err := client.IssueBond(ctx, &pb.IssueBondRequest{
		IpnftId:      "QmHash123",
		TotalValue:   "100000000000000000000", // 100 ETH
		MaturityDate: time.Now().Add(365 * 24 * time.Hour).Unix(),
		Senior: &pb.TrancheConfig{
			Name:                 "Senior",
			Priority:             1,
			AllocationPercentage: "50",
			Apy:                  5.0,
			RiskLevel:            "Low",
		},
		Mezzanine: &pb.TrancheConfig{
			Name:                 "Mezzanine",
			Priority:             2,
			AllocationPercentage: "33",
			Apy:                  10.0,
			RiskLevel:            "Medium",
		},
		Junior: &pb.TrancheConfig{
			Name:                 "Junior",
			Priority:             3,
			AllocationPercentage: "17",
			Apy:                  20.0,
			RiskLevel:            "High",
		},
		IssuerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
	})
	if err != nil {
		log.Fatalf("Failed to issue bond: %v", err)
	}

	fmt.Printf("Bond ID: %s\n", bondResp.BondId)
	fmt.Printf("Transaction Hash: %s\n", bondResp.TxHash)
	fmt.Printf("Status: %s\n", bondResp.Status)
	fmt.Println("\nTranches:")
	for _, tranche := range bondResp.Tranches {
		fmt.Printf("  - %s (Priority %d): Allocation=%s, APY=%.2f%%, Risk=%s\n",
			tranche.Name, tranche.Priority, tranche.Allocation, tranche.Apy, tranche.RiskLevel)
	}
	fmt.Println()

	// Example 3: Get Bond Info
	fmt.Println("=== Getting Bond Info ===")
	infoResp, err := client.GetBondInfo(ctx, &pb.GetBondInfoRequest{
		BondId: bondResp.BondId,
	})
	if err != nil {
		log.Fatalf("Failed to get bond info: %v", err)
	}

	fmt.Printf("Bond ID: %s\n", infoResp.BondId)
	fmt.Printf("IP-NFT ID: %s\n", infoResp.IpnftId)
	fmt.Printf("Issuer: %s\n", infoResp.Issuer)
	fmt.Printf("Total Value: %s\n", infoResp.TotalValue)
	fmt.Printf("Maturity Date: %s\n", time.Unix(infoResp.MaturityDate, 0).Format("2006-01-02"))
	fmt.Printf("Status: %s\n", infoResp.Status)
	fmt.Printf("Total Revenue: %s\n", infoResp.TotalRevenue)
	fmt.Println()

	// Example 4: Invest in Bond
	fmt.Println("=== Investing in Bond ===")
	investResp, err := client.InvestInBond(ctx, &pb.InvestInBondRequest{
		BondId:          bondResp.BondId,
		TrancheId:       0, // Senior tranche
		Amount:          "10000000000000000000", // 10 ETH
		InvestorAddress: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
	})
	if err != nil {
		log.Fatalf("Failed to invest: %v", err)
	}

	fmt.Printf("Transaction Hash: %s\n", investResp.TxHash)
	fmt.Printf("Status: %s\n", investResp.Status)
	fmt.Printf("Invested Amount: %s\n", investResp.InvestedAmount)
	fmt.Printf("Expected Return: %.2fx\n", investResp.ExpectedReturn)
	fmt.Println()

	fmt.Println("=== All operations completed successfully ===")
}
