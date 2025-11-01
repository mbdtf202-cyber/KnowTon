import { Page } from '@playwright/test';

/**
 * Mock Ethereum Provider for E2E Testing
 * Simulates MetaMask and other Web3 wallet interactions
 */

export interface MockWalletConfig {
  address?: string;
  chainId?: string;
  balance?: string;
  shouldRejectTransactions?: boolean;
}

export async function setupMockWallet(
  page: Page,
  config: MockWalletConfig = {}
) {
  const {
    address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chainId = '0xa4b1', // Arbitrum One
    balance = '0x' + (10e18).toString(16), // 10 ETH
    shouldRejectTransactions = false,
  } = config;

  await page.addInitScript(
    ({ address, chainId, balance, shouldRejectTransactions }) => {
      (window as any).ethereum = {
        isMetaMask: true,
        selectedAddress: address,
        chainId: chainId,
        networkVersion: parseInt(chainId, 16).toString(),

        request: async ({ method, params }: any) => {
          console.log(`[Mock Wallet] ${method}`, params);

          switch (method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
              return [address];

            case 'eth_chainId':
              return chainId;

            case 'eth_getBalance':
              return balance;

            case 'personal_sign':
              // Mock signature
              return (
                '0x' +
                '1234567890abcdef'.repeat(8) +
                '00'.repeat(2)
              );

            case 'eth_sendTransaction':
              if (shouldRejectTransactions) {
                throw new Error('User rejected transaction');
              }
              // Mock transaction hash
              return '0x' + Math.random().toString(16).slice(2).padEnd(64, '0');

            case 'eth_getTransactionReceipt':
              return {
                status: '0x1',
                transactionHash: params[0],
                blockNumber: '0x' + Math.floor(Math.random() * 1000000).toString(16),
                gasUsed: '0x5208',
              };

            case 'eth_call':
              // Mock contract call responses
              return '0x' + (1000000).toString(16);

            case 'eth_estimateGas':
              return '0x5208'; // 21000 gas

            case 'eth_gasPrice':
              return '0x' + (20e9).toString(16); // 20 gwei

            case 'wallet_switchEthereumChain':
              return null;

            case 'wallet_addEthereumChain':
              return null;

            case 'eth_getCode':
              // Mock contract code
              return '0x60806040';

            case 'eth_blockNumber':
              return '0x' + Math.floor(Date.now() / 1000).toString(16);

            default:
              console.warn(`[Mock Wallet] Unhandled method: ${method}`);
              return null;
          }
        },

        on: (event: string, handler: Function) => {
          console.log(`[Mock Wallet] Event listener added: ${event}`);
        },

        removeListener: (event: string, handler: Function) => {
          console.log(`[Mock Wallet] Event listener removed: ${event}`);
        },

        isConnected: () => true,
      };

      // Also mock window.web3 for legacy dApps
      (window as any).web3 = {
        currentProvider: (window as any).ethereum,
      };
    },
    { address, chainId, balance, shouldRejectTransactions }
  );
}

export async function connectWallet(page: Page) {
  await page.click('button:has-text("Connect Wallet")');
  await page.click('button:has-text("MetaMask")');
  await page.waitForTimeout(1000);
}

export async function disconnectWallet(page: Page) {
  const accountButton = page.locator('button').filter({ hasText: /0x/ }).first();
  if (await accountButton.isVisible()) {
    await accountButton.click();
    await page.click('button:has-text("Disconnect")');
  }
}

export async function switchNetwork(page: Page, chainId: string) {
  await page.evaluate((chainId) => {
    (window as any).ethereum.chainId = chainId;
    (window as any).ethereum.networkVersion = parseInt(chainId, 16).toString();
  }, chainId);
}

export async function closeModal(page: Page) {
  const modal = page.locator('[role="dialog"]');
  if (await modal.isVisible()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

export async function waitForWalletConnection(page: Page, timeout = 10000) {
  const addressDisplay = page.locator('button').filter({ hasText: /0x/ }).first();
  await addressDisplay.waitFor({ state: 'visible', timeout });
}
