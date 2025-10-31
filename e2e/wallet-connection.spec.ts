import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Wallet Connection Flow
 * Tests MetaMask connection, network switching, and authentication
 */

// Mock MetaMask provider
async function setupMockWallet(page: Page) {
  await page.addInitScript(() => {
    // Mock Ethereum provider
    (window as any).ethereum = {
      isMetaMask: true,
      selectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chainId: '0xa4b1', // Arbitrum One
      networkVersion: '42161',
      
      request: async ({ method, params }: any) => {
        switch (method) {
          case 'eth_requestAccounts':
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
          
          case 'eth_accounts':
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
          
          case 'eth_chainId':
            return '0xa4b1';
          
          case 'wallet_switchEthereumChain':
            return null;
          
          case 'personal_sign':
            // Mock signature for SIWE
            return '0x' + '0'.repeat(130);
          
          case 'eth_getBalance':
            return '0x' + (1e18).toString(16); // 1 ETH
          
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      },
      
      on: (event: string, handler: Function) => {
        // Mock event listeners
      },
      
      removeListener: (event: string, handler: Function) => {
        // Mock remove listeners
      },
    };
  });
}

test.describe('Wallet Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockWallet(page);
    await page.goto('/');
  });

  test('should display connect wallet button on homepage', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();
  });

  test('should open wallet connection modal', async ({ page }) => {
    await page.click('button:has-text("Connect Wallet")');
    
    // Check modal is visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Check wallet options are displayed
    await expect(page.getByText(/MetaMask/i)).toBeVisible();
    await expect(page.getByText(/WalletConnect/i)).toBeVisible();
  });

  test('should connect wallet successfully', async ({ page }) => {
    // Click connect wallet button
    await page.click('button:has-text("Connect Wallet")');
    
    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Select MetaMask
    await page.click('button:has-text("MetaMask")');
    
    // Wait for connection and modal to close
    await page.waitForTimeout(2000);
    
    // Check wallet address is displayed (various formats)
    const addressDisplay = page.locator('button').filter({ hasText: /0x/ }).first();
    await expect(addressDisplay).toBeVisible({ timeout: 10000 });
  });

  test('should display correct network', async ({ page }) => {
    await page.click('button:has-text("Connect Wallet")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.click('button:has-text("MetaMask")');
    
    await page.waitForTimeout(2000);
    
    // Check network indicator (may be in various formats)
    const networkIndicator = page.locator('text=/Arbitrum|42161/i').first();
    await expect(networkIndicator).toBeVisible({ timeout: 10000 });
  });

  test('should handle wallet disconnection', async ({ page }) => {
    // Connect wallet first
    await page.click('button:has-text("Connect Wallet")');
    await page.click('button:has-text("MetaMask")');
    await page.waitForTimeout(1000);
    
    // Open account menu - look for button containing "0x"
    const accountButton = page.locator('button').filter({ hasText: /0x/ }).first();
    if (await accountButton.isVisible()) {
      await accountButton.click();
      
      // Click disconnect
      await page.click('button:has-text("Disconnect")');
      
      // Verify wallet is disconnected
      const connectButton = page.getByRole('button', { name: /connect wallet/i });
      await expect(connectButton).toBeVisible();
    }
  });

  test('should persist wallet connection on page reload', async ({ page }) => {
    // Connect wallet
    await page.click('button:has-text("Connect Wallet")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.click('button:has-text("MetaMask")');
    await page.waitForTimeout(2000);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check wallet is still connected
    const addressDisplay = page.locator('button').filter({ hasText: /0x/ }).first();
    await expect(addressDisplay).toBeVisible({ timeout: 10000 });
  });
});
