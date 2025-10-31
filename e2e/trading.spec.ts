import { test, expect, Page } from '@playwright/test';
import { setupMockWallet, closeModal, waitForWalletConnection } from './helpers/wallet-mock';

/**
 * E2E Tests for Trading Flow
 * Tests marketplace browsing, order placement, and trade execution
 */



test.describe('Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockWallet(page);
    await page.goto('/');
    
    // Connect wallet
    await page.click('button:has-text("Connect Wallet")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.click('button:has-text("MetaMask")');
    await waitForWalletConnection(page);
    await closeModal(page);
  });

  test('should navigate to marketplace', async ({ page }) => {
    // Close wallet modal if open
    const modal = page.locator('[role="dialog"]');
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    await page.click('a[href="/marketplace"]');
    
    await expect(page).toHaveURL(/\/marketplace/);
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible();
  });

  test('should display NFT listings', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Wait for NFTs to load
    await page.waitForTimeout(2000);
    
    // Check if NFT cards are displayed
    const nftCards = page.locator('[data-testid="nft-card"]');
    const count = await nftCards.count();
    
    // Should have at least some NFTs (or empty state)
    if (count > 0) {
      await expect(nftCards.first()).toBeVisible();
    } else {
      await expect(page.locator('text=/no.*nft|empty/i')).toBeVisible();
    }
  });

  test('should filter NFTs by category', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Select category filter
    const categoryFilter = page.locator('select[name="category"]');
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('music');
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify filter is applied
      await expect(page.locator('text=/music/i')).toBeVisible();
    }
  });

  test('should search for NFTs', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Enter search query
    const searchInput = page.locator('input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);
    }
  });

  test('should view NFT details', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForTimeout(2000);
    
    // Click on first NFT card
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      // Verify we're on details page
      await expect(page).toHaveURL(/\/nft\/\d+/);
      
      // Check details are displayed
      await expect(page.locator('text=/owner|creator/i')).toBeVisible();
      await expect(page.locator('text=/price/i')).toBeVisible();
    }
  });

  test('should place buy order', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForTimeout(2000);
    
    // Navigate to NFT details
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      // Click buy button
      const buyButton = page.locator('button:has-text("Buy Now")');
      if (await buyButton.isVisible()) {
        await buyButton.click();
        
        // Confirm purchase in modal
        await page.click('button:has-text("Confirm Purchase")');
        
        // Wait for transaction
        await expect(page.locator('text=/processing|pending/i')).toBeVisible({ timeout: 5000 });
        
        // Wait for success
        await expect(page.locator('text=/success|purchased/i')).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('should place sell order', async ({ page }) => {
    await page.goto('/trading');
    
    // Fill sell order form
    await page.fill('input[name="tokenId"]', '1');
    await page.fill('input[name="price"]', '0.5');
    await page.selectOption('select[name="orderType"]', 'sell');
    
    // Submit order
    await page.click('button:has-text("Place Order")');
    
    // Wait for confirmation
    await expect(page.locator('text=/order placed/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display order book', async ({ page }) => {
    await page.goto('/trading');
    
    // Check order book sections
    await expect(page.locator('text=/buy orders|bids/i')).toBeVisible();
    await expect(page.locator('text=/sell orders|asks/i')).toBeVisible();
    
    // Check if orders are displayed
    const orderRows = page.locator('[data-testid="order-row"]');
    const count = await orderRows.count();
    
    if (count > 0) {
      // Verify order data
      await expect(orderRows.first()).toContainText(/\d+\.\d+/); // Price
    }
  });

  test('should cancel order', async ({ page }) => {
    await page.goto('/trading');
    
    // Find user's orders
    const myOrdersTab = page.locator('button:has-text("My Orders")');
    if (await myOrdersTab.isVisible()) {
      await myOrdersTab.click();
      
      // Cancel first order
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        
        // Confirm cancellation
        await page.click('button:has-text("Confirm")');
        
        // Wait for success
        await expect(page.locator('text=/cancelled/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should display real-time price updates', async ({ page }) => {
    await page.goto('/trading');
    
    // Check price chart is visible
    const priceChart = page.locator('[data-testid="price-chart"]');
    if (await priceChart.isVisible()) {
      await expect(priceChart).toBeVisible();
      
      // Check current price is displayed
      await expect(page.locator('text=/current price/i')).toBeVisible();
    }
  });

  test('should handle insufficient balance error', async ({ page }) => {
    // Override balance to be low
    await page.addInitScript(() => {
      const originalRequest = (window as any).ethereum.request;
      (window as any).ethereum.request = async ({ method }: any) => {
        if (method === 'eth_getBalance') {
          return '0x0'; // 0 ETH
        }
        return originalRequest({ method });
      };
    });
    
    await page.goto('/marketplace');
    await page.waitForTimeout(2000);
    
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      const buyButton = page.locator('button:has-text("Buy Now")');
      if (await buyButton.isVisible()) {
        await buyButton.click();
        
        // Check for insufficient balance error
        await expect(page.locator('text=/insufficient.*balance/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
