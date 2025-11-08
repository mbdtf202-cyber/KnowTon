package blockchain

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
)

// RetryConfig holds retry configuration
type RetryConfig struct {
	MaxRetries     int
	InitialBackoff time.Duration
	MaxBackoff     time.Duration
	BackoffFactor  float64
}

// DefaultRetryConfig returns default retry configuration
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxRetries:     3,
		InitialBackoff: 1 * time.Second,
		MaxBackoff:     30 * time.Second,
		BackoffFactor:  2.0,
	}
}

// RetryableError represents an error that can be retried
type RetryableError struct {
	Err       error
	Retryable bool
}

func (e *RetryableError) Error() string {
	return e.Err.Error()
}

// IsRetryable checks if an error is retryable
func IsRetryable(err error) bool {
	if err == nil {
		return false
	}

	// Check for common retryable errors
	errStr := err.Error()
	retryablePatterns := []string{
		"connection refused",
		"timeout",
		"temporary failure",
		"nonce too low",
		"replacement transaction underpriced",
		"network error",
		"EOF",
	}

	for _, pattern := range retryablePatterns {
		if contains(errStr, pattern) {
			return true
		}
	}

	return false
}

// RetryWithBackoff retries a function with exponential backoff
func RetryWithBackoff(
	ctx context.Context,
	config *RetryConfig,
	fn func() error,
) error {
	var lastErr error

	for attempt := 0; attempt <= config.MaxRetries; attempt++ {
		// Try the function
		err := fn()
		if err == nil {
			return nil
		}

		lastErr = err

		// Check if error is retryable
		if !IsRetryable(err) {
			return fmt.Errorf("non-retryable error: %w", err)
		}

		// Don't sleep after last attempt
		if attempt == config.MaxRetries {
			break
		}

		// Calculate backoff duration
		backoff := calculateBackoff(attempt, config)

		// Wait with context cancellation support
		select {
		case <-ctx.Done():
			return fmt.Errorf("context cancelled: %w", ctx.Err())
		case <-time.After(backoff):
			// Continue to next attempt
		}
	}

	return fmt.Errorf("max retries exceeded: %w", lastErr)
}

// RetryTransaction retries a transaction with nonce management
func (c *IPBondContract) RetryTransaction(
	ctx context.Context,
	config *RetryConfig,
	txFn func() (*types.Transaction, error),
) (*types.Transaction, error) {
	var tx *types.Transaction
	var lastErr error

	for attempt := 0; attempt <= config.MaxRetries; attempt++ {
		// Execute transaction function
		var err error
		tx, err = txFn()
		if err == nil {
			return tx, nil
		}

		lastErr = err

		// Check if error is retryable
		if !IsRetryable(err) {
			return nil, fmt.Errorf("non-retryable error: %w", err)
		}

		// Don't sleep after last attempt
		if attempt == config.MaxRetries {
			break
		}

		// Calculate backoff duration
		backoff := calculateBackoff(attempt, config)

		// Wait with context cancellation support
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("context cancelled: %w", ctx.Err())
		case <-time.After(backoff):
			// Continue to next attempt
		}
	}

	return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// WaitForTransactionWithRetry waits for a transaction with retry logic
func (c *IPBondContract) WaitForTransactionWithRetry(
	ctx context.Context,
	tx *types.Transaction,
	config *RetryConfig,
) (*types.Receipt, error) {
	var receipt *types.Receipt
	var lastErr error

	for attempt := 0; attempt <= config.MaxRetries; attempt++ {
		var err error
		receipt, err = c.WaitForTransaction(ctx, tx)
		if err == nil {
			return receipt, nil
		}

		lastErr = err

		// Check if error is retryable
		if !IsRetryable(err) {
			return nil, fmt.Errorf("non-retryable error: %w", err)
		}

		// Don't sleep after last attempt
		if attempt == config.MaxRetries {
			break
		}

		// Calculate backoff duration
		backoff := calculateBackoff(attempt, config)

		// Wait with context cancellation support
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("context cancelled: %w", ctx.Err())
		case <-time.After(backoff):
			// Continue to next attempt
		}
	}

	return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// calculateBackoff calculates exponential backoff duration
func calculateBackoff(attempt int, config *RetryConfig) time.Duration {
	backoff := float64(config.InitialBackoff) * math.Pow(config.BackoffFactor, float64(attempt))
	
	if backoff > float64(config.MaxBackoff) {
		backoff = float64(config.MaxBackoff)
	}

	return time.Duration(backoff)
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		(s == substr || len(s) > len(substr) && 
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || 
		containsMiddle(s, substr)))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// TransactionMonitor monitors transaction status
type TransactionMonitor struct {
	contract *IPBondContract
	config   *RetryConfig
}

// NewTransactionMonitor creates a new transaction monitor
func NewTransactionMonitor(contract *IPBondContract, config *RetryConfig) *TransactionMonitor {
	if config == nil {
		config = DefaultRetryConfig()
	}

	return &TransactionMonitor{
		contract: contract,
		config:   config,
	}
}

// MonitorTransaction monitors a transaction until it's mined or fails
func (m *TransactionMonitor) MonitorTransaction(
	ctx context.Context,
	tx *types.Transaction,
) (*types.Receipt, error) {
	return m.contract.WaitForTransactionWithRetry(ctx, tx, m.config)
}

// ExecuteWithRetry executes a transaction function with retry logic
func (m *TransactionMonitor) ExecuteWithRetry(
	ctx context.Context,
	txFn func() (*types.Transaction, error),
) (*types.Receipt, error) {
	// Execute transaction with retry
	tx, err := m.contract.RetryTransaction(ctx, m.config, txFn)
	if err != nil {
		return nil, fmt.Errorf("failed to execute transaction: %w", err)
	}

	// Wait for transaction to be mined
	receipt, err := m.MonitorTransaction(ctx, tx)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for transaction: %w", err)
	}

	return receipt, nil
}
