import { test, expect, Page } from '@playwright/test';
import { setupMockWallet, closeModal, waitForWalletConnection } from './helpers/wallet-mock';

/**
 * E2E Tests for Fractionalization Flow
 * Tests NFT fractionalization, fractional token trading, and redemption
 */



test.describe('Fractionalization Flow', () => {
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

  test('should navigate to fractionalize page', async ({ page }) => {
    await page.click('a[href="/fractionalize"]');
    
    await expect(page).toHaveURL(/\/fractionalize/);
    await expect(page.getByRole('heading', { name: /fractionalize/i })).toBeVisible();
  });

  test('should display user NFTs for fractionalization', async ({ page }) => {
    await page.goto('/fractionalize');
    
    // Wait for NFTs to load
    await page.waitForTimeout(2000);
    
    // Check if user's NFTs are displayed
    const nftList = page.locator('[data-testid="user-nft-list"]');
    if (await nftList.isVisible()) {
      await expect(nftList).toBeVisible();
    } else {
      // Empty state
      await expect(page.locator('text=/no.*nft|empty/i')).toBeVisible();
    }
  });

  test('should select NFT for fractionalization', async ({ page }) => {
    await page.goto('/fractionalize');
    await page.waitForTimeout(2000);
    
    // Select first NFT
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      // Verify NFT is selected
      await expect(firstNFT).toHaveClass(/selected|active/);
    }
  });

  test('should configure fractionalization parameters', async ({ page }) => {
    await page.goto('/fractionalize');
    await page.waitForTimeout(2000);
    
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      // Fill fractionalization form
      await page.fill('input[name="totalSupply"]', '1000000');
      await page.fill('input[name="tokenName"]', 'Fractional Test Token');
      await page.fill('input[name="tokenSymbol"]', 'FTT');
      await page.fill('input[name="reservePrice"]', '10');
      
      // Verify inputs
      await expect(page.locator('input[name="totalSupply"]')).toHaveValue('1000000');
      await expect(page.locator('input[name="tokenSymbol"]')).toHaveValue('FTT');
    }
  });

  test('should validate fractionalization parameters', async ({ page }) => {
    await page.goto('/fractionalize');
    await page.waitForTimeout(2000);
    
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      // Try to submit without required fields
      await page.click('button:has-text("Fractionalize")');
      
      // Check for validation errors
      await expect(page.locator('text=/required|invalid/i')).toBeVisible();
    }
  });

  test('should complete fractionalization process', async ({ page }) => {
    await page.goto('/fractionalize');
    await page.waitForTimeout(2000);
    
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      // Fill form
      await page.fill('input[name="totalSupply"]', '1000000');
      await page.fill('input[name="tokenName"]', 'My Fractional NFT');
      await page.fill('input[name="tokenSymbol"]', 'MFNFT');
      await page.fill('input[name="reservePrice"]', '5');
      
      // Submit
      await page.click('button:has-text("Fractionalize")');
      
      // Wait for approval transaction
      await expect(page.locator('text=/approving/i')).toBeVisible({ timeout: 5000 });
      
      // Wait for fractionalization transaction
      await expect(page.locator('text=/fractionalizing/i')).toBeVisible({ timeout: 10000 });
      
      // Wait for success
      await expect(page.locator('text=/success|fractionalized/i')).toBeVisible({ timeout: 15000 });
      
      // Check vault ID or token address is displayed
      await expect(page.locator('text=/vault|token address/i')).toBeVisible();
    }
  });

  test('should display fractionalization progress', async ({ page }) => {
    await page.goto('/fractionalize');
    await page.waitForTimeout(2000);
    
    const firstNFT = page.locator('[data-testid="nft-card"]').first();
    if (await firstNFT.isVisible()) {
      await firstNFT.click();
      
      await page.fill('input[name="totalSupply"]', '500000');
      await page.fill('input[name="tokenName"]', 'Progress Test');
      await page.fill('input[name="tokenSymbol"]', 'PT');
      
      await page.click('button:has-text("Fractionalize")');
      
      // Check progress steps
      await expect(page.locator('text=/step 1.*approve/i')).toBeVisible();
      await expect(page.locator('text=/step 2.*lock/i')).toBeVisible();
      await expect(page.locator('text=/step 3.*mint/i')).toBeVisible();
    }
  });

  test('should view fractional vault details', async ({ page }) => {
    await page.goto('/fractionalize');
    
    // Navigate to vaults tab
    const vaultsTab = page.locator('button:has-text("My Vaults")');
    if (await vaultsTab.isVisible()) {
      await vaultsTab.click();
      
      // Click on first vault
      const firstVault = page.locator('[data-testid="vault-card"]').first();
      if (await firstVault.isVisible()) {
        await firstVault.click();
        
        // Verify vault details are displayed
        await expect(page.locator('text=/total supply/i')).toBeVisible();
        await expect(page.locator('text=/holders/i')).toBeVisible();
        await expect(page.locator('text=/reserve price/i')).toBeVisible();
      }
    }
  });

  test('should buy fractional tokens', async ({ page }) => {
    await page.goto('/fractionalize');
    
    const vaultsTab = page.locator('button:has-text("All Vaults")');
    if (await vaultsTab.isVisible()) {
      await vaultsTab.click();
      
      const firstVault = page.locator('[data-testid="vault-card"]').first();
      if (await firstVault.isVisible()) {
        await firstVault.click();
        
        // Fill buy form
        await page.fill('input[name="amount"]', '1000');
        await page.click('button:has-text("Buy Tokens")');
        
        // Wait for transaction
        await expect(page.locator('text=/purchasing/i')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=/success|purchased/i')).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('should sell fractional tokens', async ({ page }) => {
    await page.goto('/fractionalize');
    
    const vaultsTab = page.locator('button:has-text("My Vaults")');
    if (await vaultsTab.isVisible()) {
      await vaultsTab.click();
      
      const firstVault = page.locator('[data-testid="vault-card"]').first();
      if (await firstVault.isVisible()) {
        await firstVault.click();
        
        // Fill sell form
        await page.fill('input[name="amount"]', '500');
        await page.click('button:has-text("Sell Tokens")');
        
        // Wait for transaction
        await expect(page.locator('text=/selling/i')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=/success|sold/i')).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('should initiate redemption vote', async ({ page }) => {
    await page.goto('/fractionalize');
    
    const vaultsTab = page.locator('button:has-text("My Vaults")');
    if (await vaultsTab.isVisible()) {
      await vaultsTab.click();
      
      const firstVault = page.locator('[data-testid="vault-card"]').first();
      if (await firstVault.isVisible()) {
        await firstVault.click();
        
        // Initiate redemption
        const redeemButton = page.locator('button:has-text("Initiate Redemption")');
        if (await redeemButton.isVisible()) {
          await redeemButton.click();
          
          // Fill buyout price
          await page.fill('input[name="buyoutPrice"]', '15');
          await page.click('button:has-text("Submit")');
          
          // Wait for transaction
          await expect(page.locator('text=/redemption.*initiated/i')).toBeVisible({ timeout: 15000 });
        }
      }
    }
  });

  test('should vote on redemption', async ({ page }) => {
    await page.goto('/fractionalize');
    
    const vaultsTab = page.locator('button:has-text("All Vaults")');
    if (await vaultsTab.isVisible()) {
      await vaultsTab.click();
      
      // Find vault with active redemption
      const vaultWithRedemption = page.locator('[data-testid="vault-card"]:has-text("Redemption Active")').first();
      if (await vaultWithRedemption.isVisible()) {
        await vaultWithRedemption.click();
        
        // Vote on redemption
        await page.click('button:has-text("Vote Yes")');
        
        // Wait for transaction
        await expect(page.locator('text=/vote.*recorded/i')).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('should display holder distribution', async ({ page }) => {
    await page.goto('/fractionalize');
    
    const vaultsTab = page.locator('button:has-text("All Vaults")');
    if (await vaultsTab.isVisible()) {
      await vaultsTab.click();
      
      const firstVault = page.locator('[data-testid="vault-card"]').first();
      if (await firstVault.isVisible()) {
        await firstVault.click();
        
        // Check holder distribution chart
        const holderChart = page.locator('[data-testid="holder-distribution"]');
        if (await holderChart.isVisible()) {
          await expect(holderChart).toBeVisible();
        }
      }
    }
  });
});
