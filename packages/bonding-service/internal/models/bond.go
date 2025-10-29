package models

import (
	"time"

	"gorm.io/gorm"
)

// Bond represents an IP-backed bond
type Bond struct {
	gorm.Model
	BondID       string    `gorm:"uniqueIndex;not null"`
	IPNFTId      string    `gorm:"not null"`
	NFTContract  string    `gorm:"not null"`
	Issuer       string    `gorm:"not null"`
	TotalValue   string    `gorm:"not null"`
	MaturityDate time.Time `gorm:"not null"`
	Status       string    `gorm:"not null;default:'ACTIVE'"` // ACTIVE, MATURED, DEFAULTED
	TotalRevenue string    `gorm:"default:'0'"`
	TxHash       string    `gorm:"not null"`
	Tranches     []Tranche `gorm:"foreignKey:BondID;references:BondID"`
}

// Tranche represents a bond tranche (Senior, Mezzanine, Junior)
type Tranche struct {
	gorm.Model
	BondID        string `gorm:"not null"`
	TrancheID     int    `gorm:"not null"`
	Name          string `gorm:"not null"`
	Priority      int    `gorm:"not null"`
	Allocation    string `gorm:"not null"`
	APY           float64 `gorm:"not null"`
	RiskLevel     string `gorm:"not null"`
	TotalInvested string `gorm:"default:'0'"`
	Investments   []Investment `gorm:"foreignKey:BondID,TrancheID;references:BondID,TrancheID"`
}

// Investment represents an investor's investment in a tranche
type Investment struct {
	gorm.Model
	BondID    string    `gorm:"not null"`
	TrancheID int       `gorm:"not null"`
	Investor  string    `gorm:"not null"`
	Amount    string    `gorm:"not null"`
	TxHash    string    `gorm:"not null"`
	Timestamp time.Time `gorm:"not null"`
}

// RevenueDistribution tracks revenue distributions
type RevenueDistribution struct {
	gorm.Model
	BondID    string    `gorm:"not null"`
	Amount    string    `gorm:"not null"`
	TxHash    string    `gorm:"not null"`
	Timestamp time.Time `gorm:"not null"`
}

// RiskAssessment stores risk assessment results
type RiskAssessment struct {
	gorm.Model
	IPNFTId            string    `gorm:"uniqueIndex;not null"`
	ValuationUSD       float64   `gorm:"not null"`
	ConfidenceScore    float64   `gorm:"not null"`
	RiskRating         string    `gorm:"not null"`
	DefaultProbability float64   `gorm:"not null"`
	RecommendedLTV     float64   `gorm:"not null"`
	RiskFactors        string    `gorm:"type:text"` // JSON array
	AssessedAt         time.Time `gorm:"not null"`
}
