package service

import (
	"math/big"
	"testing"
	"time"

	pb "github.com/knowton/bonding-service/proto"
)

func TestValidateIssueBondRequest(t *testing.T) {
	server := &BondingServiceServer{}

	tests := []struct {
		name    string
		req     *pb.IssueBondRequest
		wantErr bool
	}{
		{
			name: "valid request",
			req: &pb.IssueBondRequest{
				IpnftId:      "QmHash123",
				TotalValue:   "100000000000000000000",
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
			},
			wantErr: false,
		},
		{
			name: "missing ipnft_id",
			req: &pb.IssueBondRequest{
				IpnftId:      "",
				TotalValue:   "100000000000000000000",
				MaturityDate: time.Now().Add(365 * 24 * time.Hour).Unix(),
			},
			wantErr: true,
		},
		{
			name: "missing total_value",
			req: &pb.IssueBondRequest{
				IpnftId:      "QmHash123",
				TotalValue:   "",
				MaturityDate: time.Now().Add(365 * 24 * time.Hour).Unix(),
			},
			wantErr: true,
		},
		{
			name: "past maturity date",
			req: &pb.IssueBondRequest{
				IpnftId:      "QmHash123",
				TotalValue:   "100000000000000000000",
				MaturityDate: time.Now().Add(-24 * time.Hour).Unix(),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := server.validateIssueBondRequest(tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateIssueBondRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestCalculateAllocation(t *testing.T) {
	server := &BondingServiceServer{}

	tests := []struct {
		name       string
		totalValue string
		percentage string
		want       string
	}{
		{
			name:       "50% of 100 ETH",
			totalValue: "100000000000000000000",
			percentage: "50",
			want:       "50000000000000000000",
		},
		{
			name:       "33% of 100 ETH",
			totalValue: "100000000000000000000",
			percentage: "33",
			want:       "33000000000000000000",
		},
		{
			name:       "17% of 100 ETH",
			totalValue: "100000000000000000000",
			percentage: "17",
			want:       "17000000000000000000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			totalValue := new(big.Int)
			totalValue.SetString(tt.totalValue, 10)
			
			got := server.calculateAllocation(totalValue, tt.percentage)
			if got != tt.want {
				t.Errorf("calculateAllocation() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseRiskFactors(t *testing.T) {
	server := &BondingServiceServer{}

	tests := []struct {
		name            string
		riskFactorsJSON string
		want            []string
	}{
		{
			name:            "valid JSON array",
			riskFactorsJSON: `["Low view count","New content with limited track record"]`,
			want:            []string{"Low view count", "New content with limited track record"},
		},
		{
			name:            "empty array",
			riskFactorsJSON: `[]`,
			want:            []string{},
		},
		{
			name:            "invalid JSON",
			riskFactorsJSON: `invalid`,
			want:            []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := server.parseRiskFactors(tt.riskFactorsJSON)
			if len(got) != len(tt.want) {
				t.Errorf("parseRiskFactors() length = %v, want %v", len(got), len(tt.want))
			}
		})
	}
}
