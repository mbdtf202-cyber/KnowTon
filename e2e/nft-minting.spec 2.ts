import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { setupMockWallet, closeModal, waitForWalletConnection } from './helpers/wallet-mock';

/**
 * E2E Tests for NFT Minting Flow
 * Tests content upload, metadata input, and NFT minting process
 */



test.describe('NFT Minting Flow', () => {
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

  test('should navigate to mint page', async ({ page }) => {
    // Close wallet modal if open
    const modal = page.locator('[role="dialog"]');
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Navigate to mint page
    await page.click('a[href="/mint"]');
    
    // Verify we're on the mint page
    await expect(page).toHaveURL(/\/mint/);
    await expect(page.getByRole('heading', { name: /mint.*nft/i })).toBeVisible();
  });

  test('should display upload form', async ({ page }) => {
    await page.goto('/mint');
    
    // Check form elements
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('select[name="category"]')).toBeVisible();
  });

  test('should validate file upload', async ({ page }) => {
    await page.goto('/mint');
    
    // Try to submit without file
    await page.fill('input[name="title"]', 'Test NFT');
    await page.click('button:has-text("Mint NFT")');
    
    // Check for validation error
    await expect(page.locator('text=/please.*upload.*file/i')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/mint');
    
    // Upload file without filling other fields
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image content'),
    });
    
    // Try to submit
    await page.click('button:has-text("Mint NFT")');
    
    // Check for validation errors
    await expect(page.locator('text=/title.*required/i')).toBeVisible();
  });

  test('should complete NFT minting flow', async ({ page }) => {
    await page.goto('/mint');
    
    // Fill in form
    await page.fill('input[name="title"]', 'My Awesome NFT');
    await page.fill('textarea[name="description"]', 'This is a test NFT for E2E testing');
    await page.selectOption('select[name="category"]', 'artwork');
    await page.fill('input[name="royalty"]', '10');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-artwork.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake artwork content'),
    });
    
    // Wait for file preview
    await page.waitForTimeout(500);
    
    // Submit form
    await page.click('button:has-text("Mint NFT")');
    
    // Wait for upload progress
    await expect(page.locator('text=/uploading/i')).toBeVisible({ timeout: 5000 });
    
    // Wait for minting transaction
    await expect(page.locator('text=/minting/i')).toBeVisible({ timeout: 10000 });
    
    // Wait for success message
    await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 15000 });
    
    // Check transaction hash is displayed
    await expect(page.locator('text=/0x[a-fA-F0-9]{64}/i')).toBeVisible();
  });

  test('should display minting progress', async ({ page }) => {
    await page.goto('/mint');
    
    // Fill form and submit
    await page.fill('input[name="title"]', 'Progress Test NFT');
    await page.fill('textarea[name="description"]', 'Testing progress indicators');
    await page.selectOption('select[name="category"]', 'music');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-music.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake audio content'),
    });
    
    await page.click('button:has-text("Mint NFT")');
    
    // Check progress steps
    await expect(page.locator('text=/step 1.*upload/i')).toBeVisible();
    await expect(page.locator('text=/step 2.*metadata/i')).toBeVisible();
    await expect(page.locator('text=/step 3.*mint/i')).toBeVisible();
  });

  test('should handle minting errors gracefully', async ({ page }) => {
    // Override mock to simulate error
    await page.addInitScript(() => {
      const originalRequest = (window as any).ethereum.request;
      (window as any).ethereum.request = async ({ method }: any) => {
        if (method === 'eth_sendTransaction') {
          throw new Error('User rejected transaction');
        }
        return originalRequest({ method });
      };
    });
    
    await page.goto('/mint');
    
    // Fill and submit form
    await page.fill('input[name="title"]', 'Error Test NFT');
    await page.selectOption('select[name="category"]', 'video');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake video content'),
    });
    
    await page.click('button:has-text("Mint NFT")');
    
    // Check error message
    await expect(page.locator('text=/error|failed|rejected/i')).toBeVisible({ timeout: 10000 });
  });

  test('should allow batch minting', async ({ page }) => {
    await page.goto('/mint');
    
    // Enable batch mode
    const batchToggle = page.locator('input[type="checkbox"][name="batchMode"]');
    if (await batchToggle.isVisible()) {
      await batchToggle.check();
      
      // Upload multiple files
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        {
          name: 'test1.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('image 1'),
        },
        {
          name: 'test2.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('image 2'),
        },
      ]);
      
      // Check multiple files are listed
      await expect(page.locator('text=/2 files selected/i')).toBeVisible();
    }
  });
});
