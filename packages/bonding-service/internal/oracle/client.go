package oracle

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// OracleClient is a client for the Oracle Adapter service
type OracleClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewOracleClient creates a new Oracle Adapter client
func NewOracleClient(baseURL string) *OracleClient {
	return &OracleClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ValuationRequest represents a valuation request
type ValuationRequest struct {
	TokenID        string                 `json:"token_id"`
	Metadata       map[string]interface{} `json:"metadata"`
	HistoricalData []map[string]interface{} `json:"historical_data,omitempty"`
}

// ValuationResponse represents a valuation response
type ValuationResponse struct {
	EstimatedValue     float64                  `json:"estimated_value"`
	ConfidenceInterval []float64                `json:"confidence_interval"`
	ComparableSales    []map[string]interface{} `json:"comparable_sales"`
	Factors            map[string]interface{}   `json:"factors"`
	ModelUncertainty   float64                  `json:"model_uncertainty"`
	ProcessingTimeMs   float64                  `json:"processing_time_ms"`
}

// EstimateValue calls the Oracle Adapter to estimate IP value
func (c *OracleClient) EstimateValue(
	ctx context.Context,
	tokenID string,
	metadata map[string]interface{},
	historicalData []map[string]interface{},
) (*ValuationResponse, error) {
	// Prepare request
	reqBody := ValuationRequest{
		TokenID:        tokenID,
		Metadata:       metadata,
		HistoricalData: historicalData,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	url := fmt.Sprintf("%s/api/v1/oracle/valuation", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("oracle service returned error: %s (status: %d)", string(body), resp.StatusCode)
	}

	// Parse response
	var valuation ValuationResponse
	if err := json.Unmarshal(body, &valuation); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &valuation, nil
}

// FingerprintRequest represents a fingerprint generation request
type FingerprintRequest struct {
	ContentURL  string                 `json:"content_url"`
	ContentType string                 `json:"content_type"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// FingerprintResponse represents a fingerprint response
type FingerprintResponse struct {
	Fingerprint      string                 `json:"fingerprint"`
	Features         map[string]interface{} `json:"features"`
	ConfidenceScore  float64                `json:"confidence_score"`
	ProcessingTimeMs float64                `json:"processing_time_ms"`
}

// GenerateFingerprint calls the Oracle Adapter to generate content fingerprint
func (c *OracleClient) GenerateFingerprint(
	ctx context.Context,
	contentURL string,
	contentType string,
	metadata map[string]interface{},
) (*FingerprintResponse, error) {
	// Prepare request
	reqBody := FingerprintRequest{
		ContentURL:  contentURL,
		ContentType: contentType,
		Metadata:    metadata,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	url := fmt.Sprintf("%s/api/v1/oracle/fingerprint", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("oracle service returned error: %s (status: %d)", string(body), resp.StatusCode)
	}

	// Parse response
	var fingerprint FingerprintResponse
	if err := json.Unmarshal(body, &fingerprint); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &fingerprint, nil
}

// HealthCheck checks if the Oracle Adapter service is healthy
func (c *OracleClient) HealthCheck(ctx context.Context) error {
	url := fmt.Sprintf("%s/health", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("oracle service is unhealthy (status: %d)", resp.StatusCode)
	}

	return nil
}
