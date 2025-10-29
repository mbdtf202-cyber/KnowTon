package risk

import (
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/knowton/bonding-service/internal/models"
)

// RiskEngine assesses IP value and risk
type RiskEngine struct {
	// In production, this would connect to AI models and historical data
}

// NewRiskEngine creates a new risk assessment engine
func NewRiskEngine() *RiskEngine {
	return &RiskEngine{}
}

// AssessIPValue estimates the value and risk of an IP-NFT
func (re *RiskEngine) AssessIPValue(ipnftID string, metadata *IPMetadata) (*models.RiskAssessment, error) {
	// 1. Calculate base valuation using multiple factors
	baseValuation := re.calculateBaseValuation(metadata)
	
	// 2. Assess risk factors
	riskFactors := re.identifyRiskFactors(metadata)
	
	// 3. Calculate risk rating
	riskRating := re.calculateRiskRating(metadata, riskFactors)
	
	// 4. Calculate default probability
	defaultProb := re.calculateDefaultProbability(riskRating, metadata)
	
	// 5. Calculate recommended LTV
	ltv := re.calculateRecommendedLTV(riskRating, defaultProb)
	
	// 6. Calculate confidence score
	confidence := re.calculateConfidenceScore(metadata)
	
	// Serialize risk factors to JSON
	riskFactorsJSON, err := json.Marshal(riskFactors)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize risk factors: %w", err)
	}
	
	assessment := &models.RiskAssessment{
		IPNFTId:            ipnftID,
		ValuationUSD:       baseValuation,
		ConfidenceScore:    confidence,
		RiskRating:         riskRating,
		DefaultProbability: defaultProb,
		RecommendedLTV:     ltv,
		RiskFactors:        string(riskFactorsJSON),
		AssessedAt:         time.Now(),
	}
	
	return assessment, nil
}

// calculateBaseValuation estimates IP value based on metadata
func (re *RiskEngine) calculateBaseValuation(metadata *IPMetadata) float64 {
	// Base valuation factors:
	// 1. Category multiplier
	categoryMultiplier := re.getCategoryMultiplier(metadata.Category)
	
	// 2. Engagement score (views, likes)
	engagementScore := float64(metadata.Views)*0.1 + float64(metadata.Likes)*1.0
	
	// 3. Creator reputation (simplified - would use on-chain data)
	creatorScore := 1000.0 // Base score
	
	// 4. Age factor (newer content might be more valuable)
	ageInDays := time.Since(metadata.CreatedAt).Hours() / 24
	ageFactor := math.Max(0.5, 1.0-(ageInDays/365.0)*0.2) // Depreciate 20% per year
	
	// Calculate base valuation
	baseValue := (engagementScore + creatorScore) * categoryMultiplier * ageFactor
	
	// Ensure minimum valuation
	if baseValue < 100 {
		baseValue = 100
	}
	
	return baseValue
}

// getCategoryMultiplier returns a multiplier based on content category
func (re *RiskEngine) getCategoryMultiplier(category string) float64 {
	multipliers := map[string]float64{
		"music":    1.5,
		"video":    2.0,
		"ebook":    1.2,
		"course":   1.8,
		"software": 2.5,
		"artwork":  3.0,
		"research": 1.3,
	}
	
	if mult, ok := multipliers[category]; ok {
		return mult
	}
	return 1.0
}

// identifyRiskFactors identifies potential risk factors
func (re *RiskEngine) identifyRiskFactors(metadata *IPMetadata) []string {
	factors := []string{}
	
	// Low engagement
	if metadata.Views < 100 {
		factors = append(factors, "Low view count")
	}
	
	// New content
	if time.Since(metadata.CreatedAt).Hours() < 24*30 { // Less than 30 days
		factors = append(factors, "New content with limited track record")
	}
	
	// Limited social proof
	if metadata.Likes < 10 {
		factors = append(factors, "Limited social validation")
	}
	
	// Category-specific risks
	if metadata.Category == "software" {
		factors = append(factors, "Technology obsolescence risk")
	}
	
	return factors
}

// calculateRiskRating assigns a credit rating
func (re *RiskEngine) calculateRiskRating(metadata *IPMetadata, riskFactors []string) string {
	// Calculate risk score (0-100, higher is better)
	score := 100.0
	
	// Deduct points for each risk factor
	score -= float64(len(riskFactors)) * 10.0
	
	// Adjust based on engagement
	if metadata.Views > 10000 {
		score += 10.0
	}
	if metadata.Likes > 1000 {
		score += 10.0
	}
	
	// Adjust based on age
	ageInDays := time.Since(metadata.CreatedAt).Hours() / 24
	if ageInDays > 365 {
		score += 15.0 // Proven track record
	}
	
	// Ensure score is in valid range
	score = math.Max(0, math.Min(100, score))
	
	// Map score to rating
	switch {
	case score >= 90:
		return "AAA"
	case score >= 80:
		return "AA"
	case score >= 70:
		return "A"
	case score >= 60:
		return "BBB"
	case score >= 50:
		return "BB"
	case score >= 40:
		return "B"
	default:
		return "CCC"
	}
}

// calculateDefaultProbability estimates probability of default
func (re *RiskEngine) calculateDefaultProbability(rating string, metadata *IPMetadata) float64 {
	// Base probability by rating
	baseProbability := map[string]float64{
		"AAA": 0.01,
		"AA":  0.02,
		"A":   0.05,
		"BBB": 0.10,
		"BB":  0.20,
		"B":   0.35,
		"CCC": 0.50,
	}
	
	prob := baseProbability[rating]
	
	// Adjust based on content age
	ageInDays := time.Since(metadata.CreatedAt).Hours() / 24
	if ageInDays < 30 {
		prob *= 1.5 // Higher risk for new content
	}
	
	return math.Min(0.99, prob)
}

// calculateRecommendedLTV calculates loan-to-value ratio
func (re *RiskEngine) calculateRecommendedLTV(rating string, defaultProb float64) float64 {
	// Base LTV by rating
	baseLTV := map[string]float64{
		"AAA": 0.70,
		"AA":  0.65,
		"A":   0.60,
		"BBB": 0.50,
		"BB":  0.40,
		"B":   0.30,
		"CCC": 0.20,
	}
	
	ltv := baseLTV[rating]
	
	// Adjust based on default probability
	ltv *= (1.0 - defaultProb*0.5)
	
	return math.Max(0.1, math.Min(0.8, ltv))
}

// calculateConfidenceScore calculates confidence in the assessment
func (re *RiskEngine) calculateConfidenceScore(metadata *IPMetadata) float64 {
	confidence := 0.5 // Base confidence
	
	// More data points increase confidence
	if metadata.Views > 1000 {
		confidence += 0.1
	}
	if metadata.Likes > 100 {
		confidence += 0.1
	}
	
	// Older content has more historical data
	ageInDays := time.Since(metadata.CreatedAt).Hours() / 24
	if ageInDays > 180 {
		confidence += 0.2
	} else if ageInDays > 90 {
		confidence += 0.1
	}
	
	// More tags indicate better categorization
	if len(metadata.Tags) > 5 {
		confidence += 0.1
	}
	
	return math.Min(0.95, confidence)
}

// IPMetadata represents IP-NFT metadata for risk assessment
type IPMetadata struct {
	Category       string
	CreatorAddress string
	CreatedAt      time.Time
	Views          int32
	Likes          int32
	Tags           []string
	ContentHash    string
}
